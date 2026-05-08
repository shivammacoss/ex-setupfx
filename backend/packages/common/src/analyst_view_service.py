"""Analyst Views — TA-engine generator + read API.

Computes short-term trading views using classic pivot points + ATR
from TimescaleDB tick data, and stores results in `analyst_views` (Postgres).

Architecture is provider-agnostic: replace `_generate_for_symbol()` with a
Trading-Central / Autochartist client when a license is available.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional
import logging

from sqlalchemy import select, delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.models import AnalystView


log = logging.getLogger("analyst_views")


# ---------------------------------------------------------------------------
# Symbol catalogue — category map + pip-size table
# ---------------------------------------------------------------------------

CATEGORY_MAP: Dict[str, str] = {
    # Forex majors
    "EURUSD": "forex", "GBPUSD": "forex", "USDJPY": "forex", "USDCHF": "forex",
    "AUDUSD": "forex", "NZDUSD": "forex", "USDCAD": "forex",
    "EURJPY": "forex", "GBPJPY": "forex", "AUDJPY": "forex", "CADJPY": "forex",
    "NZDJPY": "forex", "EURGBP": "forex", "EURAUD": "forex", "EURCHF": "forex",
    "GBPAUD": "forex", "GBPCHF": "forex",
    # Crypto
    "BTCUSD": "crypto", "ETHUSD": "crypto", "LTCUSD": "crypto",
    "XRPUSD": "crypto", "SOLUSD": "crypto", "DOGEUSD": "crypto", "BNBUSD": "crypto",
    # Indices
    "NAS100": "indices", "US30": "indices", "SPX500": "indices",
    "GER40": "indices", "UK100": "indices", "JPN225": "indices",
    # Commodities
    "XAUUSD": "commodities", "XAGUSD": "commodities",
    "USOIL": "commodities", "UKOIL": "commodities",
}

# Pip-size: smallest meaningful price unit per symbol type.
def _pip_size(symbol: str) -> Decimal:
    s = symbol.upper()
    cat = CATEGORY_MAP.get(s, "")
    if cat == "crypto":
        return Decimal("1.0")
    if cat == "indices":
        return Decimal("1.0")
    if cat == "commodities":
        if s.startswith("XAU"): return Decimal("0.01")
        if s.startswith("XAG"): return Decimal("0.001")
        return Decimal("0.01")
    # Forex
    if "JPY" in s:
        return Decimal("0.01")
    return Decimal("0.0001")


def _timeframe_window_hours(tf: str) -> int:
    return {"5m": 1, "30m": 4, "1h": 8, "4h": 24, "1d": 96}.get(tf, 8)


def _expiry_for(tf: str) -> timedelta:
    return {
        "5m": timedelta(minutes=30),
        "30m": timedelta(hours=2),
        "1h": timedelta(hours=4),
        "4h": timedelta(hours=12),
        "1d": timedelta(days=1),
    }.get(tf, timedelta(hours=4))


# ---------------------------------------------------------------------------
# Core TA engine — classic floor pivot + ATR-style range
# ---------------------------------------------------------------------------

async def _fetch_ohlc_from_ticks(
    ts_session: AsyncSession, symbol: str, hours: int
) -> Optional[Dict[str, Decimal]]:
    """Compute O/H/L/C over the last `hours` from raw ticks. Returns None if no data."""
    sql = text(f"""
        SELECT
          (array_agg(bid ORDER BY time ASC))[1]   AS o,
          MAX(bid)                                AS h,
          MIN(bid)                                AS l,
          (array_agg(bid ORDER BY time DESC))[1]  AS c,
          COUNT(*)                                AS n
        FROM ticks
        WHERE symbol = :sym
          AND time > NOW() - (:hrs || ' hours')::interval
    """)
    res = await ts_session.execute(sql, {"sym": symbol, "hrs": str(hours)})
    row = res.mappings().first()
    if not row or not row["n"] or row["c"] is None:
        return None
    return {
        "open":  Decimal(str(row["o"])),
        "high":  Decimal(str(row["h"])),
        "low":   Decimal(str(row["l"])),
        "close": Decimal(str(row["c"])),
        "n":     int(row["n"]),
    }


def _build_view(symbol: str, tf: str, ohlc: Dict[str, Decimal]) -> Optional[Dict[str, Any]]:
    """Translate OHLC into pivot + direction + target + expected pip range."""
    h, l, c = ohlc["high"], ohlc["low"], ohlc["close"]
    if h <= l:
        return None
    pivot = (h + l + c) / 3
    atr = h - l                       # simple range as ATR proxy
    pip = _pip_size(symbol)
    if pip <= 0:
        return None

    # Direction: bullish if close noticeably above pivot, bearish if below
    threshold = atr / 8 if atr > 0 else Decimal("0")
    if c > pivot + threshold:
        direction = "up"
        target = pivot + (atr / 2)
    elif c < pivot - threshold:
        direction = "down"
        target = pivot - (atr / 2)
    else:
        direction = "neutral"
        target = pivot

    # Expected move bracket: 50%–80% of ATR converted to pips
    move_min_pips = max(Decimal("1"), (atr * Decimal("0.5")) / pip)
    move_max_pips = max(move_min_pips + Decimal("1"), (atr * Decimal("0.85")) / pip)

    # Round prices to 5 decimals (forex) or 2 (others) for cleanliness
    decimals = 5 if pip <= Decimal("0.0001") else 2
    target_q = target.quantize(Decimal(10) ** -decimals)
    pivot_q  = pivot.quantize(Decimal(10) ** -decimals)

    return {
        "symbol": symbol,
        "category": CATEGORY_MAP.get(symbol, "forex"),
        "timeframe": tf,
        "direction": direction,
        "expected_pips_min": move_min_pips.quantize(Decimal("1")),
        "expected_pips_max": move_max_pips.quantize(Decimal("1")),
        "target_price": target_q,
        "pivot_price": pivot_q,
        "source": "ta_engine",
    }


# ---------------------------------------------------------------------------
# Top-level generator + read API
# ---------------------------------------------------------------------------

DEFAULT_TIMEFRAMES = ["30m", "1h", "4h"]


async def regenerate_all(
    pg_session: AsyncSession,
    ts_session: AsyncSession,
    timeframes: Optional[List[str]] = None,
) -> Dict[str, int]:
    """Recompute all analyst views from ticks. Deactivates old, inserts fresh.

    Returns counts: {"created": N, "skipped": N}.
    """
    tfs = timeframes or DEFAULT_TIMEFRAMES
    symbols = list(CATEGORY_MAP.keys())

    # Mark all current as inactive so unique partial index frees up
    await pg_session.execute(
        text("UPDATE analyst_views SET is_active=false WHERE is_active=true")
    )

    created = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    for sym in symbols:
        for tf in tfs:
            ohlc = await _fetch_ohlc_from_ticks(ts_session, sym, _timeframe_window_hours(tf))
            if not ohlc:
                skipped += 1
                continue
            payload = _build_view(sym, tf, ohlc)
            if not payload:
                skipped += 1
                continue
            view = AnalystView(
                **payload,
                published_at=now,
                expires_at=now + _expiry_for(tf),
                is_active=True,
            )
            pg_session.add(view)
            created += 1

    await pg_session.commit()
    log.info("Analyst-views regenerated: %d created, %d skipped", created, skipped)
    return {"created": created, "skipped": skipped}


async def list_views(
    pg_session: AsyncSession,
    category: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 30,
) -> List[Dict[str, Any]]:
    """Return active, non-expired views; newest first."""
    stmt = select(AnalystView).where(
        AnalystView.is_active == True,  # noqa: E712
    ).order_by(AnalystView.published_at.desc())
    if category and category != "all":
        stmt = stmt.where(AnalystView.category == category)
    if q:
        stmt = stmt.where(AnalystView.symbol.ilike(f"%{q}%"))
    stmt = stmt.limit(limit)

    res = await pg_session.execute(stmt)
    rows = res.scalars().all()
    now = datetime.now(timezone.utc)
    out: List[Dict[str, Any]] = []
    for v in rows:
        # Skip rows whose expiry has passed (lazy filter — cron should also clean up)
        if v.expires_at and v.expires_at < now:
            continue
        out.append({
            "id": str(v.id),
            "symbol": v.symbol,
            "category": v.category,
            "timeframe": v.timeframe,
            "direction": v.direction,
            "expected_pips_min": float(v.expected_pips_min or 0),
            "expected_pips_max": float(v.expected_pips_max or 0),
            "target_price": float(v.target_price or 0),
            "pivot_price": float(v.pivot_price or 0),
            "notes": v.notes or "",
            "source": v.source,
            "published_at": v.published_at.isoformat() if v.published_at else None,
            "expires_at": v.expires_at.isoformat() if v.expires_at else None,
        })
    return out


async def set_active(pg_session: AsyncSession, view_id: str, active: bool) -> bool:
    """Admin: archive/unarchive a single view."""
    res = await pg_session.execute(
        text("UPDATE analyst_views SET is_active=:a, updated_at=NOW() WHERE id=:id RETURNING id"),
        {"a": active, "id": view_id},
    )
    found = res.first() is not None
    await pg_session.commit()
    return found

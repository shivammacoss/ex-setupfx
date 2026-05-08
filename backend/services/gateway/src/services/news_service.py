"""Market News service — pulls public RSS feeds, normalizes, caches in Redis.

Free, no API key required. Sources are well-known public forex/financial RSS:
  • FXStreet    — https://www.fxstreet.com/rss/news
  • ForexLive   — https://www.forexlive.com/feed/news
  • Investing   — https://www.investing.com/rss/news.rss
  • DailyFX     — https://www.dailyfx.com/feeds/market-news

Set NEWS_RSS_URLS env to override (comma-separated).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import List, Dict, Any, Optional
from xml.etree import ElementTree as ET

import httpx
import redis.asyncio as redis_async

log = logging.getLogger("news_service")


CACHE_KEY = "news:rss:v1"
CACHE_TTL_SEC = 900  # 15 minutes

DEFAULT_FEEDS = [
    ("FXStreet",    "https://www.fxstreet.com/rss/news"),
    ("ForexLive",   "https://www.forexlive.com/feed/news"),
    ("Investing",   "https://www.investing.com/rss/news.rss"),
    ("DailyFX",     "https://www.dailyfx.com/feeds/market-news"),
]

# Tag extraction patterns — common forex symbols + macro topics
TAG_PATTERNS = {
    "EURUSD": re.compile(r"\bEUR/?USD\b", re.I),
    "GBPUSD": re.compile(r"\bGBP/?USD\b", re.I),
    "USDJPY": re.compile(r"\bUSD/?JPY\b", re.I),
    "AUDUSD": re.compile(r"\bAUD/?USD\b", re.I),
    "USDCAD": re.compile(r"\bUSD/?CAD\b", re.I),
    "USDCHF": re.compile(r"\bUSD/?CHF\b", re.I),
    "NZDUSD": re.compile(r"\bNZD/?USD\b", re.I),
    "DollarIndex": re.compile(r"\b(DXY|Dollar Index|US Dollar Index)\b", re.I),
    "Gold":   re.compile(r"\b(XAU|Gold|Bullion)\b", re.I),
    "Oil":    re.compile(r"\b(WTI|Brent|Crude|Oil)\b", re.I),
    "Bitcoin": re.compile(r"\b(BTC|Bitcoin)\b", re.I),
    "ECB":    re.compile(r"\bECB\b", re.I),
    "Fed":    re.compile(r"\b(Fed|Federal Reserve|FOMC)\b", re.I),
    "BoE":    re.compile(r"\b(BoE|Bank of England)\b", re.I),
    "BoJ":    re.compile(r"\b(BoJ|Bank of Japan)\b", re.I),
    "InterestRate": re.compile(r"\b(rate hike|rate cut|interest rate)\b", re.I),
    "Inflation":    re.compile(r"\b(inflation|CPI|PPI)\b", re.I),
    "Employment":   re.compile(r"\b(jobs|payroll|unemployment|NFP)\b", re.I),
    "GDP":          re.compile(r"\bGDP\b", re.I),
    "UnitedStates": re.compile(r"\b(United States|US economy|American)\b", re.I),
    "Eurozone":     re.compile(r"\b(Eurozone|Euro Area|Europe)\b", re.I),
    "UK":           re.compile(r"\b(United Kingdom|Britain|UK economy)\b", re.I),
    "Japan":        re.compile(r"\b(Japan|Japanese)\b", re.I),
    "China":        re.compile(r"\b(China|Chinese|Yuan)\b", re.I),
    "Consumption":  re.compile(r"\b(consumer spending|consumption|retail sales)\b", re.I),
}


def _strip_html(s: str) -> str:
    if not s:
        return ""
    return re.sub(r"<[^>]+>", "", s).strip()


def _parse_pubdate(s: str) -> Optional[datetime]:
    if not s:
        return None
    try:
        dt = parsedate_to_datetime(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        except Exception:
            return None


def _extract_tags(text: str) -> List[str]:
    found = []
    for tag, pat in TAG_PATTERNS.items():
        if pat.search(text):
            found.append(tag)
    return found


def _parse_rss(xml_bytes: bytes, source: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return out

    # RSS 2.0 has channel/item; Atom has feed/entry. Handle both.
    items = root.findall(".//item")
    if not items:
        items = root.findall(".//{http://www.w3.org/2005/Atom}entry")

    def _f(elem, *paths):
        for p in paths:
            r = elem.find(p)
            if r is not None:
                return r
        return None

    for it in items[:30]:
        title_el = _f(it, "title", "{http://www.w3.org/2005/Atom}title")
        link_el  = _f(it, "link", "{http://www.w3.org/2005/Atom}link")
        desc_el  = _f(it, "description", "{http://www.w3.org/2005/Atom}summary",
                      "{http://purl.org/rss/1.0/modules/content/}encoded")
        pub_el   = _f(it, "pubDate",
                      "{http://www.w3.org/2005/Atom}published",
                      "{http://www.w3.org/2005/Atom}updated")
        author_el = _f(it, "author",
                       "{http://purl.org/dc/elements/1.1/}creator",
                       "{http://www.w3.org/2005/Atom}author")

        title = (title_el.text or "").strip() if title_el is not None else ""
        link = ""
        if link_el is not None:
            link = (link_el.text or "").strip() or link_el.get("href", "").strip()
        desc = _strip_html(desc_el.text or "") if desc_el is not None else ""
        pub  = _parse_pubdate(pub_el.text if pub_el is not None and pub_el.text else "")
        author = ""
        if author_el is not None:
            author = (author_el.text or "").strip()
            if not author:
                # Atom: author/name
                name_el = author_el.find("{http://www.w3.org/2005/Atom}name")
                if name_el is not None:
                    author = (name_el.text or "").strip()

        if not title or not link:
            continue

        text_for_tags = f"{title}. {desc}"
        tags = _extract_tags(text_for_tags)

        out.append({
            "id": link,                      # use link as stable id
            "title": title,
            "summary": desc[:500],
            "url": link,
            "source": source,
            "author": author or source,
            "published_at": pub.isoformat() if pub else None,
            "tags": tags,
        })
    return out


async def _fetch_one(client: httpx.AsyncClient, name: str, url: str) -> List[Dict[str, Any]]:
    try:
        r = await client.get(url, timeout=8.0, headers={
            "User-Agent": "Mozilla/5.0 (compatible; EX-Setup-NewsBot/1.0)",
            "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
        })
        if r.status_code != 200 or not r.content:
            log.warning("News feed %s returned %s", name, r.status_code)
            return []
        return _parse_rss(r.content, name)
    except Exception as e:
        log.warning("News feed %s error: %s", name, e)
        return []


def _configured_feeds() -> List[tuple]:
    raw = os.environ.get("NEWS_RSS_URLS", "").strip()
    if not raw:
        return DEFAULT_FEEDS
    out = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        if "|" in entry:
            name, url = entry.split("|", 1)
            out.append((name.strip(), url.strip()))
        else:
            out.append((entry, entry))
    return out or DEFAULT_FEEDS


async def _redis() -> redis_async.Redis:
    url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
    return redis_async.from_url(url, decode_responses=True)


async def fetch_news(force: bool = False) -> List[Dict[str, Any]]:
    """Return merged news items from all configured RSS feeds. Cached in Redis 15 min."""
    r = await _redis()
    try:
        if not force:
            cached = await r.get(CACHE_KEY)
            if cached:
                try:
                    return json.loads(cached)
                except Exception:
                    pass

        async with httpx.AsyncClient(follow_redirects=True) as client:
            tasks = [_fetch_one(client, name, url) for name, url in _configured_feeds()]
            results = await asyncio.gather(*tasks, return_exceptions=False)

        merged: List[Dict[str, Any]] = []
        seen = set()
        for batch in results:
            for item in batch:
                if item["id"] in seen:
                    continue
                seen.add(item["id"])
                merged.append(item)

        # Sort by published_at desc (None last)
        merged.sort(key=lambda x: x.get("published_at") or "", reverse=True)
        merged = merged[:120]

        try:
            await r.setex(CACHE_KEY, CACHE_TTL_SEC, json.dumps(merged))
        except Exception:
            pass

        return merged
    finally:
        try:
            await r.aclose()
        except Exception:
            pass


def filter_by_tags(items: List[Dict[str, Any]], tags: List[str]) -> List[Dict[str, Any]]:
    if not tags:
        return items
    tagset = {t.lower() for t in tags}
    out = []
    for it in items:
        item_tags = {t.lower() for t in (it.get("tags") or [])}
        if item_tags & tagset:
            out.append(it)
    return out


# Aggregated tag list for the UI filter pills.
ALL_TAGS = [
    "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "DollarIndex",
    "Gold", "Oil", "Bitcoin",
    "Fed", "ECB", "BoE", "BoJ",
    "InterestRate", "Inflation", "Employment", "GDP",
]

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTradingStore, type Position, type PendingOrder } from '@/stores/tradingStore';
import { clsx } from 'clsx';
import api from '@/lib/api/client';
import toast from 'react-hot-toast';
import { sounds, unlockAudio } from '@/lib/sounds';
import { Pencil, X } from 'lucide-react';

interface ClosedTrade {
  id: string;
  symbol: string;
  side: string;
  lots: number;
  open_price: number;
  close_price: number;
  pnl: number;
  commission: number;
  swap: number;
  close_time: string;
}

type TabId = 'open' | 'pending' | 'history';
type BulkCloseType = 'all' | 'profit' | 'loss';

const fmt = (n: number) =>
  (n < 0 ? '-' : '') +
  Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MobilePositionsPanel() {
  const {
    positions,
    pendingOrders,
    activeAccount,
    instruments,
    prices,
    removePosition,
    refreshPositions,
    refreshAccount,
  } = useTradingStore();

  const [activeTab, setActiveTab] = useState<TabId>('open');
  const [historyTrades, setHistoryTrades] = useState<ClosedTrade[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [closeSheet, setCloseSheet] = useState<Position | null>(null);

  const floatingPnl = positions.reduce((s, p) => s + (p.profit || 0), 0);
  const profitPositions = positions.filter((p) => (p.profit || 0) > 0);
  const lossPositions = positions.filter((p) => (p.profit || 0) < 0);

  const todayPnl = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return historyTrades
      .filter((t) => {
        const d = new Date(t.close_time);
        return !isNaN(d.getTime()) && d >= start;
      })
      .reduce((s, t) => s + (t.pnl || 0), 0);
  }, [historyTrades]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get<{ items?: ClosedTrade[] } | ClosedTrade[]>('/portfolio/trades', {
        page: '1',
        per_page: '200',
      });
      setHistoryTrades(
        (res && typeof res === 'object' && 'items' in res ? res.items : Array.isArray(res) ? res : []) || [],
      );
    } catch {
      setHistoryTrades([]);
    }
    setHistoryLoading(false);
  }, []);

  // Load history on mount so Today's P&L row is populated regardless of active tab
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const getDigits = (sym: string) => instruments.find((i) => i.symbol === sym)?.digits ?? 5;

  /**
   * Close all or part of a position. When `lots` is omitted or equals the full open size,
   * posts {} for a full close (removes the row optimistically). Otherwise posts { lots } for
   * a partial fill; the API returns `remaining_lots` and refreshPositions will pull the
   * reduced position back.
   */
  const closePosition = (id: string, lots?: number) => {
    unlockAudio();
    setCloseSheet(null);

    const target = positions.find((p) => p.id === id);
    const fullClose = !lots || !target || lots >= target.lots - 1e-9;

    if (fullClose) removePosition(id);

    void (async () => {
      try {
        const body: Record<string, unknown> = {};
        if (!fullClose) body.lots = lots;
        const res = await api.post<{ profit?: number; close_price?: number; remaining_lots?: number }>(
          `/positions/${id}/close`,
          body,
          { timeoutMs: 8_000 },
        );
        const pnl = res.profit ?? 0;
        const sign = pnl >= 0 ? '+' : '';
        pnl >= 0 ? sounds.profit() : sounds.loss();
        if (res.remaining_lots && res.remaining_lots > 0) {
          toast.success(
            `Partial @ ${res.close_price} | P&L: ${sign}$${pnl.toFixed(2)} | ${res.remaining_lots} lots left`,
          );
        } else {
          toast.success(`Closed @ ${res.close_price} | P&L: ${sign}$${pnl.toFixed(2)}`);
        }
        Promise.all([refreshPositions(), refreshAccount(), loadHistory()]).catch(() => {});
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Close failed');
        refreshPositions().catch(() => {});
      }
    })();
  };

  const bulkClose = async (type: BulkCloseType) => {
    const targets = type === 'all' ? positions : type === 'profit' ? profitPositions : lossPositions;
    if (targets.length === 0) {
      toast(
        type === 'profit'
          ? 'No profitable positions'
          : type === 'loss'
            ? 'No losing positions'
            : 'No open positions',
        { icon: 'ℹ️' },
      );
      return;
    }
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const pos of targets) {
      try {
        await api.post(`/positions/${pos.id}/close`, {});
        removePosition(pos.id);
        ok++;
      } catch {
        fail++;
      }
    }
    if (ok > 0) toast.success(`${ok} position${ok > 1 ? 's' : ''} closed`);
    if (fail > 0) toast.error(`${fail} failed to close`);
    refreshPositions();
    refreshAccount();
    void loadHistory();
    setBulkBusy(false);
  };

  const cancelPending = async (id: string) => {
    try {
      await api.delete(`/orders/${id}`);
      toast.success('Order cancelled');
      refreshPositions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cancel failed');
    }
  };

  const balance = activeAccount?.balance ?? 0;
  const credit = activeAccount?.credit ?? 0;
  const equity = activeAccount?.equity ?? 0;
  const usedMargin = activeAccount?.margin_used ?? 0;
  const freeMargin = activeAccount?.free_margin ?? 0;

  return (
    <div className="flex flex-col h-full bg-bg-base text-text-primary">
      {/* ── Account summary ───────────────────────────── */}
      <div className="shrink-0 bg-bg-base">
        <SummaryRow label="Balance" value={fmt(balance)} />
        <SummaryRow
          label="Equity"
          value={fmt(equity)}
          color={equity >= balance ? 'text-buy' : 'text-sell'}
        />
        <SummaryRow label="Credit" value={fmt(credit)} />
        <SummaryRow label="Used Margin" value={fmt(usedMargin)} />
        <SummaryRow label="Free Margin" value={fmt(freeMargin)} color="text-buy" />
        <SummaryRow
          label="Floating P/L"
          value={fmt(floatingPnl)}
          color={floatingPnl >= 0 ? 'text-buy' : 'text-sell'}
        />
        <SummaryRow
          label="Today's P&L"
          value={fmt(todayPnl)}
          color={todayPnl >= 0 ? 'text-buy' : 'text-sell'}
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-3 border-y border-border-glass bg-bg-base">
        {(
          [
            { id: 'open', label: 'Positions', count: positions.length },
            { id: 'pending', label: 'Pending', count: pendingOrders.length },
            { id: 'history', label: 'History', count: null as number | null },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={clsx(
              'py-3 text-[14px] font-bold border-b-2 transition-colors active:opacity-80',
              activeTab === t.id ? 'text-sell border-sell' : 'text-text-tertiary border-transparent',
            )}
          >
            {t.label}
            {t.count !== null && ` (${t.count})`}
          </button>
        ))}
      </div>

      {/* ── Bulk action buttons (open tab only) ─────────── */}
      {activeTab === 'open' && positions.length > 0 && (
        <div className="shrink-0 grid grid-cols-3 gap-2 px-3 pt-3 pb-1">
          <BulkBtn
            label={`Close All (${positions.length})`}
            onClick={() => bulkClose('all')}
            busy={bulkBusy}
          />
          <BulkBtn label="Close Profit" onClick={() => bulkClose('profit')} busy={bulkBusy} />
          <BulkBtn label="Close Loss" onClick={() => bulkClose('loss')} busy={bulkBusy} />
        </div>
      )}

      {/* ── List ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {activeTab === 'open' &&
          (positions.length === 0 ? (
            <Empty text="No open positions" />
          ) : (
            positions.map((p) => (
              <OpenCard
                key={p.id}
                pos={p}
                prices={prices}
                digits={getDigits(p.symbol)}
                onAction={() => setCloseSheet(p)}
                onSwipeClose={() => closePosition(p.id)}
              />
            ))
          ))}

        {activeTab === 'pending' &&
          (pendingOrders.length === 0 ? (
            <Empty text="No pending orders" />
          ) : (
            pendingOrders.map((o) => (
              <PendingCard
                key={o.id}
                order={o}
                digits={getDigits(o.symbol)}
                onCancel={() => void cancelPending(o.id)}
              />
            ))
          ))}

        {activeTab === 'history' &&
          (historyLoading ? (
            <Empty text="Loading…" />
          ) : historyTrades.length === 0 ? (
            <Empty text="No history yet" />
          ) : (
            historyTrades.map((t) => <HistoryCard key={t.id} trade={t} digits={getDigits(t.symbol)} />)
          ))}
      </div>

      {/* ── Partial close sheet (opens directly from a position tap) ─ */}
      {closeSheet && (
        <PartialCloseSheet
          pos={closeSheet}
          onCancel={() => setCloseSheet(null)}
          onConfirm={(lots) => closePosition(closeSheet.id, lots)}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function SummaryRow({
  label,
  value,
  color = 'text-text-primary',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-glass">
      <span className="text-[14px] text-text-secondary">{label}</span>
      <span className={clsx('text-[15px] font-semibold tabular-nums', color)}>{value}</span>
    </div>
  );
}

function BulkBtn({
  label,
  onClick,
  busy,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className="rounded-xl border border-sell/40 text-sell text-[12px] font-bold py-2.5 active:bg-sell/10 disabled:opacity-50 transition-colors"
    >
      {label}
    </button>
  );
}

/** Swipe-left threshold (px) past which the gesture triggers a full close on release. */
const SWIPE_CLOSE_THRESHOLD = 110;
/** While swiping the card is translated by `-dx * DAMPING` — a light rubber-band feel. */
const SWIPE_DAMPING = 0.9;

function OpenCard({
  pos,
  prices,
  digits,
  onAction,
  onSwipeClose,
}: {
  pos: Position;
  prices: Record<string, { bid: number; ask: number }>;
  digits: number;
  onAction: () => void;
  /** Fired when the user swipes the card far enough left — closes the full position. */
  onSwipeClose: () => void;
}) {
  const price = prices[pos.symbol];
  const livePrice = pos.side === 'buy' ? price?.bid : price?.ask;
  const pnl = pos.profit || 0;

  const [translateX, setTranslateX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startRef = useRef<{ x: number; y: number; locked: 'h' | 'v' | null } | null>(null);

  const reset = () => {
    setAnimating(true);
    setTranslateX(0);
    // Drop the transition class after the spring finishes so the next touchmove is instant.
    window.setTimeout(() => setAnimating(false), 220);
  };

  const fly = () => {
    setAnimating(true);
    setTranslateX(-window.innerWidth);
    window.setTimeout(() => {
      onSwipeClose();
    }, 180);
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, locked: null };
    setAnimating(false);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;

    // Decide whether this is a horizontal (close) or vertical (list scroll) gesture.
    if (startRef.current.locked === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      startRef.current.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (startRef.current.locked === 'v') return;

    // Only react to left swipes — right swipe on an already-centred card is a no-op.
    const eff = Math.min(0, dx) * SWIPE_DAMPING;
    setTranslateX(eff);
  };

  const onTouchEnd = () => {
    if (!startRef.current) return;
    const locked = startRef.current.locked;
    startRef.current = null;
    if (locked !== 'h') return reset();
    if (translateX <= -SWIPE_CLOSE_THRESHOLD) fly();
    else reset();
  };

  // Progress 0→1 drives the "CLOSE" indicator opacity behind the card.
  const progress = Math.min(1, Math.abs(translateX) / SWIPE_CLOSE_THRESHOLD);

  return (
    <div
      className="relative overflow-hidden border-b border-border-glass"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* Red action layer revealed as the card slides left. */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-5 bg-sell"
        style={{ width: Math.max(0, -translateX) + 'px', opacity: progress }}
      >
        <span className="text-white text-[13px] font-black uppercase tracking-widest">Close</span>
      </div>

      <button
        type="button"
        onClick={onAction}
        aria-label={`${pos.symbol} trade details`}
        className={clsx(
          'relative w-full text-left bg-bg-primary px-4 py-4 active:bg-bg-hover',
          animating ? 'transition-transform duration-200 ease-out' : '',
        )}
        style={{ transform: `translateX(${translateX}px)`, touchAction: 'pan-y' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[16px] font-extrabold text-text-primary tracking-tight">
                {pos.symbol}
              </span>
              <span
                className={clsx(
                  'inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wide text-white',
                  pos.side === 'buy' ? 'bg-buy' : 'bg-sell',
                )}
              >
                {pos.side}
              </span>
            </div>
            <div className="text-[12px] text-text-secondary tabular-nums">
              {pos.lots.toFixed(2)} lots @ {pos.open_price.toFixed(digits)}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span
              aria-hidden
              className="w-9 h-9 rounded-full bg-sell/10 text-sell flex items-center justify-center"
            >
              <Pencil size={14} strokeWidth={2.2} />
            </span>
            <div className="text-right min-w-[88px]">
              <div
                className={clsx(
                  'text-[15px] font-extrabold tabular-nums leading-tight',
                  pnl >= 0 ? 'text-buy' : 'text-sell',
                )}
              >
                {pnl >= 0 ? '$' : '-$'}
                {Math.abs(pnl).toFixed(2)}
              </div>
              <div className="text-[11px] text-text-tertiary tabular-nums leading-tight mt-0.5">
                {livePrice !== undefined
                  ? livePrice.toFixed(digits)
                  : pos.current_price?.toFixed(digits) ?? '—'}
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function PendingCard({
  order,
  digits,
  onCancel,
}: {
  order: PendingOrder;
  digits: number;
  onCancel: () => void;
}) {
  return (
    <div className="border-b border-border-glass bg-bg-primary px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[16px] font-extrabold text-text-primary tracking-tight">
              {order.symbol}
            </span>
            <span
              className={clsx(
                'inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wide text-white',
                order.side === 'buy' ? 'bg-buy' : 'bg-sell',
              )}
            >
              {order.side}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded border border-border-glass text-text-secondary uppercase tracking-wide">
              {order.order_type}
            </span>
          </div>
          <div className="text-[12px] text-text-secondary tabular-nums">
            {order.lots.toFixed(2)} lots @ {order.price.toFixed(digits)}
          </div>
        </div>
        <button
          onClick={onCancel}
          className="shrink-0 px-3 h-9 rounded-lg border border-sell/40 text-sell text-[11px] font-bold active:bg-sell/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function HistoryCard({ trade, digits }: { trade: ClosedTrade; digits: number }) {
  const pnl = trade.pnl || 0;
  const closedAt = new Date(trade.close_time);
  const timeLabel = isNaN(closedAt.getTime())
    ? '—'
    : closedAt.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="border-b border-border-glass bg-bg-primary px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[16px] font-extrabold text-text-primary tracking-tight">
              {trade.symbol}
            </span>
            <span
              className={clsx(
                'inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wide text-white',
                trade.side.toLowerCase() === 'buy' ? 'bg-buy' : 'bg-sell',
              )}
            >
              {trade.side}
            </span>
          </div>
          <div className="text-[12px] text-text-secondary tabular-nums">
            {trade.lots.toFixed(2)} lots · {trade.open_price.toFixed(digits)} → {trade.close_price.toFixed(digits)}
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">{timeLabel}</div>
        </div>
        <div className="text-right shrink-0">
          <div
            className={clsx(
              'text-[15px] font-extrabold tabular-nums',
              pnl >= 0 ? 'text-buy' : 'text-sell',
            )}
          >
            {pnl >= 0 ? '$' : '-$'}
            {Math.abs(pnl).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-[13px] text-text-tertiary">
      {text}
    </div>
  );
}

/** Partial-close picker: 25 / 50 / 75 / FULL presets + editable lots input. */
function PartialCloseSheet({
  pos,
  onCancel,
  onConfirm,
}: {
  pos: Position;
  onCancel: () => void;
  /** `lots` matches the parsed input; parent decides full vs partial by comparing to pos.lots. */
  onConfirm: (lots: number) => void;
}) {
  const totalLots = pos.lots;
  const [preset, setPreset] = useState<25 | 50 | 75 | 100>(100);
  const [lotsInput, setLotsInput] = useState(() => totalLots.toFixed(2));

  const applyPreset = (p: 25 | 50 | 75 | 100) => {
    setPreset(p);
    const next = +((totalLots * p) / 100).toFixed(2);
    // Guard: with very small positions (0.01 lots), 25% rounds to 0 — fall back to the
    // position minimum rather than blocking the user with a zero-lot close.
    setLotsInput((next > 0 ? next : 0.01).toFixed(2));
  };

  const onLotsInputChange = (v: string) => {
    setLotsInput(v);
    // Clear the preset highlight as soon as the user types their own number.
    setPreset((prev) => {
      const parsed = parseFloat(v);
      if (!Number.isFinite(parsed)) return prev;
      const pct = Math.round((parsed / totalLots) * 100);
      return pct === 25 || pct === 50 || pct === 75 || pct === 100 ? (pct as 25 | 50 | 75 | 100) : prev;
    });
  };

  const parsedLots = parseFloat(lotsInput);
  const valid =
    Number.isFinite(parsedLots) && parsedLots > 0 && parsedLots <= totalLots + 1e-9;

  const confirm = () => {
    if (!valid) {
      toast.error(`Enter lots between 0.01 and ${totalLots.toFixed(2)}`);
      return;
    }
    onConfirm(parsedLots);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex flex-col justify-end"
      onClick={onCancel}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative rounded-t-3xl border-t border-border-primary shadow-2xl bg-bg-primary pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-text-tertiary/30" />
        </div>

        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <span className="text-[17px] font-extrabold text-text-primary tracking-tight">
            Close Position
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-hover text-text-secondary"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mx-5 mb-4 rounded-2xl border border-border-glass bg-bg-secondary p-4 space-y-2">
          <Row label="Symbol" value={pos.symbol} />
          <Row
            label="Side"
            value={pos.side.toUpperCase()}
            valueColor={pos.side === 'buy' ? 'text-buy' : 'text-sell'}
          />
          <Row label="Open lots" value={totalLots.toFixed(2)} />
        </div>

        <div className="px-5 pb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">
            Lots to close
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {([25, 50, 75, 100] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={clsx(
                  'h-10 rounded-xl text-[13px] font-bold transition-colors border',
                  preset === p
                    ? 'bg-buy/15 border-buy text-buy'
                    : 'bg-bg-secondary border-border-glass text-text-secondary active:bg-bg-hover',
                )}
              >
                {p === 100 ? 'FULL' : `${p}%`}
              </button>
            ))}
          </div>

          <input
            type="number"
            inputMode="decimal"
            min={0.01}
            max={totalLots}
            step={0.01}
            value={lotsInput}
            onChange={(e) => onLotsInputChange(e.target.value)}
            className={clsx(
              'w-full h-12 rounded-xl bg-bg-secondary border px-4 text-[15px] font-semibold tabular-nums text-text-primary',
              'focus:outline-none focus:ring-2 focus:ring-buy/40',
              valid ? 'border-border-glass' : 'border-sell/60',
            )}
          />
        </div>

        <div className="px-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-xl bg-bg-secondary border border-border-glass text-text-primary font-semibold text-[14px] active:bg-bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!valid}
            className="h-12 rounded-xl bg-sell text-white font-bold text-[14px] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor = 'text-text-primary',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className={clsx('text-[13px] font-semibold tabular-nums', valueColor)}>{value}</span>
    </div>
  );
}

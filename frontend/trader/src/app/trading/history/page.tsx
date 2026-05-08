'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

interface TradingAccount {
  id: string;
  account_number?: string | number;
  is_demo?: boolean;
  group_name?: string;
}

interface TradeRow {
  id: string;
  symbol: string;
  side: 'buy' | 'sell' | string;
  lots?: number;
  volume?: number;
  open_time?: string;
  close_time?: string | null;
  opening_time?: string;
  closing_time?: string | null;
  open_price?: number;
  close_price?: number | null;
  opening_price?: number;
  closing_price?: number | null;
  profit?: number;
  pnl?: number;
  status?: string;
  close_reason?: string | null;
}

function reasonBadge(r?: string | null) {
  const reason = (r || 'manual').toLowerCase();
  if (reason === 'sl') return { label: 'SL', cls: 'bg-red-50 text-red-600' };
  if (reason === 'tp') return { label: 'TP', cls: 'bg-emerald-50 text-emerald-600' };
  if (reason === 'admin') return { label: 'Admin', cls: 'bg-amber-50 text-amber-600' };
  if (reason === 'stopout' || reason === 'margin_call') return { label: 'Stopout', cls: 'bg-orange-50 text-orange-600' };
  if (reason.startsWith('copy')) return { label: 'Copy', cls: 'bg-blue-50 text-blue-600' };
  return { label: 'Manual', cls: 'bg-gray-100 text-gray-600' };
}

const RANGES = [
  { id: 'all', label: 'All time' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

function fmt(n?: number) {
  if (!Number.isFinite(n as number)) return '—';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 }).format(n as number);
}

function fmtDate(s?: string | null) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return s;
  }
}

export default function HistoryOfOrdersPage() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [tab, setTab] = useState<'closed' | 'open'>('closed');
  const [range, setRange] = useState<string>('all');
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<TradingAccount[] | { items?: TradingAccount[] }>('/accounts/');
        const list = Array.isArray(res) ? res : res?.items ?? [];
        setAccounts(list);
        if (list.length > 0 && !accountId) setAccountId(list[0].id);
      } catch {
        setAccounts([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ account_id: accountId, page: '1', per_page: '100' });
        if (range !== 'all') {
          const days = parseInt(range, 10);
          const from = new Date(Date.now() - days * 86400_000).toISOString();
          qs.set('date_from', from);
        }
        const res = await api.get<{ trades?: TradeRow[]; items?: TradeRow[] } | TradeRow[]>(
          `/portfolio/trades?${qs.toString()}`,
        );
        const list = Array.isArray(res) ? res : res.trades ?? res.items ?? [];
        if (!cancelled) setTrades(list);
      } catch {
        if (!cancelled) setTrades([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, range]);

  const filtered = useMemo(() => {
    if (tab === 'open') return trades.filter((t) => !(t.close_time ?? t.closing_time));
    return trades.filter((t) => !!(t.close_time ?? t.closing_time));
  }, [trades, tab]);

  const downloadCsv = async () => {
    if (!accountId) return;
    try {
      const qs = new URLSearchParams({ account_id: accountId });
      if (range !== 'all') {
        const days = parseInt(range, 10);
        qs.set('date_from', new Date(Date.now() - days * 86400_000).toISOString());
      }
      window.open(`/api/v1/portfolio/export?${qs.toString()}`, '_blank');
    } catch {
      /* ignore */
    }
  };

  return (
    <DashboardShell>
      <div>
        <h1 className="text-[22px] sm:text-[32px] font-semibold text-text-primary tracking-tight mb-4 sm:mb-6">
          History of orders
        </h1>

        <div className="mb-4 sm:max-w-md">
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 sm:px-3.5 py-2.5 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.group_name ?? 'Standard'} #{a.account_number ?? a.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="inline-flex items-center bg-bg-base border border-border-primary rounded-lg p-1 w-full sm:w-auto">
            {(['closed', 'open'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-[12px] sm:text-[13px] font-semibold transition-colors ${
                  tab === t ? 'bg-bg-primary text-text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t === 'closed' ? 'Closed orders' : 'Open orders'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-bg-base border border-border-primary text-[12px] sm:text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {RANGES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void downloadCsv()}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg border border-border-primary text-[12px] sm:text-sm font-medium text-text-primary hover:bg-bg-hover transition-colors whitespace-nowrap"
            >
              <Download size={14} /> <span className="hidden xs:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Mobile cards (< sm) */}
        <div className="sm:hidden space-y-2.5">
          {loading && (
            <div className="bg-bg-primary border border-border-primary rounded-2xl py-12 text-center text-text-tertiary text-sm">Loading…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="bg-bg-primary border border-border-primary rounded-2xl py-12 text-center text-text-tertiary text-sm">No orders in this period.</div>
          )}
          {!loading && filtered.map((t) => {
            const profit = t.profit ?? t.pnl ?? 0;
            const positive = profit >= 0;
            const isSell = t.side?.toLowerCase() === 'sell';
            const r = reasonBadge(t.close_reason);
            return (
              <div key={t.id} className="bg-bg-primary border border-border-primary rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[14px] font-semibold text-text-primary truncate">{t.symbol}</span>
                    <span className={`shrink-0 inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      isSell ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>{t.side}</span>
                    <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.cls}`}>{r.label}</span>
                  </div>
                  <span className={`text-[14px] font-bold tabular-nums shrink-0 ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {positive ? '+' : '−'}{fmt(Math.abs(profit))}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Lots</span>
                    <span className="text-text-primary tabular-nums font-medium">{fmt(t.lots ?? t.volume)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Open</span>
                    <span className="text-text-primary tabular-nums font-medium">{fmt(t.open_price ?? t.opening_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Open at</span>
                    <span className="text-text-secondary tabular-nums">{fmtDate(t.open_time ?? t.opening_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Close</span>
                    <span className="text-text-primary tabular-nums font-medium">{fmt(t.close_price ?? t.closing_price ?? undefined)}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-text-tertiary">Closed at</span>
                    <span className="text-text-secondary tabular-nums">{fmtDate(t.close_time ?? t.closing_time)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table (sm+) */}
        <div className="hidden sm:block bg-bg-primary border border-border-primary rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-text-secondary text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Symbol</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-left px-5 py-3 font-medium">Opening time</th>
                  <th className="text-left px-5 py-3 font-medium">Closing time</th>
                  <th className="text-right px-5 py-3 font-medium">Lots</th>
                  <th className="text-right px-5 py-3 font-medium">Opening price</th>
                  <th className="text-right px-5 py-3 font-medium">Closing price</th>
                  <th className="text-left px-5 py-3 font-medium">Reason</th>
                  <th className="text-right px-5 py-3 font-medium">Profit, USD</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="text-center px-5 py-12 text-text-tertiary">Loading…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center px-5 py-12 text-text-tertiary">No orders in this period.</td></tr>
                )}
                {!loading && filtered.map((t) => {
                  const profit = t.profit ?? t.pnl ?? 0;
                  const positive = profit >= 0;
                  const r = reasonBadge(t.close_reason);
                  return (
                    <tr key={t.id} className="border-b border-border-primary/70 last:border-0 hover:bg-bg-hover/40">
                      <td className="px-5 py-3 font-medium text-text-primary">{t.symbol}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          t.side?.toLowerCase() === 'sell' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>{t.side}</span>
                      </td>
                      <td className="px-5 py-3 text-text-secondary tabular-nums">{fmtDate(t.open_time ?? t.opening_time)}</td>
                      <td className="px-5 py-3 text-text-secondary tabular-nums">{fmtDate(t.close_time ?? t.closing_time)}</td>
                      <td className="px-5 py-3 text-right text-text-primary tabular-nums">{fmt(t.lots ?? t.volume)}</td>
                      <td className="px-5 py-3 text-right text-text-primary tabular-nums">{fmt(t.open_price ?? t.opening_price)}</td>
                      <td className="px-5 py-3 text-right text-text-primary tabular-nums">{fmt(t.close_price ?? t.closing_price ?? undefined)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${r.cls}`}>{r.label}</span>
                      </td>
                      <td className={`px-5 py-3 text-right tabular-nums font-semibold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                        {positive ? '' : '−'}{fmt(Math.abs(profit))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

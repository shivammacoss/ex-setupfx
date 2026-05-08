'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, ArrowUp, ArrowDown, Minus, Eye, EyeOff, Search, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface AnalystView {
  id: string;
  symbol: string;
  category: string;
  timeframe: string;
  direction: 'up' | 'down' | 'neutral';
  expected_pips_min: number;
  expected_pips_max: number;
  target_price: number;
  pivot_price: number;
  notes: string;
  source: string;
  published_at: string;
  expires_at: string | null;
  is_active?: boolean;
}

const CATEGORIES = ['all', 'forex', 'crypto', 'stocks', 'indices', 'commodities'] as const;
type Category = (typeof CATEGORIES)[number];

const TF_LABEL: Record<string, string> = {
  '5m': '5 MIN', '30m': '30 MIN', '1h': '1 H', '4h': '4 H', '1d': '1 D', '1w': '1 W',
};

function fmtAge(iso: string | null) {
  if (!iso) return '—';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.round(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.round(hr / 24);
    return `${d}d ago`;
  } catch { return '—'; }
}

function fmtExpiry(iso: string | null) {
  if (!iso) return '—';
  try {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms < 0) return 'Expired';
    const min = Math.round(ms / 60000);
    if (min < 60) return `in ${min}m`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `in ${hr}h`;
    const d = Math.round(hr / 24);
    return `in ${d}d`;
  } catch { return '—'; }
}

function dirIcon(d: string) {
  if (d === 'up') return <ArrowUp size={14} className="text-success" />;
  if (d === 'down') return <ArrowDown size={14} className="text-danger" />;
  return <Minus size={14} className="text-text-tertiary" />;
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border-primary bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary font-semibold">{label}</p>
      <p className={cn('text-xl font-bold font-mono mt-1', color)}>{value}</p>
    </div>
  );
}

export default function AdminAnalystViewsPage() {
  const [views, setViews] = useState<AnalystView[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '200' };
      if (category !== 'all') params.category = category;
      if (query.trim()) params.q = query.trim();
      const res = await adminApi.get<AnalystView[]>('/analyst-views', params);
      setViews(Array.isArray(res) ? res : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
      setViews([]);
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useEffect(() => { void load(); }, [load]);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await adminApi.post<{ status: string; created: number; skipped: number }>(
        '/analyst-views/regenerate',
      );
      toast.success(`Regenerated: ${res.created} created, ${res.skipped} skipped`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Regenerate failed');
    } finally {
      setRegenerating(false);
    }
  };

  const archive = async (id: string) => {
    setActing(id);
    try {
      await adminApi.post(`/analyst-views/${id}/archive`);
      setViews((vs) => vs.filter((v) => v.id !== id));
      toast.success('Archived');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Archive failed');
    } finally {
      setActing(null);
    }
  };

  const stats = {
    total: views.length,
    up: views.filter((v) => v.direction === 'up').length,
    down: views.filter((v) => v.direction === 'down').length,
    neutral: views.filter((v) => v.direction === 'neutral').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analyst Views</h1>
          <p className="text-sm text-text-tertiary mt-1">
            TA-engine generated trading recommendations shown to traders on /analytics/views.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-primary text-sm font-semibold text-text-primary hover:bg-bg-hover disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-bold hover:brightness-110 disabled:opacity-50"
          >
            {regenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {regenerating ? 'Regenerating…' : 'Regenerate now'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total active" value={String(stats.total)} />
        <StatBox label="Bullish (↑)" value={String(stats.up)} color="text-success" />
        <StatBox label="Bearish (↓)" value={String(stats.down)} color="text-danger" />
        <StatBox label="Neutral" value={String(stats.neutral)} color="text-text-secondary" />
      </div>

      <div className="rounded-xl border border-border-primary bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-primary flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors',
                  category === c ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary border border-border-primary',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search symbol…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-primary bg-bg-input text-text-primary text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin inline" size={20} /></div>
        ) : views.length === 0 ? (
          <div className="py-16 text-center text-sm text-text-tertiary">
            No active analyst views. Click <strong>Regenerate now</strong> to compute fresh views from market data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-secondary text-text-tertiary text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Symbol</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-left px-4 py-3 font-semibold">TF</th>
                  <th className="text-left px-4 py-3 font-semibold">Dir</th>
                  <th className="text-right px-4 py-3 font-semibold">Pips</th>
                  <th className="text-right px-4 py-3 font-semibold">Target</th>
                  <th className="text-right px-4 py-3 font-semibold">Pivot</th>
                  <th className="text-left px-4 py-3 font-semibold">Source</th>
                  <th className="text-left px-4 py-3 font-semibold">Published</th>
                  <th className="text-left px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {views.map((v) => (
                  <tr key={v.id} className="border-t border-border-primary hover:bg-bg-hover/40">
                    <td className="px-4 py-3 font-bold text-text-primary">{v.symbol}</td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{v.category}</td>
                    <td className="px-4 py-3 text-text-secondary">{TF_LABEL[v.timeframe] || v.timeframe}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {dirIcon(v.direction)}
                        <span className={cn(
                          'capitalize text-xs font-semibold',
                          v.direction === 'up' && 'text-success',
                          v.direction === 'down' && 'text-danger',
                          v.direction === 'neutral' && 'text-text-tertiary',
                        )}>
                          {v.direction}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {v.expected_pips_min}–{v.expected_pips_max}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-success font-mono">{v.target_price}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-text-primary">{v.pivot_price}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                        v.source === 'ta_engine' && 'bg-accent/15 text-accent',
                        v.source !== 'ta_engine' && 'bg-warning/15 text-warning',
                      )}>
                        {v.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-tertiary text-xs">{fmtAge(v.published_at)}</td>
                    <td className="px-4 py-3 text-text-tertiary text-xs">{fmtExpiry(v.expires_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => archive(v.id)}
                        disabled={acting === v.id}
                        title="Hide from traders"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-danger/30 text-danger text-xs font-semibold hover:bg-danger/10 disabled:opacity-50"
                      >
                        {acting === v.id ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                        Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-text-tertiary leading-relaxed">
        Views auto-expire per timeframe (30m → 2h, 1h → 4h, 4h → 12h, 1d → 24h). Archived views are hidden from
        traders immediately. Use <strong>Regenerate now</strong> after market data freshens or in case the TA engine
        config changes; this recomputes pivot points and ATR-based ranges from the latest ticks.
      </p>
    </div>
  );
}

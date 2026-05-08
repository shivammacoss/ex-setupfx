'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCcw } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

const TABS = [
  { id: 'forex', label: 'Forex' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'indices', label: 'Indices' },
  { id: 'commodities', label: 'Commodities' },
] as const;

type Cat = (typeof TABS)[number]['id'];

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
  published_at: string;
  expires_at: string | null;
}

const TF_LABEL: Record<string, string> = {
  '5m': '5 MIN', '30m': '30 MIN', '1h': '1 H', '4h': '4 H', '1d': '1 D', '1w': '1 W',
};

function fmtTime(iso: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ` (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
  } catch { return ''; }
}

export default function AnalystViewsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Cat>('forex');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AnalystView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchViews = async (cat: Cat, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get<{ items: AnalystView[] }>(
        `/analyst-views?category=${encodeURIComponent(cat)}&limit=30`,
      );
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void fetchViews(tab); }, [tab]);

  const filtered = items.filter((v) => v.symbol.toLowerCase().includes(query.toLowerCase()));

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-text-primary tracking-tight">
            Analyst Views
          </h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Enter Symbol or Name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-full bg-bg-base border border-border-primary text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-warning"
              />
            </div>
            <button
              type="button"
              onClick={() => void fetchViews(tab, true)}
              disabled={refreshing}
              aria-label="Refresh"
              className="shrink-0 w-10 h-10 rounded-full border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 border-b border-border-primary mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative pb-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                tab === t.id ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
              {tab === t.id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-warning rounded" />}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[300px] bg-bg-secondary border border-border-primary rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-primary bg-bg-secondary/40 py-16 text-center text-sm text-text-tertiary">
            No analyst views available for {tab} right now. Check back later.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((v) => {
              const dir: 'up' | 'down' = v.direction === 'down' ? 'down' : 'up';
              const pipText = v.direction === 'neutral'
                ? `${v.expected_pips_min}–${v.expected_pips_max} PIPS`
                : `${v.direction === 'up' ? '↑' : '↓'} ${v.expected_pips_min}–${v.expected_pips_max} PIPS`;
              return (
                <div key={v.id} className="bg-bg-primary border border-border-primary rounded-2xl overflow-hidden">
                  <div className="bg-[#0c1221] text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold tracking-tight">{v.symbol}</span>
                      <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded">{TF_LABEL[v.timeframe] || v.timeframe.toUpperCase()}</span>
                    </div>
                    <span className="text-[11px] text-white/60">{fmtTime(v.published_at)}</span>
                  </div>
                  <div className="px-5 py-4 bg-[#f7f9fc]">
                    <ChartPlaceholder direction={dir} />
                  </div>
                  <div className="px-5 py-4 space-y-1.5 text-sm">
                    <Row label="Expected Move" value={
                      <span className={dir === 'up' ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                        {pipText}
                      </span>
                    } />
                    <Row label="Target" value={<span className="text-emerald-600 tabular-nums">{v.target_price}</span>} />
                    <Row label="Pivot" value={<span className="text-text-primary tabular-nums">{v.pivot_price}</span>} />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sym = v.symbol.replace('/', '');
                      const params = new URLSearchParams({
                        symbol: sym,
                        suggested_tp: String(v.target_price),
                        suggested_pivot: String(v.pivot_price),
                        view: 'chart',
                      });
                      router.push(`/trading/terminal?${params.toString()}`);
                    }}
                    className="block w-full bg-warning hover:brightness-110 text-center py-3 text-[13px] font-bold text-black transition-all"
                  >
                    Trade
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-[11px] text-text-tertiary leading-relaxed">
          Analyst Views are generated from technical indicators (pivot points + ATR-based ranges) and are for informational
          purposes only. They do not constitute investment advice. CFDs are complex instruments with high risk of losing
          money rapidly due to leverage.
        </p>
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      {value}
    </div>
  );
}

function ChartPlaceholder({ direction }: { direction: 'up' | 'down' }) {
  const path =
    direction === 'up'
      ? 'M0,50 L25,42 L50,38 L75,28 L100,18'
      : 'M0,18 L25,28 L50,38 L75,42 L100,50';
  return (
    <svg viewBox="0 0 100 60" className="w-full h-32">
      <defs>
        <linearGradient id={`g-${direction}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={direction === 'up' ? '#10b981' : '#ef4444'} stopOpacity="0.18" />
          <stop offset="100%" stopColor={direction === 'up' ? '#10b981' : '#ef4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L100,60 L0,60 Z`} fill={`url(#g-${direction})`} />
      <path d={path} stroke={direction === 'up' ? '#10b981' : '#ef4444'} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

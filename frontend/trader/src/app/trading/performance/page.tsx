'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

interface TradingAccount {
  id: string;
  account_number?: string | number;
  is_demo?: boolean;
  currency?: string;
  group_name?: string;
}

interface PerformanceResponse {
  net_profit?: number;
  profit?: number;
  loss?: number;
  unrealized_pl?: number;
  closed_orders?: number;
  profitable?: number;
  unprofitable?: number;
  trading_volume_lifetime?: number;
  equity_current?: number;
}

const PERIODS = [
  { id: '1m', label: 'Last 30 days' },
  { id: '3m', label: 'Last 90 days' },
  { id: '6m', label: 'Last 6 months' },
  { id: '1y', label: 'Last 365 days' },
  { id: 'all', label: 'All time' },
];

const CHART_TABS = ['Net profit', 'Closed orders', 'Trading volume', 'Equity'];

export default function PerformancePage() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [period, setPeriod] = useState<string>('1y');
  const [data, setData] = useState<PerformanceResponse>({});
  const [loading, setLoading] = useState(true);
  const [chartTab, setChartTab] = useState<string>('Net profit');

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<TradingAccount[] | { items?: TradingAccount[] }>('/accounts/');
        const list = Array.isArray(res) ? res : res?.items ?? [];
        setAccounts(list);
      } catch {
        setAccounts([]);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (accountId) qs.set('account_id', accountId);
        if (period) qs.set('period', period);
        const res = await api.get<PerformanceResponse>(`/portfolio/performance?${qs.toString()}`);
        if (!cancelled) setData(res ?? {});
      } catch {
        if (!cancelled) setData({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, period]);

  const fmt = (n?: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number.isFinite(n as number) ? (n as number) : 0,
    );

  const profit = data.profit ?? Math.max(0, data.net_profit ?? 0);
  const loss = data.loss ?? Math.min(0, data.net_profit ?? 0);

  return (
    <DashboardShell>
      <h1 className="text-[24px] sm:text-[40px] font-semibold text-text-primary tracking-tight mb-5 sm:mb-8">
        Summary
      </h1>

      {/* Filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,260px)_minmax(0,260px)] gap-3 sm:gap-4 mb-6 sm:mb-10">
        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Account</label>
          <div className="relative">
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.account_number ?? a.id.slice(0, 8)} {a.is_demo ? '(Demo)' : ''}
                </option>
              ))}
            </select>
            <Caret />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Period</label>
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <Caret />
          </div>
        </div>
      </div>

      {/* Stats grid — cards on mobile, inline on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-x-10 sm:gap-y-8 mb-8 sm:mb-12">
        <StatBlock label="Net profit">
          <BigValue value={loading ? '—' : fmt(data.net_profit)} />
          <Sub label="Profit" value={`${fmt(profit)} USD`} />
          <Sub label="Loss" value={`${fmt(Math.abs(loss))} USD`} />
          <Sub label="Unrealised P/L" value={`${fmt(data.unrealized_pl)} USD`} hint />
        </StatBlock>

        <StatBlock label="Closed orders">
          <BigValue value={loading ? '—' : `${data.closed_orders ?? 0}`} />
          <Sub label="Profitable" value={`${data.profitable ?? 0}`} />
          <Sub label="Unprofitable" value={`${data.unprofitable ?? 0}`} />
        </StatBlock>

        <StatBlock label="Trading volume">
          <Sub label="Lifetime" value={`${fmt(data.trading_volume_lifetime)} USD`} className="mt-2" />
        </StatBlock>

        <StatBlock label="Equity">
          <Sub label="Current" value={`${fmt(data.equity_current)} USD`} className="mt-2" />
        </StatBlock>
      </div>

      {/* Charts */}
      <h2 className="text-[20px] sm:text-[26px] font-semibold text-text-primary tracking-tight mb-4 sm:mb-5">
        Charts
      </h2>

      <div className="border-b border-border-primary mb-5 sm:mb-6 flex items-center gap-4 sm:gap-7 overflow-x-auto no-scrollbar">
        {CHART_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setChartTab(t)}
            className={`relative pb-3 text-[12px] sm:text-[14px] font-semibold transition-colors whitespace-nowrap ${
              chartTab === t ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t}
            {chartTab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded" />}
          </button>
        ))}
      </div>

      {/* Chart placeholder grid (matches the empty 0..4 axis from screenshot) */}
      <div className="relative h-72 w-full">
        <div className="absolute inset-0 flex flex-col justify-between text-[12px] text-text-tertiary tabular-nums pointer-events-none pr-4">
          {[4, 3, 2, 1, 0].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <span className="w-4 text-right">{n}</span>
              <div className="flex-1 border-t border-dashed border-border-primary/70" />
            </div>
          ))}
        </div>
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

function StatBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-primary bg-bg-primary p-4 sm:bg-transparent sm:border-0 sm:rounded-none sm:p-0">
      <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px] text-text-secondary mb-1.5">
        <span>{label}</span>
        <Info size={13} className="text-text-tertiary" />
      </div>
      {children}
    </div>
  );
}

function BigValue({ value }: { value: string }) {
  return (
    <div className="text-[26px] sm:text-[34px] font-semibold text-text-primary leading-none tabular-nums mb-2.5 sm:mb-3">
      {value}
    </div>
  );
}

function Sub({ label, value, hint, className }: { label: string; value: string; hint?: boolean; className?: string }) {
  return (
    <div className={`text-[13px] text-text-secondary ${className ?? ''}`}>
      {label}{hint && <Info size={11} className="inline ml-1 text-text-tertiary" />} <span className="text-text-primary">{value}</span>
    </div>
  );
}

function Caret() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

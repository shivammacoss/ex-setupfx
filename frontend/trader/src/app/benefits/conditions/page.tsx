'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

interface Instrument {
  id?: string;
  symbol?: string;
  segment?: string;
  spread?: number;
  min_spread?: number;
  leverage?: number;
  contract_size?: number;
  digits?: number;
  active?: boolean;
}

export default function TradingConditionsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<string>('all');

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<Instrument[] | { instruments?: Instrument[] }>('/instruments/');
        const list = Array.isArray(res) ? res : res.instruments ?? [];
        setInstruments(list);
      } catch {
        setInstruments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const segments = Array.from(new Set(instruments.map((i) => i.segment).filter(Boolean) as string[]));

  const filtered = segment === 'all' ? instruments : instruments.filter((i) => i.segment === segment);

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-[28px] sm:text-[32px] font-semibold text-text-primary tracking-tight mb-2">
          Trading Conditions
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Here&apos;s a list of the better-than-market trading conditions you can currently enjoy on your accounts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          <BenefitCard
            icon={ShieldCheck}
            title="Negative Balance Protection"
            description="You can never lose more money than you put into your account. If a stop out causes all your positions to close in a negative balance, we will restore it to 0."
            href="/support"
          />
          <BenefitCard
            icon={Sparkles}
            title="Swap-Free"
            description="Swaps do not apply to accounts registered from Islamic countries."
            href="/support"
          />
        </div>

        <div className="bg-bg-primary border border-border-primary rounded-2xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border-primary">
            <h2 className="text-[18px] font-semibold text-text-primary">Live spreads & leverage</h2>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSegment('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  segment === 'all' ? 'bg-text-primary text-bg-primary' : 'bg-bg-base text-text-secondary hover:text-text-primary'
                }`}
              >All</button>
              {segments.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSegment(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                    segment === s ? 'bg-text-primary text-bg-primary' : 'bg-bg-base text-text-secondary hover:text-text-primary'
                  }`}
                >{s}</button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-text-secondary text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Symbol</th>
                  <th className="text-left px-5 py-3 font-medium">Segment</th>
                  <th className="text-right px-5 py-3 font-medium">Min spread</th>
                  <th className="text-right px-5 py-3 font-medium">Max leverage</th>
                  <th className="text-right px-5 py-3 font-medium">Contract size</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="text-center px-5 py-12 text-text-tertiary">Loading conditions…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center px-5 py-12 text-text-tertiary">No instruments available.</td></tr>
                )}
                {!loading && filtered.slice(0, 50).map((i) => (
                  <tr key={i.id ?? i.symbol} className="border-b border-border-primary/70 last:border-0 hover:bg-bg-hover/40">
                    <td className="px-5 py-3 font-semibold text-text-primary">{i.symbol}</td>
                    <td className="px-5 py-3 capitalize text-text-secondary">{i.segment}</td>
                    <td className="px-5 py-3 text-right text-text-primary tabular-nums">
                      {Number.isFinite(i.min_spread as number) ? `${i.min_spread} pips` : Number.isFinite(i.spread as number) ? `${i.spread} pips` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary tabular-nums">
                      {i.leverage ? `1:${i.leverage}` : '1:Unlimited'}
                    </td>
                    <td className="px-5 py-3 text-right text-text-secondary tabular-nums">
                      {i.contract_size ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-bg-primary border border-border-primary rounded-2xl p-6 hover:border-accent/40 transition-colors flex flex-col"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-accent" />
        </div>
        <h3 className="text-[18px] font-semibold text-text-primary leading-tight">{title}</h3>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-1">{description}</p>
      <div className="flex justify-end">
        <span className="w-8 h-8 rounded-full bg-bg-base border border-border-primary flex items-center justify-center text-text-secondary group-hover:bg-text-primary group-hover:text-bg-primary transition-colors">
          <ChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Link as LinkIcon, UserPlus, Wallet, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReferralModal } from '@/stores/referralModalStore';
import api from '@/lib/api/client';

interface IBStatus {
  is_ib?: boolean;
  referral_code?: string;
  referral_link?: string;
  total_earned?: number;
  pending_payout?: number;
  level?: number;
}

interface DashboardData {
  referral_code?: string;
  referral_link?: string;
  total_referrals?: number;
  total_earned?: number;
  pending_payout?: number;
}

interface ReferralItem {
  id: string;
  referred_user?: { name?: string; email?: string; joined_at?: string };
  total_deposit?: number;
}

export default function ReferralModal() {
  const isOpen = useReferralModal((s) => s.isOpen);
  const close = useReferralModal((s) => s.close);
  const [view, setView] = useState<'main' | 'downline'>('main');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string>('');
  const [link, setLink] = useState<string>('');
  const [stats, setStats] = useState<{ earned: number; pending: number; refs: number; level: number }>({
    earned: 0, pending: 0, refs: 0, level: 1,
  });
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setView('main');
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const status = await api.get<IBStatus>('/business/status');
        const dash = await api.get<DashboardData>('/business/ib/dashboard').catch(() => ({} as DashboardData));
        const refs = await api.get<{ items?: ReferralItem[] }>('/business/ib/referrals').catch(() => ({ items: [] as ReferralItem[] }));
        if (cancelled) return;
        const c = status.referral_code || dash.referral_code || '';
        const l = dash.referral_link
          || status.referral_link
          || (c && typeof window !== 'undefined' ? `${window.location.origin}/auth/register?ref=${c}` : '');
        setCode(c);
        setLink(l);
        setStats({
          earned: Number(dash.total_earned ?? status.total_earned ?? 0),
          pending: Number(dash.pending_payout ?? status.pending_payout ?? 0),
          refs: Number(dash.total_referrals ?? (refs.items?.length ?? 0)),
          level: Number(status.level ?? 1),
        });
        setReferrals(refs.items || []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const onCopy = () => {
    if (!link) return;
    try {
      navigator.clipboard.writeText(link);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-3 py-6 animate-[fadeIn_120ms_ease-out]"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border-primary p-5 sm:p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-bg-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        >
          <X size={18} />
        </button>

        {view === 'main' ? (
          <>
            <h2 className="text-[19px] sm:text-[22px] font-bold text-text-primary pr-8 mb-5 leading-tight">
              Become a partner, start earning
            </h2>

            <div className="rounded-xl bg-warning/[0.10] border border-warning/25 px-4 py-4 mb-6 text-center">
              {loading ? (
                <div className="h-4 bg-bg-secondary rounded w-3/4 mx-auto animate-pulse" />
              ) : (
                <p className="text-[13px] text-text-primary font-mono break-all underline decoration-text-tertiary/40 underline-offset-2">
                  {link || '—'}
                </p>
              )}
              <button
                type="button"
                onClick={onCopy}
                disabled={!link}
                className="mt-2 text-[13px] font-semibold text-[#5d3eff] hover:underline disabled:opacity-50"
              >
                Copy link
              </button>
            </div>

            <h3 className="text-center text-[15px] font-bold text-text-primary mb-4">How it works?</h3>

            <div className="flex items-start justify-between gap-1 mb-5">
              <Step icon={LinkIcon} label={<>Share your link<br />with your network</>} />
              <Arrow />
              <Step icon={UserPlus} label={<>Users register<br />and trade</>} />
              <Arrow />
              <Step icon={Wallet} label={<>You qualify for<br />commissions<br />when they trade</>} />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setView('downline')}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-warning hover:underline"
              >
                <Users size={14} /> View downline ({stats.refs})
              </button>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); }}
                className="text-[13px] font-semibold text-[#5d3eff] hover:underline"
              >
                Read more
              </a>
            </div>
          </>
        ) : (
          <DownlineView
            onBack={() => setView('main')}
            referrals={referrals}
            stats={stats}
            code={code}
          />
        )}
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  label,
}: {
  icon: typeof LinkIcon;
  label: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center flex-1 min-w-0">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#5d3eff] flex items-center justify-center shrink-0">
        <Icon size={20} className="text-white" strokeWidth={2} />
      </div>
      <p className="text-[10px] sm:text-[11px] text-text-primary leading-tight font-medium">{label}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-text-tertiary text-base shrink-0 pt-4 sm:pt-5 w-3">
      →
    </div>
  );
}

function DownlineView({
  onBack,
  referrals,
  stats,
  code,
}: {
  onBack: () => void;
  referrals: ReferralItem[];
  stats: { earned: number; pending: number; refs: number; level: number };
  code: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold text-[#5d3eff] hover:underline mb-3"
      >
        ← Back
      </button>
      <h2 className="text-xl sm:text-2xl font-bold text-text-primary pr-10 mb-1">Your downline</h2>
      <p className="text-xs text-text-tertiary mb-5">
        Code: <span className="text-warning font-mono font-bold">{code || '—'}</span>
        {' · '}Level {stats.level} · {stats.refs} direct referral{stats.refs === 1 ? '' : 's'}
      </p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatBox label="Total earned" value={`$${stats.earned.toFixed(2)}`} />
        <StatBox label="Pending payout" value={`$${stats.pending.toFixed(2)}`} />
        <StatBox label="Referrals" value={String(stats.refs)} />
      </div>

      {referrals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-primary bg-bg-secondary/40 py-12 text-center text-sm text-text-tertiary">
          No referrals yet. Share your link to start building your network.
        </div>
      ) : (
        <div className="rounded-xl border border-border-primary overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-bg-secondary text-text-tertiary">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide text-[10px]">User</th>
                <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide text-[10px]">Joined</th>
                <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wide text-[10px]">Deposit</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id} className="border-t border-border-primary hover:bg-bg-hover/30">
                  <td className="px-4 py-2.5">
                    <p className="text-text-primary font-medium">{r.referred_user?.name || r.referred_user?.email || '—'}</p>
                    {r.referred_user?.email ? (
                      <p className="text-[10px] text-text-tertiary">{r.referred_user.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-text-tertiary">
                    {r.referred_user?.joined_at ? new Date(r.referred_user.joined_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-primary">
                    ${(r.total_deposit || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-primary bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-text-tertiary font-semibold">{label}</p>
      <p className="text-base sm:text-lg font-bold font-mono text-warning mt-1">{value}</p>
    </div>
  );
}

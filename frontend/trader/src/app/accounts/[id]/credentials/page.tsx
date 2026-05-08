'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Check, ExternalLink, Eye, EyeOff } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';
import { tradingTerminalUrl, setPersistedTradingAccountId } from '@/lib/tradingNav';

interface AccountDetail {
  id: string;
  account_number: string;
  balance: number;
  leverage: number;
  currency: string;
  is_demo: boolean;
  platform?: string;
  account_group?: { name: string } | null;
  group_name?: string;
  trading_password?: string;
}

export default function AccountCredentialsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<AccountDetail>(`/accounts/${id}`);
        if (!cancelled) setAccount(res);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Could not load account');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const copyText = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }, []);

  const launchTerminal = () => {
    if (!account) return;
    setPersistedTradingAccountId(account.id);
    const url = tradingTerminalUrl(account.id, { view: 'chart' });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const groupLabel = account?.group_name ?? account?.account_group?.name ?? 'Standard';

  return (
    <DashboardShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push('/accounts')}
            aria-label="Back"
            className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-primary"
          >
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>
          <h1 className="text-[24px] sm:text-[30px] font-semibold tracking-tight text-text-primary">
            Account credentials
          </h1>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border-primary bg-bg-secondary p-10 text-center text-sm text-text-tertiary">
            Loading…
          </div>
        ) : !account ? (
          <div className="rounded-xl border border-border-primary bg-bg-secondary p-10 text-center text-sm text-text-tertiary">
            Account not found.
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* Info banner */}
            <div className="rounded-xl border border-accent/30 bg-accent/[0.05] p-5 text-center space-y-2">
              <h2 className="text-lg font-bold text-text-primary">Account Information</h2>
              <p className="text-sm text-text-tertiary">
                Use these credentials to connect to the trading platform.
              </p>
            </div>

            {/* Credentials card */}
            <div className="rounded-xl border border-border-primary bg-card divide-y divide-border-primary">
              {/* Account ID */}
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Account ID</p>
                  <p className="text-base font-bold text-text-primary mt-0.5 tabular-nums">{account.account_number}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(String(account.account_number), 'id')}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
                  aria-label="Copy account ID"
                >
                  {copiedField === 'id' ? <Check size={15} className="text-buy" /> : <Copy size={15} />}
                </button>
              </div>

              {/* Trading Password */}
              <div className="flex items-center justify-between px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Trading Password</p>
                  {account.trading_password ? (
                    <p className="text-base font-bold text-text-primary mt-0.5 tabular-nums">
                      {showPwd ? account.trading_password : '••••••••'}
                    </p>
                  ) : (
                    <p className="text-sm text-text-tertiary mt-0.5">
                      Set during account creation. Reset via Settings if forgotten.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {account.trading_password && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
                        aria-label={showPwd ? 'Hide' : 'Show'}
                      >
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(account.trading_password!, 'pwd')}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
                        aria-label="Copy password"
                      >
                        {copiedField === 'pwd' ? <Check size={15} className="text-buy" /> : <Copy size={15} />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Account details grid */}
              <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-text-tertiary">Account type</p>
                  <p className="text-text-primary font-semibold capitalize mt-0.5">{account.is_demo ? 'Demo' : 'Real'}</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Platform</p>
                  <p className="text-text-primary font-semibold mt-0.5">EX-Setup Trading</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Currency</p>
                  <p className="text-text-primary font-semibold mt-0.5">{account.currency || 'USD'}</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Leverage</p>
                  <p className="text-text-primary font-semibold mt-0.5">1:{account.leverage || 500}</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Account group</p>
                  <p className="text-text-primary font-semibold mt-0.5">{groupLabel}</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Balance</p>
                  <p className="text-text-primary font-semibold mt-0.5 tabular-nums">
                    {(account.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {account.currency || 'USD'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={launchTerminal}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-warning hover:brightness-110 text-black text-sm font-bold py-3 transition-all"
              >
                Open Trading Terminal <ExternalLink size={15} />
              </button>
              <button
                type="button"
                onClick={() => router.push('/accounts')}
                className="px-5 py-3 rounded-lg border border-border-primary text-text-primary text-sm font-semibold hover:bg-bg-hover transition-colors"
              >
                Back to accounts
              </button>
            </div>
          </div>
        )}
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

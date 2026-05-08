'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

interface TradingAccount {
  id: string;
  account_number?: string | number;
  balance?: number;
  currency?: string;
  is_demo?: boolean;
  group_name?: string;
}

interface WalletSummary {
  main_wallet_balance?: number;
  balance?: number;
}

const MAIN_ID = '__main__';

export default function TransferPage() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [mainBalance, setMainBalance] = useState<number>(0);
  const [fromId, setFromId] = useState<string>(MAIN_ID);
  const [toId, setToId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [acctsRes, walletRes] = await Promise.all([
        api.get<TradingAccount[] | { items?: TradingAccount[] }>('/accounts/'),
        api.get<WalletSummary>('/wallet/summary'),
      ]);
      const acctsList = Array.isArray(acctsRes) ? acctsRes : acctsRes?.items ?? [];
      const live = acctsList.filter((a) => !a.is_demo);
      setAccounts(live);
      const v = Number(walletRes.main_wallet_balance ?? walletRes.balance ?? 0);
      setMainBalance(Number.isFinite(v) ? v : 0);
      if (live.length > 0 && !toId) setToId(live[0].id);
    } catch {
      toast.error('Could not load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (fromId === toId) {
      toast.error('Choose different accounts');
      return;
    }
    setBusy(true);
    try {
      if (fromId === MAIN_ID) {
        // Main wallet → trading account
        await api.post('/wallet/transfer-main-to-trading', {
          to_account_id: toId,
          amount: value,
        });
      } else if (toId === MAIN_ID) {
        // Trading account → main wallet
        await api.post('/wallet/transfer-trading-to-main', {
          from_account_id: fromId,
          amount: value,
        });
      } else {
        // Trading ↔ trading
        await api.post('/wallet/transfer-internal', {
          from_account_id: fromId,
          to_account_id: toId,
          amount: value,
        });
      }
      toast.success(`$${value.toLocaleString()} transferred`);
      setAmount('');
      await load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.detail ?? e?.message;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(', ')
          : 'Transfer failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number.isFinite(n) ? n : 0,
    );

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-text-primary tracking-tight">
            Transfer
          </h1>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {accounts.length === 0 && !loading ? (
          <div className="bg-bg-primary border border-border-primary rounded-2xl p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-bg-hover flex items-center justify-center">
              <ArrowRightLeft size={24} className="text-text-tertiary" />
            </div>
            <p className="text-lg font-semibold text-text-primary mb-1">
              You don&apos;t have any active accounts.
            </p>
            <p className="text-sm text-text-secondary mb-4">
              Transactions can only be made with real accounts.
              <br />Please create an account to start depositing and withdrawing.
            </p>
            <a
              href="/accounts"
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-[13px] font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] transition-colors"
            >
              Create New Account
            </a>
          </div>
        ) : (
          <div className="bg-bg-primary border border-border-primary rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">From</label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value={MAIN_ID}>Main wallet · {fmt(mainBalance)} USD</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.account_number ?? a.id.slice(0, 8)} · {fmt(Number(a.balance ?? 0))} {a.currency ?? 'USD'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center pb-1">
                <div className="w-9 h-9 rounded-full border border-border-primary bg-bg-base flex items-center justify-center text-text-tertiary">
                  <ArrowRightLeft size={16} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">To</label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Select account</option>
                  <option value={MAIN_ID}>Main wallet</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === fromId}>
                      #{a.account_number ?? a.id.slice(0, 8)} · {a.currency ?? 'USD'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Amount (USD)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-3 rounded-lg bg-bg-base border border-border-primary text-base text-text-primary tabular-nums focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !toId || !amount}
              className="mt-5 w-full inline-flex items-center justify-center px-5 py-3 rounded-lg text-[14px] font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        )}
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

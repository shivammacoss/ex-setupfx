'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Bitcoin,
  Smartphone,
  Upload,
  RefreshCcw,
  CheckCircle2,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

interface WalletSummary {
  main_wallet_balance?: number;
  balance?: number;
}

const CRYPTOS = [
  { id: 'BTC', label: 'Bitcoin' },
  { id: 'ETH', label: 'Ethereum' },
  { id: 'USDT', label: 'Tether (USDT)' },
  { id: 'USDC', label: 'USD Coin' },
];

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];

type Method = 'crypto' | 'upi';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export default function WithdrawalPage() {
  const [balance, setBalance] = useState(0);
  const [method, setMethod] = useState<Method>('crypto');
  const [amount, setAmount] = useState('');

  const [crypto, setCrypto] = useState(CRYPTOS[0].id);
  const [cryptoAddr, setCryptoAddr] = useState('');

  const [upiId, setUpiId] = useState('');
  const [notes, setNotes] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);

  const loadBalance = useCallback(async () => {
    try {
      const s = await api.get<WalletSummary>('/wallet/summary');
      setBalance(Number(s.main_wallet_balance ?? s.balance ?? 0) || 0);
    } catch {
      setBalance(0);
    }
  }, []);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  const submitCrypto = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!cryptoAddr.trim()) {
      toast.error('Enter your wallet payout address');
      return;
    }
    if (amt > balance) {
      toast.error('Amount exceeds wallet balance');
      return;
    }
    setSubmitting(true);
    try {
      const payout = `[${crypto}] ${cryptoAddr.trim()}`;
      await api.post('/wallet/withdraw', {
        amount: amt,
        method: 'oxapay',
        bank_details: { oxapay_payout: payout },
      });
      toast.success(`Withdrawal of $${amt.toLocaleString()} submitted — pending approval`);
      setAmount('');
      setCryptoAddr('');
      void loadBalance();
    } catch (e: any) {
      toast.error(e?.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submitManual = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amt > balance) {
      toast.error('Amount exceeds wallet balance');
      return;
    }
    if (!upiId.trim() && !qrFile) {
      toast.error('Enter your UPI ID and/or upload a QR code');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('amount', String(amt));
      fd.append('upi_id', upiId.trim());
      fd.append('payout_notes', notes.trim());
      if (qrFile) fd.append('file', qrFile);
      const token = api.getToken();
      const res = await fetch('/api/v1/wallet/withdraw/manual/', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt.slice(0, 200) || `Request failed (${res.status})`);
      }
      toast.success(`Withdrawal of $${amt.toLocaleString()} submitted — pending approval`);
      setAmount('');
      setUpiId('');
      setNotes('');
      setQrFile(null);
      if (fileRef.current) fileRef.current.value = '';
      void loadBalance();
    } catch (e: any) {
      toast.error(e?.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = () => (method === 'crypto' ? void submitCrypto() : void submitManual());

  return (
    <DashboardShell>
      <div className="max-w-4xl">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-semibold text-text-primary tracking-tight">
              Withdrawal
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Withdraw funds from your main wallet to your bank, UPI or crypto address.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBalance()}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        {/* Balance card */}
        <div className="bg-bg-primary border border-border-primary rounded-2xl px-5 py-4 mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Available to withdraw</p>
            <p className="text-[26px] font-semibold text-text-primary tabular-nums leading-tight">${fmt(balance)}</p>
          </div>
          <Link
            href="/wallet/deposit"
            className="text-[13px] font-semibold text-text-secondary hover:text-text-primary underline-offset-4 hover:underline"
          >
            Need to deposit? →
          </Link>
        </div>

        {/* Method tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <MethodTab active={method === 'crypto'} onClick={() => setMethod('crypto')} icon={Bitcoin} label="Crypto" sub="To wallet address" />
          <MethodTab active={method === 'upi'} onClick={() => setMethod('upi')} icon={Smartphone} label="UPI / Bank" sub="Manual payout" />
        </div>

        {/* Form card */}
        <div className="bg-bg-primary border border-border-primary rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Amount */}
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Amount (USD)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-3 rounded-lg bg-bg-base border border-border-primary text-base text-text-primary tabular-nums focus:outline-none focus:border-accent"
            />
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={v > balance}
                  onClick={() => setAmount(String(v))}
                  className="px-3 py-1 rounded-full bg-bg-base border border-border-primary text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ${v}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                disabled={balance <= 0}
                className="px-3 py-1 rounded-full bg-accent/10 border border-accent/40 text-xs font-semibold text-text-primary hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          {/* Method-specific */}
          {method === 'crypto' && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Crypto asset</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CRYPTOS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCrypto(c.id)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                        crypto === c.id
                          ? 'bg-accent/10 border-accent/40 text-text-primary'
                          : 'bg-bg-base border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                      }`}
                    >
                      <div>{c.id}</div>
                      <div className="text-[10px] font-normal text-text-tertiary mt-0.5">{c.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                  Wallet payout address
                </label>
                <input
                  type="text"
                  value={cryptoAddr}
                  onChange={(e) => setCryptoAddr(e.target.value)}
                  placeholder={`Your ${crypto} address`}
                  className="w-full px-3.5 py-3 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
                />
                <p className="text-xs text-text-tertiary mt-2">
                  Triple-check the address — funds sent to the wrong address cannot be recovered.
                </p>
              </div>
            </>
          )}

          {method === 'upi' && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Your UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@bank"
                  className="w-full px-3.5 py-3 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                  UPI QR code (optional)
                </label>
                <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-bg-base border border-dashed border-border-primary cursor-pointer hover:bg-bg-hover transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Upload size={16} className="text-text-tertiary shrink-0" />
                    <span className="text-sm text-text-secondary truncate">
                      {qrFile ? qrFile.name : 'Upload your UPI QR (PNG, JPG)'}
                    </span>
                  </div>
                  {qrFile && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything our finance team should know"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !amount}
            className="w-full inline-flex items-center justify-center px-5 py-3.5 rounded-lg text-[14px] font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit withdrawal'}
          </button>

          <p className="text-[11px] text-text-tertiary text-center">
            Withdrawals are processed within 2–24 hours after approval. Funds will be sent to the destination above.
          </p>
        </div>
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

function MethodTab({
  active,
  onClick,
  icon: Icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-colors ${
        active
          ? 'bg-accent/10 border-accent/40 text-text-primary'
          : 'bg-bg-primary border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
      }`}
    >
      <Icon size={20} className={active ? 'text-accent' : 'text-text-tertiary'} />
      <span className="text-[13px] font-semibold">{label}</span>
      <span className="text-[10px] text-text-tertiary">{sub}</span>
    </button>
  );
}

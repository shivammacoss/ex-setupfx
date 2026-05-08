'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Bitcoin,
  Landmark,
  Smartphone,
  Upload,
  RefreshCcw,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

interface WalletSummary {
  main_wallet_balance?: number;
  balance?: number;
}

interface ManualBankDetails {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  ifsc?: string;
  upi_id?: string;
  qr_code_url?: string;
}

const CRYPTOS = [
  { id: 'BTC', label: 'Bitcoin' },
  { id: 'ETH', label: 'Ethereum' },
  { id: 'USDT', label: 'Tether (USDT)' },
  { id: 'USDC', label: 'USD Coin' },
];

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];

type Method = 'crypto' | 'bank' | 'upi';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export default function DepositPage() {
  const [balance, setBalance] = useState(0);
  const [method, setMethod] = useState<Method>('crypto');
  const [amount, setAmount] = useState('');
  const [crypto, setCrypto] = useState(CRYPTOS[0].id);
  const [bankDetails, setBankDetails] = useState<ManualBankDetails | null>(null);
  const [bankLoading, setBankLoading] = useState(false);

  const [txId, setTxId] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadBalance = useCallback(async () => {
    try {
      const s = await api.get<WalletSummary>('/wallet/summary');
      setBalance(Number(s.main_wallet_balance ?? s.balance ?? 0) || 0);
    } catch {
      setBalance(0);
    }
  }, []);

  const loadBankDetails = useCallback(async () => {
    setBankLoading(true);
    try {
      const amt = parseFloat(amount);
      const body = Number.isFinite(amt) && amt > 0 ? { amount: amt } : {};
      const d = await api.post<ManualBankDetails>('/wallet/deposit/bank-details', body);
      setBankDetails(d && Object.keys(d).length > 0 ? d : null);
    } catch {
      setBankDetails(null);
    } finally {
      setBankLoading(false);
    }
  }, [amount]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    if (method === 'bank' || method === 'upi') void loadBankDetails();
  }, [method, loadBankDetails]);

  const submitCrypto = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ payment_url?: string }>('/wallet/deposit', {
        amount: amt,
        method: 'oxapay',
        crypto,
      });
      if (res.payment_url) {
        toast.success('Redirecting to payment…');
        window.location.href = res.payment_url;
      } else {
        toast.error('Could not create payment link. Try again or contact support.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Deposit failed');
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
    if (!txId.trim()) {
      toast.error('Enter your bank / UPI transaction reference');
      return;
    }
    if (!proof) {
      toast.error('Upload a screenshot of your payment');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('amount', String(amt));
      fd.append('transaction_id', txId.trim());
      fd.append('file', proof);
      const token = api.getToken();
      const res = await fetch('/api/v1/wallet/deposit/manual', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt.slice(0, 200) || `Request failed (${res.status})`);
      }
      toast.success(`Deposit of $${amt.toLocaleString()} submitted — pending approval`);
      setTxId('');
      setProof(null);
      setAmount('');
      if (fileRef.current) fileRef.current.value = '';
      void loadBalance();
    } catch (e: any) {
      toast.error(e?.message || 'Deposit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = () => (method === 'crypto' ? void submitCrypto() : void submitManual());

  const copy = (text: string) => {
    if (!text) return;
    void navigator.clipboard?.writeText(text);
    toast.success('Copied');
  };

  return (
    <DashboardShell>
      <div className="max-w-4xl">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-semibold text-text-primary tracking-tight">
              Deposit
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Fund your main wallet — approved deposits credit instantly to your trading accounts.
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Main wallet</p>
            <p className="text-[26px] font-semibold text-text-primary tabular-nums leading-tight">${fmt(balance)}</p>
          </div>
          <Link
            href="/wallet/withdrawal"
            className="text-[13px] font-semibold text-text-secondary hover:text-text-primary underline-offset-4 hover:underline"
          >
            Need to withdraw? →
          </Link>
        </div>

        {/* Method tabs */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <MethodTab active={method === 'crypto'} onClick={() => setMethod('crypto')} icon={Bitcoin} label="Crypto" sub="Instant" />
          <MethodTab active={method === 'bank'} onClick={() => setMethod('bank')} icon={Landmark} label="Bank transfer" sub="2–24h" />
          <MethodTab active={method === 'upi'} onClick={() => setMethod('upi')} icon={Smartphone} label="UPI / Wallet" sub="Manual" />
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-3 rounded-lg bg-bg-base border border-border-primary text-base text-text-primary tabular-nums focus:outline-none focus:border-accent"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="px-3 py-1 rounded-full bg-bg-base border border-border-primary text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  ${v}
                </button>
              ))}
            </div>
          </div>

          {/* Method-specific */}
          {method === 'crypto' && (
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
              <p className="text-xs text-text-tertiary mt-3">
                You&apos;ll be redirected to our secure crypto payment partner to complete the transfer.
              </p>
            </div>
          )}

          {(method === 'bank' || method === 'upi') && (
            <>
              <div>
                <p className="text-[13px] font-semibold text-text-primary mb-2">
                  {method === 'bank' ? 'Send funds to:' : 'Pay using UPI:'}
                </p>
                {bankLoading ? (
                  <div className="text-sm text-text-tertiary py-4">Loading payout details…</div>
                ) : bankDetails ? (
                  <div className="bg-bg-base border border-border-primary rounded-lg divide-y divide-border-primary">
                    {method === 'bank' && (
                      <>
                        <DetailRow label="Bank" value={bankDetails.bank_name} onCopy={copy} />
                        <DetailRow label="Account name" value={bankDetails.account_name} onCopy={copy} />
                        <DetailRow label="Account number" value={bankDetails.account_number} onCopy={copy} />
                        <DetailRow label="IFSC" value={bankDetails.ifsc} onCopy={copy} />
                      </>
                    )}
                    {method === 'upi' && (
                      <>
                        <DetailRow label="UPI ID" value={bankDetails.upi_id} onCopy={copy} />
                        {bankDetails.qr_code_url && (
                          <div className="p-4 flex items-center gap-4">
                            <img
                              src={bankDetails.qr_code_url}
                              alt="UPI QR"
                              className="w-32 h-32 rounded-lg border border-border-primary bg-white"
                            />
                            <p className="text-xs text-text-secondary">
                              Scan with any UPI app, then enter the transaction reference below.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-text-secondary py-4">
                    Payout details not available. Please contact support.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                  Transaction reference / UTR
                </label>
                <input
                  type="text"
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full px-3.5 py-3 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                  Payment proof (screenshot)
                </label>
                <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-bg-base border border-dashed border-border-primary cursor-pointer hover:bg-bg-hover transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Upload size={16} className="text-text-tertiary shrink-0" />
                    <span className="text-sm text-text-secondary truncate">
                      {proof ? proof.name : 'Click to upload screenshot (PNG, JPG, PDF)'}
                    </span>
                  </div>
                  {proof && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                  />
                </label>
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
            {submitting
              ? 'Submitting…'
              : method === 'crypto'
                ? 'Continue to payment'
                : 'Submit deposit for approval'}
          </button>

          <p className="text-[11px] text-text-tertiary text-center">
            Manual deposits are reviewed within 2–24 hours. Approved funds credit your main wallet automatically.
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

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value?: string;
  onCopy: (v: string) => void;
}) {
  if (!value) return null;
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
        <p className="text-sm text-text-primary truncate font-medium">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => onCopy(value)}
        className="p-1.5 text-text-tertiary hover:text-text-primary rounded-md hover:bg-bg-hover"
        title="Copy"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

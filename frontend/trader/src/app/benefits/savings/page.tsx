'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PiggyBank, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';

interface TradingAccount {
  id: string;
  account_number?: string | number;
  is_demo?: boolean;
  group_name?: string;
}

export default function SavingsPage() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [accountId, setAccountId] = useState<string>('');

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

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-[28px] sm:text-[32px] font-semibold text-text-primary tracking-tight mb-2">
          Savings
        </h1>
        <p className="text-sm text-text-secondary mb-8 max-w-3xl">
          This shows you how much in dollars each trading benefit has saved you by either restoring losses,
          reducing trading costs or protecting you from stop outs.
        </p>

        <div className="max-w-md mb-8">
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-bg-base border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.account_number ?? a.id.slice(0, 8)} · {a.group_name ?? 'Standard'} {a.is_demo ? '(Demo)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-bg-primary border border-border-primary rounded-2xl p-10 text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-bg-hover flex items-center justify-center">
            <PiggyBank size={28} className="text-text-tertiary" />
          </div>
          <h2 className="text-[20px] font-semibold text-text-primary mb-2">
            You don&apos;t have any savings data yet
          </h2>
          <p className="text-sm text-text-secondary mb-5">
            Trade on a real account to see how much you save with StockPip.
          </p>
          <Link
            href="/accounts"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] transition-colors"
          >
            <span>+</span> Open new account
          </Link>
        </div>

        <h2 className="text-[18px] font-semibold text-text-primary tracking-tight mb-4 uppercase">
          Available benefits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BenefitCard
            icon={ShieldCheck}
            title="Negative Balance Protection"
            description="You can never lose more money than you put into your account."
          />
          <BenefitCard
            icon={Sparkles}
            title="Swap-Free"
            description="Swaps do not apply to accounts registered from Islamic countries."
          />
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
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-bg-primary border border-border-primary rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-accent" />
        </div>
        <h3 className="text-[18px] font-semibold text-text-primary leading-tight">{title}</h3>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}

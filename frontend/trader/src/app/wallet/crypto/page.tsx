'use client';

import Link from 'next/link';
import { Bitcoin } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';

export default function CryptoWalletPage() {
  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[28px] sm:text-[32px] font-semibold text-text-primary tracking-tight mb-2">
          Crypto wallet
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Manage your crypto deposits and withdrawals from a single place.
        </p>

        <div className="bg-bg-primary border border-border-primary rounded-2xl p-8">
          <div className="w-14 h-14 rounded-full bg-bg-hover flex items-center justify-center mb-4">
            <Bitcoin size={26} className="text-[#f7931a]" />
          </div>
          <h2 className="text-[22px] font-semibold text-text-primary mb-2 leading-tight">
            Crypto wallet is coming soon to your region.
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-xl">
            For now you can fund your account using crypto via the Deposit page.
            Withdrawals to crypto wallets will be enabled once your KYC is approved.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/wallet/deposit"
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-[13px] font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] transition-colors"
            >
              Deposit crypto
            </Link>
            <Link
              href="/wallet/withdrawal"
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-[13px] font-semibold text-text-primary border border-border-primary hover:bg-bg-hover transition-colors"
            >
              Withdraw
            </Link>
          </div>
        </div>
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

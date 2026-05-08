'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';

function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export default function BalancePill() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchBalance = async () => {
      try {
        const s = await api.get<{ main_wallet_balance?: number; balance?: number }>('/wallet/summary');
        if (cancelled) return;
        const v = Number(s.main_wallet_balance ?? s.balance ?? 0);
        setBalance(Number.isFinite(v) ? v : 0);
      } catch {
        if (!cancelled) setBalance(0);
      }
    };
    void fetchBalance();
    const t = setInterval(() => void fetchBalance(), 45_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="flex items-baseline gap-1 select-none">
      <span className="text-[15px] font-semibold tabular-nums text-text-primary">{formatUsd(balance)}</span>
      <span className="text-[11px] font-medium text-text-tertiary">USD</span>
    </div>
  );
}

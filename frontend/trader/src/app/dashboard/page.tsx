'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPersistedTradingAccountId, tradingTerminalUrl } from '@/lib/tradingNav';

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    const id = getPersistedTradingAccountId();
    if (id) {
      router.replace(tradingTerminalUrl(id, { view: 'watchlist' }));
    } else {
      router.replace('/accounts');
    }
  }, [router]);
  return null;
}

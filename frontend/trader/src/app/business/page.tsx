'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { useReferralModal } from '@/stores/referralModalStore';

export default function BusinessRedirectPage() {
  const router = useRouter();
  const open = useReferralModal((s) => s.open);

  useEffect(() => {
    open();
    router.replace('/dashboard');
  }, [open, router]);

  return (
    <DashboardShell>
      <div className="max-w-md mx-auto py-20 text-center text-sm text-text-tertiary">
        Loading partner program…
      </div>
    </DashboardShell>
  );
}

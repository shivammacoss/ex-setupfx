'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from '@/lib/i18n/I18nContext';
import { UserCircle2 } from 'lucide-react';

export default function KycBanner() {
  const user = useAuthStore((s) => s.user);
  const { t } = useI18n();
  if (!user) return null;

  const status = (user.kyc_status || '').toLowerCase();
  if (status === 'approved' || status === 'verified') return null;

  const handle = user.first_name || user.email?.split('@')[0] || '';

  return (
    <div className="kyc-banner border-b">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="kyc-banner-avatar w-9 h-9 rounded-full flex items-center justify-center shrink-0">
            <UserCircle2 size={20} strokeWidth={1.6} className="kyc-banner-icon" />
          </div>
          <p className="kyc-banner-text text-[14px] sm:text-[15px] leading-snug min-w-0 line-clamp-2 sm:line-clamp-1">
            <span className="font-semibold">{t('banner.hello')}{handle ? ` ${handle}` : ''}.</span>
            <span className="ml-1">{t('banner.fill_details')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Link
            href="/support"
            className="kyc-banner-secondary hidden sm:inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap"
          >
            {t('common.learn_more')}
          </Link>
          <Link
            href="/kyc"
            className="kyc-banner-cta inline-flex items-center px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap"
          >
            {t('common.complete')}
          </Link>
        </div>
      </div>
    </div>
  );
}

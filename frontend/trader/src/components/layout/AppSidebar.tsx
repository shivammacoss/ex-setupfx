'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useShellStore } from '@/stores/shellStore';
import { useReferralModal } from '@/stores/referralModalStore';
import { useI18n } from '@/lib/i18n/I18nContext';
import { cn } from '@/lib/utils';
import SidebarGroup, { type SidebarSubItem } from './SidebarGroup';
import {
  SlidersHorizontal,
  Wallet,
  BarChart3,
  Award,
  Copy,
  LifeBuoy,
  Settings,
  Users,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from 'lucide-react';

interface SoloItem {
  kind: 'solo';
  label: string;
  href: string;
  icon: LucideIcon;
  highlight?: boolean;
}

interface GroupItem {
  kind: 'group';
  label: string;
  icon: LucideIcon;
  items: SidebarSubItem[];
  defaultOpen?: boolean;
}

type NavItem = SoloItem | GroupItem;

interface RawSubItem { labelKey: string; href: string; external?: boolean; badgeKey?: string }
interface RawSoloItem { kind: 'solo'; labelKey: string; href: string; icon: LucideIcon; highlight?: boolean }
interface RawGroupItem { kind: 'group'; labelKey: string; icon: LucideIcon; items: RawSubItem[]; defaultOpen?: boolean }
type RawNavItem = RawSoloItem | RawGroupItem;

const NAV_RAW: RawNavItem[] = [
  {
    kind: 'group',
    labelKey: 'nav.trading',
    icon: SlidersHorizontal,
    defaultOpen: true,
    items: [
      { labelKey: 'nav.my_accounts', href: '/accounts' },
      { labelKey: 'nav.performance', href: '/trading/performance' },
      { labelKey: 'nav.history_of_orders', href: '/trading/history' },
      { labelKey: 'nav.ex_setup_terminal', href: '/trading/terminal' },
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.payments_wallet',
    icon: Wallet,
    items: [
      { labelKey: 'nav.deposit', href: '/wallet/deposit' },
      { labelKey: 'nav.withdrawal', href: '/wallet/withdrawal' },
      { labelKey: 'nav.transfer', href: '/wallet/transfer', badgeKey: 'common.new' },
      { labelKey: 'nav.transaction_history', href: '/transactions' },
      { labelKey: 'nav.crypto_wallet', href: '/wallet/crypto' },
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.analytics',
    icon: BarChart3,
    items: [
      { labelKey: 'nav.analyst_views', href: '/analytics/views' },
      { labelKey: 'nav.market_news', href: '/news' },
      { labelKey: 'nav.economic_calendar', href: 'https://www.investing.com/economic-calendar/', external: true },
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.benefits',
    icon: Award,
    items: [
      { labelKey: 'nav.trading_conditions', href: '/benefits/conditions' },
      { labelKey: 'nav.savings', href: '/benefits/savings' },
      { labelKey: 'nav.vps', href: '/benefits/vps' },
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.copy_trading',
    icon: Copy,
    items: [
      { labelKey: 'nav.mam', href: '/social' },
      { labelKey: 'nav.pamm', href: '/pamm' },
    ],
  },
  { kind: 'solo', labelKey: 'nav.support_hub', href: '/support', icon: LifeBuoy, highlight: true },
  {
    kind: 'group',
    labelKey: 'nav.settings',
    icon: Settings,
    items: [
      { labelKey: 'nav.profile', href: '/profile' },
      { labelKey: 'nav.kyc_verification', href: '/kyc' },
    ],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleSidebarCollapsed } = useShellStore();
  const openReferralModal = useReferralModal((s) => s.open);
  const { t } = useI18n();

  const NAV: NavItem[] = NAV_RAW.map((it) => {
    if (it.kind === 'group') {
      return {
        kind: 'group',
        label: t(it.labelKey),
        icon: it.icon,
        defaultOpen: it.defaultOpen,
        items: it.items.map((s) => ({
          label: t(s.labelKey),
          href: s.href,
          external: s.external,
          ...(s.badgeKey ? { badge: t(s.badgeKey) } : {}),
        })),
      };
    }
    return { kind: 'solo', label: t(it.labelKey), href: it.href, icon: it.icon, highlight: it.highlight };
  });

  const closeOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
  };

  // Mobile (< lg): collapsed mode is ignored — sidebar is always full width when open
  // Desktop (>= lg): collapsed shrinks the sidebar to an icon-only rail
  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[65] lg:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          // Sits BELOW the 60px top header (which is always visible across the full width).
          'fixed top-[60px] left-0 z-[70] h-[calc(100dvh-60px)] flex flex-col overflow-hidden transition-[transform,width] duration-200',
          'bg-bg-base border-r border-border-primary',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // On mobile, always 280px when open. On desktop, collapse to 72px.
          sidebarCollapsed ? 'w-[280px] lg:w-[72px]' : 'w-[280px]',
        )}
      >

        {/* Nav */}
        <nav
          className={cn(
            'flex-1 min-h-0 overflow-y-auto overscroll-contain py-2 sidebar-scroll',
            sidebarCollapsed ? 'lg:px-2 px-2' : 'px-2',
          )}
        >
          {NAV.map((item) => {
            if (item.kind === 'group') {
              return (
                <SidebarGroup
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  items={item.items}
                  pathname={pathname}
                  defaultOpen={item.defaultOpen}
                  collapsed={sidebarCollapsed}
                  onNavigate={closeOnMobile}
                />
              );
            }

            const itemPath = item.href.split('?')[0];
            const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`);

            if (sidebarCollapsed) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  onClick={closeOnMobile}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 mx-auto mb-1 rounded-lg transition-colors',
                    isActive
                      ? 'bg-accent/10 text-text-primary'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                  )}
                >
                  <item.icon size={18} strokeWidth={1.85} />
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeOnMobile}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors mb-1',
                  isActive
                    ? 'bg-accent/10 text-text-primary'
                    : 'text-text-primary hover:bg-bg-hover',
                )}
              >
                <item.icon size={17} strokeWidth={1.85} className="shrink-0 text-text-secondary" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Refer card — opens the referral modal */}
        <div className={cn('pb-3 pt-2', sidebarCollapsed ? 'lg:px-2 px-3' : 'px-3')}>
          <button
            type="button"
            onClick={() => { openReferralModal(); closeOnMobile(); }}
            title={t('nav.refer_earn')}
            className={cn(
              'refer-card w-full flex items-center rounded-xl transition-colors text-left border',
              sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2 px-3.5 py-3 gap-3' : 'gap-3 px-3.5 py-3',
            )}
          >
            <div className="refer-card-avatar w-9 h-9 rounded-full flex items-center justify-center shrink-0">
              <Users size={17} strokeWidth={1.85} className="refer-card-icon" />
            </div>
            <span
              className={cn(
                'refer-card-text text-[13px] font-semibold leading-tight',
                sidebarCollapsed && 'lg:hidden',
              )}
            >
              {t('nav.refer_earn')}
            </span>
          </button>
        </div>

        {/* Collapse / expand footer (desktop only) */}
        <div className="hidden lg:flex items-center justify-center border-t border-border-primary py-2.5">
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-text-tertiary hover:text-text-primary p-1.5 rounded-md hover:bg-bg-hover transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronsRight size={18} strokeWidth={1.75} />
            ) : (
              <ChevronsLeft size={18} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

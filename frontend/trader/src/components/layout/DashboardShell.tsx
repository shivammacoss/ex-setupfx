'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useShellStore } from '@/stores/shellStore';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import KycBanner from './KycBanner';
import ReferralModal from '@/components/referral/ReferralModal';

export default function DashboardShell({
  children,
  className,
  mainClassName,
}: {
  children: React.ReactNode;
  className?: string;
  mainClassName?: string;
}) {
  const { sidebarOpen, sidebarCollapsed } = useShellStore();
  const pathname = usePathname();

  // Trading terminal keeps its own dark/full-screen layout — bypass shell chrome there
  const isTerminal = pathname?.startsWith('/trading/terminal');

  return (
    <div
      className={cn(
        'h-[100dvh] flex flex-col overflow-hidden pb-[70px] lg:pb-0 bg-bg-base text-text-primary',
        className,
      )}
    >
      {/* Top header — full width, always visible */}
      <AppHeader />

      {/* Below header: sidebar (left) + main content (right) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <AppSidebar />
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col bg-bg-base transition-[margin] duration-200',
            sidebarOpen && (sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[280px]'),
          )}
        >
          {!isTerminal && <KycBanner />}
          <main
            key={pathname}
            className={cn(
              'dashboard-main-scroll min-h-0 flex-1 overflow-y-auto bg-bg-base page-fade-in',
              isTerminal ? '' : 'p-3 sm:p-5 md:p-8',
              mainClassName,
            )}
          >
            {children}
          </main>
        </div>
      </div>

      {!isTerminal && (
        <Link
          href="/support"
          className="fixed bottom-20 md:bottom-6 right-6 z-[75] w-12 h-12 rounded-full bg-[#ffe600] hover:bg-[#f5dc00] shadow-lg flex items-center justify-center transition-colors"
          aria-label="Support"
        >
          <MessageSquare size={20} className="text-text-primary" />
        </Link>
      )}

      <ReferralModal />
    </div>
  );
}

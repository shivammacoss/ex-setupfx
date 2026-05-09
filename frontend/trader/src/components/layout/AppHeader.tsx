'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useShellStore } from '@/stores/shellStore';
import { useAuthStore } from '@/stores/authStore';
import { NotificationBell } from '@/components/NotificationListener';
import { Menu, ChevronDown } from 'lucide-react';
import BalancePill from './BalancePill';
import LanguageSwitcher from './LanguageSwitcher';
import HelpButton from './HelpButton';
import AppLauncher from './AppLauncher';

export default function AppHeader() {
  const { toggleSidebar } = useShellStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handle = user?.first_name
    ? [user.first_name, user.last_name].filter(Boolean).join(' ')
    : user?.email
      ? user.email.split('@')[0]
      : 'Trader';
  const initials = user
    ? (
        user.first_name?.[0] && user.last_name?.[0]
          ? `${user.first_name[0]}${user.last_name[0]}`
          : user.first_name?.[0] || user.email?.[0] || 'U'
      ).toUpperCase()
    : 'U';

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    if (userMenuOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [userMenuOpen]);

  // Show "Deposit" CTA only on terminal page (matches Exness)
  const showDepositCta = pathname?.startsWith('/trading/terminal');

  return (
    <header className="h-[60px] flex items-center justify-between px-3 sm:px-6 bg-bg-primary border-b border-border-primary shrink-0">
      {/* LEFT — mobile menu toggle + StockPip brand (always visible across the full top bar) */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} strokeWidth={1.85} />
        </button>
        <Link href="/accounts" className="flex items-center select-none">
          <span className="font-bold tracking-tight text-text-primary text-[22px]">StockPip</span>
        </Link>
      </div>

      {/* RIGHT — balance, lang, help, bell, launcher, profile, deposit */}
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden sm:flex items-center px-3">
          <BalancePill />
        </div>

        <LanguageSwitcher />
        <HelpButton />
        <NotificationBell />
        <AppLauncher />

        {/* Profile */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-1 py-1 rounded-full hover:bg-bg-hover transition-colors"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent text-[11px] font-bold uppercase">
              {initials}
            </div>
            <ChevronDown size={13} className="text-text-tertiary hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-bg-primary border border-border-primary rounded-xl py-2 z-50 shadow-xl">
              <div className="px-4 pb-2 mb-1 border-b border-border-primary">
                <p className="text-sm font-semibold text-text-primary truncate">{handle}</p>
                <p className="text-xs text-text-tertiary truncate">{user?.email}</p>
              </div>
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                Profile & Settings
              </Link>
              <Link
                href="/kyc"
                className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                KYC Verification
              </Link>
              <Link
                href="/wallet/deposit"
                className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                Deposit
              </Link>
              <div className="border-t border-border-primary my-1" />
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                  router.push('/auth/login');
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {showDepositCta && (
          <Link
            href="/wallet/deposit"
            className="ml-1 sm:ml-2 inline-flex items-center px-4 sm:px-5 py-2 rounded-lg text-[13px] font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] transition-colors"
          >
            Deposit
          </Link>
        )}
      </div>
    </header>
  );
}

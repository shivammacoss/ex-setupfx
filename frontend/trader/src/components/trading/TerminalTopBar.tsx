'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, X, ChevronDown, Bell, LogOut } from 'lucide-react';
import { useTradingStore } from '@/stores/tradingStore';
import { useAuthStore } from '@/stores/authStore';
import { getDigits } from '@/lib/utils';
import AddSymbolPopup from './AddSymbolPopup';

interface Props {
  chartTabs: string[];
  onSelectTab: (symbol: string) => void;
  onCloseTab: (symbol: string) => void;
  /** Called when the user picks a new symbol from the + popup. */
  onAddSymbol: (symbol: string) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export default function TerminalTopBar({ chartTabs, onSelectTab, onCloseTab, onAddSymbol }: Props) {
  const router = useRouter();
  const { selectedSymbol, activeAccount, accounts, instruments } = useTradingStore();
  const { user, logout } = useAuthStore();

  const [profileOpen, setProfileOpen] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addAnchorLeft, setAddAnchorLeft] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);
  const accRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (accRef.current && !accRef.current.contains(e.target as Node)) setAccOpen(false);
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) setAppsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const isDemo = !!activeAccount?.is_demo;
  const balance = Number(activeAccount?.balance ?? 0);
  const currency = activeAccount?.currency ?? 'USD';
  const groupName =
    activeAccount?.account_group?.name ??
    (isDemo ? 'Standard' : 'Standard');

  const initials = user
    ? (user.first_name?.[0] && user.last_name?.[0]
        ? `${user.first_name[0]}${user.last_name[0]}`
        : user.first_name?.[0] || user.email?.[0] || 'U'
      ).toUpperCase()
    : 'U';

  const openAddPopup = () => {
    if (addBtnRef.current && headerRef.current) {
      const btn = addBtnRef.current.getBoundingClientRect();
      const head = headerRef.current.getBoundingClientRect();
      // anchor under the + button, slightly inset from the left edge
      setAddAnchorLeft(Math.max(8, btn.left - head.left - 8));
    }
    setAddOpen((v) => !v);
  };

  return (
    <header ref={headerRef} className="shrink-0 h-[56px] relative flex items-stretch bg-bg-base border-b border-border-primary">
      {/* Left — brand */}
      <Link
        href="/accounts"
        className="flex items-center px-4 sm:px-5 select-none"
      >
        <span className="text-[22px] font-bold tracking-tight">
          <span className="text-[#ffe600]">Stock</span>
          <span className="text-text-primary">Pip</span>
        </span>
      </Link>

      {/* Symbol tabs */}
      <div className="flex items-stretch overflow-x-auto no-scrollbar">
        {chartTabs.map((symbol) => {
          const inst = instruments.find((i) => i.symbol === symbol);
          const isActive = symbol === selectedSymbol;
          return (
            <div
              key={symbol}
              className={`relative flex items-center gap-2 px-4 cursor-pointer group ${
                isActive ? 'bg-text-primary/[0.04]' : 'hover:bg-text-primary/[0.03]'
              }`}
              onClick={() => onSelectTab(symbol)}
            >
              <SymbolDot symbol={symbol} />
              <span className="text-[13px] font-semibold text-text-primary tracking-tight">
                {inst?.display_name || symbol}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(symbol);
                }}
                aria-label={`Close ${symbol}`}
                className="text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={13} strokeWidth={2.4} />
              </button>
              {isActive && (
                <span className="absolute left-3 right-3 bottom-0 h-[2px] bg-[#ffaa00] rounded-t" />
              )}
            </div>
          );
        })}
        <button
          ref={addBtnRef}
          type="button"
          onClick={openAddPopup}
          className={`flex items-center justify-center px-4 transition-colors ${
            addOpen
              ? 'bg-text-primary/[0.06] text-text-primary border border-text-primary/10 -mb-px'
              : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/[0.03]'
          }`}
          aria-label="Add symbol"
        >
          <Plus size={18} strokeWidth={1.85} />
        </button>
      </div>

      {/* Add-symbol popup — anchored under the + button */}
      <AddSymbolPopup
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSelect={(sym) => onAddSymbol(sym)}
        existingTabs={chartTabs}
        anchorLeft={addAnchorLeft}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Account / balance pill */}
      <div className="relative flex items-center" ref={accRef}>
        <button
          type="button"
          onClick={() => setAccOpen((v) => !v)}
          className="flex flex-col items-end px-3 py-1 hover:bg-text-primary/[0.03] transition-colors h-full justify-center"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
            <span className={`px-1.5 py-px rounded ${isDemo ? 'bg-white/15 text-white/80' : 'bg-warning text-black'}`}>
              {isDemo ? 'Demo' : 'Real'}
            </span>
            <span className="text-text-secondary">{groupName}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[14px] font-semibold text-text-primary tabular-nums">{fmt(balance)}</span>
            <span className="text-[10px] text-text-tertiary">{currency}</span>
            <ChevronDown size={11} className="text-text-tertiary" />
          </div>
        </button>
        {accOpen && accounts.length > 0 && (
          <div className="absolute right-0 top-full mt-1 w-72 bg-bg-primary border border-border-primary rounded-lg py-1 z-50 shadow-2xl">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Switch account
            </p>
            {accounts.map((a) => (
              <Link
                key={a.id}
                href={`/trading/terminal?account=${a.id}`}
                onClick={() => setAccOpen(false)}
                className={`block px-3 py-2 text-[13px] hover:bg-bg-hover ${
                  a.id === activeAccount?.id ? 'bg-bg-hover' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-text-primary font-semibold">#{a.account_number}</span>
                  <span className={`text-[10px] px-1.5 py-px rounded ${a.is_demo ? 'bg-text-primary/10 text-text-secondary' : 'bg-warning/25 text-warning'}`}>
                    {a.is_demo ? 'Demo' : 'Real'}
                  </span>
                </div>
                <div className="text-[11px] text-text-tertiary mt-0.5 tabular-nums">
                  {fmt(Number(a.balance) || 0)} {a.currency || 'USD'}
                </div>
              </Link>
            ))}
            <div className="border-t border-border-primary mt-1 pt-1">
              <Link
                href="/accounts"
                onClick={() => setAccOpen(false)}
                className="block px-3 py-2 text-[12px] text-warning hover:bg-bg-hover"
              >
                Manage accounts
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <Link
        href="/profile"
        className="w-11 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-text-primary/[0.03] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.85} />
      </Link>

      {/* App launcher */}
      <div className="relative flex items-center" ref={appsRef}>
        <button
          type="button"
          onClick={() => setAppsOpen((v) => !v)}
          className="w-11 h-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-text-primary/[0.03] transition-colors"
          aria-label="App launcher"
        >
          <GridIcon />
        </button>
        {appsOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-bg-primary border border-border-primary rounded-lg py-1 z-50 shadow-2xl">
            <AppLink href="/accounts" label="My accounts" onClick={() => setAppsOpen(false)} />
            <AppLink href="/trading/performance" label="Performance" onClick={() => setAppsOpen(false)} />
            <AppLink href="/trading/history" label="History of orders" onClick={() => setAppsOpen(false)} />
            <AppLink href="/wallet/deposit" label="Deposit" onClick={() => setAppsOpen(false)} />
            <AppLink href="/wallet/withdrawal" label="Withdrawal" onClick={() => setAppsOpen(false)} />
            <AppLink href="/social" label="Copy Trading" onClick={() => setAppsOpen(false)} />
            <AppLink href="/news" label="Market News" onClick={() => setAppsOpen(false)} />
            <AppLink href="/support" label="Support hub" onClick={() => setAppsOpen(false)} />
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative flex items-center" ref={profileRef}>
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="w-11 h-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-text-primary/[0.03] transition-colors"
          aria-label="Profile"
        >
          <span className="w-7 h-7 rounded-full border border-border-primary flex items-center justify-center text-[11px] font-semibold text-text-secondary">
            {initials}
          </span>
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-bg-primary border border-border-primary rounded-lg py-1 z-50 shadow-2xl">
            <div className="px-3 py-2 border-b border-border-primary">
              <p className="text-[13px] font-semibold text-text-primary truncate">
                {user?.first_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-[11px] text-text-tertiary truncate">{user?.email}</p>
            </div>
            <Link
              href="/profile"
              onClick={() => setProfileOpen(false)}
              className="block px-3 py-2 text-[13px] text-text-primary hover:bg-bg-hover"
            >
              Profile & Settings
            </Link>
            <Link
              href="/accounts"
              onClick={() => setProfileOpen(false)}
              className="block px-3 py-2 text-[13px] text-text-primary hover:bg-bg-hover"
            >
              My accounts
            </Link>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                logout();
                router.push('/auth/login');
              }}
              className="w-full text-left px-3 py-2 text-[13px] text-red-400 hover:bg-bg-hover inline-flex items-center gap-2"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        )}
      </div>

      {/* Deposit CTA */}
      <Link
        href="/wallet/deposit"
        className="flex items-center px-6 ml-1 my-1.5 mr-2 rounded-md bg-bg-hover hover:bg-bg-secondary text-text-primary text-[14px] font-semibold transition-colors"
      >
        Deposit
      </Link>
    </header>
  );
}

function AppLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 text-[13px] text-text-primary hover:bg-bg-hover"
    >
      {label}
    </Link>
  );
}

function SymbolDot({ symbol }: { symbol: string }) {
  const u = symbol.toUpperCase();
  const color =
    u.startsWith('BTC') ? '#f7931a'
    : u.startsWith('ETH') ? '#627eea'
    : u.startsWith('XAU') ? '#ffd700'
    : u.startsWith('XAG') ? '#c0c0c0'
    : u.startsWith('USOIL') || u.includes('OIL') ? '#444'
    : u.startsWith('NAS') || u.startsWith('US') || u.startsWith('USTEC') ? '#1a73e8'
    : '#22c55e';
  return (
    <span
      className="inline-flex w-5 h-5 rounded-full items-center justify-center text-[9px] font-bold"
      style={{ backgroundColor: `${color}33`, color }}
    >
      {u.slice(0, 1)}
    </span>
  );
}

/** Sell / Buy price buttons in the top bar. Clicking sets selectedSymbol
 *  (which opens the side OrderPanel). Prices update live from the store. */
function TopBarSellBuy() {
  const { selectedSymbol, prices, setSelectedSymbol } = useTradingStore();
  const tick = prices[selectedSymbol];
  const digits = getDigits(selectedSymbol);
  const sellPrice = tick?.bid ?? 0;
  const buyPrice = tick?.ask ?? 0;
  const spread = tick ? Math.abs(buyPrice - sellPrice) : 0;
  const spreadPips = spread * Math.pow(10, digits >= 3 ? digits - 1 : digits);

  if (!selectedSymbol) return null;

  return (
    <div className="flex items-center gap-0 mx-2 my-auto shrink-0">
      <button
        type="button"
        onClick={() => setSelectedSymbol(selectedSymbol)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-l bg-[#ef4444] hover:bg-[#dc2626] text-white text-[12px] font-bold tabular-nums transition-colors"
      >
        <span className="text-[10px] font-semibold opacity-80">Sell</span>
        <span>{tick ? sellPrice.toFixed(digits) : '—'}</span>
      </button>
      <span className="px-1.5 py-1.5 bg-bg-primary text-[10px] text-text-tertiary font-mono tabular-nums">
        {spreadPips.toFixed(1)}
      </span>
      <button
        type="button"
        onClick={() => setSelectedSymbol(selectedSymbol)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-r bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-bold tabular-nums transition-colors"
      >
        <span className="text-[10px] font-semibold opacity-80">Buy</span>
        <span>{tick ? buyPrice.toFixed(digits) : '—'}</span>
      </button>
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="5" r="1.6" />
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="19" cy="5" r="1.6" />
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
      <circle cx="5" cy="19" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
      <circle cx="19" cy="19" r="1.6" />
    </svg>
  );
}

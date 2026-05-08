'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  Wallet,
  BarChart3,
  Copy,
  Newspaper,
  LifeBuoy,
  Settings,
  Award,
  TrendingUp,
} from 'lucide-react';

const APPS = [
  { label: 'My accounts', href: '/accounts', icon: LayoutGrid, color: '#22c55e' },
  { label: 'Deposit', href: '/wallet/deposit', icon: Wallet, color: '#0ea5e9' },
  { label: 'Performance', href: '/trading/performance', icon: BarChart3, color: '#8b5cf6' },
  { label: 'Copy Trading', href: '/social', icon: Copy, color: '#f59e0b' },
  { label: 'Market News', href: '/news', icon: Newspaper, color: '#ef4444' },
  { label: 'Benefits', href: '/benefits/conditions', icon: Award, color: '#ec4899' },
  { label: 'Terminal', href: '/trading/terminal', icon: TrendingUp, color: '#14b8a6' },
  { label: 'Support', href: '/support', icon: LifeBuoy, color: '#0284c7' },
  { label: 'Settings', href: '/profile', icon: Settings, color: '#6b7280' },
];

export default function AppLauncher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        aria-label="App launcher"
      >
        <GridIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-bg-primary border border-border-primary rounded-2xl p-3 z-50 shadow-2xl">
          <div className="grid grid-cols-3 gap-2">
            {APPS.map((app) => {
              const Icon = app.icon;
              return (
                <Link
                  key={app.href}
                  href={app.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-bg-hover transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${app.color}15` }}
                  >
                    <Icon size={19} strokeWidth={1.85} style={{ color: app.color }} />
                  </div>
                  <span className="text-[11px] font-medium text-text-primary text-center leading-tight">
                    {app.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarSubItem {
  label: string;
  href: string;
  badge?: string;
  external?: boolean;
}

interface SidebarGroupProps {
  label: string;
  icon?: LucideIcon;
  items: SidebarSubItem[];
  pathname: string;
  defaultOpen?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export default function SidebarGroup({
  label,
  icon: Icon,
  items,
  pathname,
  defaultOpen = false,
  collapsed = false,
  onNavigate,
}: SidebarGroupProps) {
  const isAnyActive = items.some((item) => {
    const path = item.href.split('?')[0];
    return pathname === path || pathname.startsWith(`${path}/`);
  });
  const [open, setOpen] = useState(defaultOpen || isAnyActive);

  useEffect(() => {
    if (isAnyActive) setOpen(true);
  }, [isAnyActive]);

  // Collapsed (icon-only rail): show just the group icon — clicking it goes to
  // the group's first item; users get the full nav back when they expand the
  // sidebar. Matches Exness's collapsed behavior.
  if (collapsed) {
    if (!Icon) return null;
    const first = items[0];
    const target = first?.href ?? '#';
    return (
      <Link
        href={target}
        title={label}
        onClick={onNavigate}
        className={cn(
          'flex items-center justify-center w-10 h-10 mx-auto mb-1 rounded-lg transition-colors',
          isAnyActive ? 'bg-accent/10 text-text-primary' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
        )}
      >
        <Icon size={18} strokeWidth={1.85} />
      </Link>
    );
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors',
          'text-text-primary hover:bg-bg-hover',
        )}
      >
        <span className="flex items-center gap-2.5">
          {Icon && <Icon size={17} strokeWidth={1.85} className="shrink-0 text-text-secondary" />}
          <span>{label}</span>
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={cn('shrink-0 text-text-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map((item) => {
            const itemPath = item.href.split('?')[0];
            const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`);
            const linkClass = cn(
              'flex items-center justify-between gap-2 pl-10 pr-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
              isActive
                ? 'bg-accent/10 text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
            );

            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                  onClick={onNavigate}
                >
                  <span className="truncate">{item.label}</span>
                  <ExternalIcon />
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass}
                onClick={onNavigate}
              >
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#e7f0ff] text-[#1a6dff] border border-[#cfe1ff]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-tertiary">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

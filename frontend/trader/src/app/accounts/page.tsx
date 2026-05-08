'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import {
  ChevronDown,
  ChevronUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  TrendingUp,
  MoreVertical,
  Plus,
  LayoutGrid,
  List,
  ArrowUpDown,
  Info,
  RefreshCcw,
  Trash2,
  X,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';
import { prefetchAccountGroups } from '@/lib/tradingNav';
import { useTradingStore, type TradingAccount, type AccountGroupInfo } from '@/stores/tradingStore';
import { setPersistedTradingAccountId, tradingTerminalUrl } from '@/lib/tradingNav';

interface AccountRow {
  id: string;
  account_number: string | number;
  balance: number;
  credit?: number;
  equity?: number;
  margin_used?: number;
  free_margin?: number;
  margin_level?: number;
  leverage: number;
  currency: string;
  is_demo: boolean;
  is_active?: boolean;
  archived?: boolean;
  account_group?: AccountGroupInfo | null;
  group_name?: string;
  platform?: string;
  created_at?: string;
  archived_at?: string | null;
}

function fmtMoneyParts(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  const [intPart, decPart = '00'] = Math.abs(safe)
    .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .split('.');
  return { sign: safe < 0 ? '-' : '', intPart, decPart };
}

function fmtArchivedDate(s?: string | null) {
  if (!s) return '';
  try {
    const d = new Date(s);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

function toTradingAccount(row: AccountRow): TradingAccount {
  return {
    id: row.id,
    account_number: String(row.account_number ?? ''),
    balance: row.balance ?? 0,
    credit: row.credit ?? 0,
    equity: row.equity ?? row.balance ?? 0,
    margin_used: row.margin_used ?? 0,
    free_margin: row.free_margin ?? row.balance ?? 0,
    margin_level: row.margin_level ?? 0,
    leverage: row.leverage ?? 100,
    currency: row.currency ?? 'USD',
    is_demo: !!row.is_demo,
    account_group: row.account_group ?? null,
  };
}

export default function AccountsPage() {
  const router = useRouter();
  const setStoreAccounts = useTradingStore((s) => s.setAccounts);

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'real' | 'demo'>('real');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'balance'>('newest');
  const [showArchived, setShowArchived] = useState(true);

  const loadGen = useRef(0);

  const fetchAccounts = useCallback(async (signal?: AbortSignal) => {
    const id = ++loadGen.current;
    setLoading(true);
    try {
      const res = await api.get<unknown>('/accounts', undefined, { signal });
      if (id !== loadGen.current) return;
      const list: AccountRow[] = Array.isArray(res)
        ? (res as AccountRow[])
        : ((res as { items?: AccountRow[] })?.items ?? []);
      setRows(list);
      setStoreAccounts(list.map(toTradingAccount));
    } catch (e) {
      if (id !== loadGen.current) return;
      const msg = e instanceof Error ? e.message : 'Failed to load accounts';
      toast.error(msg);
    } finally {
      if (id === loadGen.current) setLoading(false);
    }
  }, [setStoreAccounts]);

  useEffect(() => {
    const ac = new AbortController();
    void fetchAccounts(ac.signal);
    // Warm the open-account groups cache while the user looks at My accounts —
    // makes the next click feel instant.
    prefetchAccountGroups();
    return () => {
      ac.abort();
      loadGen.current += 1;
    };
  }, [fetchAccounts]);

  const isArchived = (a: AccountRow) =>
    a.archived === true || a.is_active === false || !!a.archived_at;

  const active = useMemo(() => rows.filter((a) => !isArchived(a)), [rows]);
  const archived = useMemo(() => rows.filter((a) => isArchived(a)), [rows]);

  const visible = useMemo(() => {
    let list = active.filter((a) => (tab === 'real' ? !a.is_demo : a.is_demo));
    if (sort === 'newest') {
      list = [...list].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    } else if (sort === 'oldest') {
      list = [...list].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
    } else if (sort === 'balance') {
      list = [...list].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));
    }
    return list;
  }, [active, tab, sort]);

  const goToTrade = (a: AccountRow) => {
    setPersistedTradingAccountId(a.id);
    router.push(tradingTerminalUrl(a.id));
  };

  const archive = async (a: AccountRow) => {
    if (!confirm(`Archive account #${a.account_number}? You can restore it later.`)) return;
    try {
      await api.delete(`/accounts/${a.id}`);
      toast.success('Account archived');
      void fetchAccounts();
    } catch (e: any) {
      toast.error(e?.message || 'Could not archive');
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto">
        {/* Heading + Open account */}
        <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
          <h1 className="text-[22px] sm:text-[34px] font-semibold text-text-primary tracking-tight">
            My accounts
          </h1>
          <button
            type="button"
            onClick={() => router.push('/trading/open-account')}
            onMouseEnter={prefetchAccountGroups}
            onFocus={prefetchAccountGroups}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-[13px] font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors whitespace-nowrap"
          >
            <Plus size={14} strokeWidth={2} />
            <span className="hidden xs:inline sm:inline">Open account</span>
            <span className="xs:hidden sm:hidden">Open</span>
          </button>
        </div>

        {/* Tabs + Sort + View */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-5">
          <div className="inline-flex items-center bg-bg-base border border-border-primary rounded-lg p-1 shrink-0">
            {(['real', 'demo'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={clsx(
                  'px-3 sm:px-5 py-1.5 rounded-md text-[12px] sm:text-[13px] font-semibold transition-colors capitalize',
                  tab === t
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="appearance-none pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 rounded-lg bg-bg-base border border-border-primary text-[12px] sm:text-sm font-medium text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="balance">Balance</option>
              </select>
              <ArrowUpDown size={13} className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            </div>
            <div className="hidden sm:inline-flex items-center bg-bg-base border border-border-primary rounded-lg p-1">
              <button
                type="button"
                onClick={() => setView('list')}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  view === 'list' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
                )}
                aria-label="List view"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  view === 'grid' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
                )}
                aria-label="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Account list */}
        {loading ? (
          <div className="bg-bg-primary border border-border-primary rounded-2xl p-10 text-center text-text-tertiary text-sm">
            Loading accounts…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            kind={tab}
            onOpen={() => router.push('/trading/open-account')}
          />
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map((a) => (
              <AccountCard key={a.id} account={a} compact onTrade={() => goToTrade(a)} onArchive={() => void archive(a)} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((a) => (
              <AccountCard key={a.id} account={a} onTrade={() => goToTrade(a)} onArchive={() => void archive(a)} />
            ))}
          </div>
        )}

        {/* Archived accounts */}
        {archived.length > 0 && (
          <div className="mt-10 sm:mt-12">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="flex items-center gap-2 text-[18px] sm:text-[26px] font-semibold text-text-primary tracking-tight min-w-0">
                <span className="truncate">Archived</span>
                <span title="Accounts archived for inactivity. Funds and history are preserved." className="shrink-0">
                  <Info size={15} className="text-text-tertiary" />
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[12px] sm:text-sm font-semibold text-text-primary border border-border-primary bg-bg-base hover:bg-bg-hover transition-colors"
              >
                {showArchived ? 'Hide' : 'Show'}
                {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showArchived && (
              <div className="space-y-4">
                {archived.map((a) => (
                  <ArchivedCard key={a.id} account={a} onRestore={() => void fetchAccounts()} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <LegalFooter />
    </DashboardShell>
  );
}

/* ─── Account card (active) ─── */

function AccountCard({
  account,
  onTrade,
  onArchive,
  compact,
}: {
  account: AccountRow;
  onTrade: () => void;
  onArchive: () => void;
  compact?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const groupLabel = account.group_name ?? account.account_group?.name ?? 'Standard';
  const platform = (account.platform ?? 'Exness').toUpperCase();
  const { sign, intPart, decPart } = fmtMoneyParts(account.balance ?? 0);
  const leverage = account.leverage ?? 2000;
  const freeMargin = account.free_margin ?? account.balance ?? 0;
  const equity = account.equity ?? account.balance ?? 0;
  const floatingPL = (account.equity ?? account.balance ?? 0) - (account.balance ?? 0);

  return (
    <div className="bg-bg-primary border border-border-primary rounded-2xl px-4 sm:px-5 py-4">
      {/* Top: badges + number + group + chevron */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <Badge>{account.is_demo ? 'Demo' : 'Real'}</Badge>
          <Badge>{platform}</Badge>
          <Badge>{groupLabel}</Badge>
          <span className="text-[13px] sm:text-[15px] font-semibold text-text-primary ml-0.5 sm:ml-1">
            # {account.account_number}
          </span>
          <span className="hidden sm:inline text-[15px] text-text-secondary">{groupLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-text-tertiary hover:text-text-primary p-1 -mr-1 transition-transform"
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Balance */}
      <div className={clsx('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-3', compact && 'sm:flex-wrap')}>
        <div className="flex items-baseline gap-1 tabular-nums">
          <span className="text-[32px] sm:text-[44px] font-semibold text-text-primary leading-none">
            {sign}{intPart}
          </span>
          <span className="text-[16px] sm:text-[20px] font-semibold text-text-tertiary leading-none">
            .{decPart}
          </span>
          <span className="text-[11px] sm:text-[12px] font-medium text-text-tertiary ml-1">{account.currency || 'USD'}</span>
        </div>

        {/* Actions — mobile: icon-only grid; desktop: text buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 sm:flex-wrap">
          <button
            type="button"
            onClick={onTrade}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-[12px] sm:text-[13px] font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] transition-colors"
          >
            <TrendingUp size={14} strokeWidth={2.2} /> Trade
          </button>
          {account.is_demo ? (
            <button
              type="button"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-[12px] sm:text-[13px] font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors"
            >
              Set Balance
            </button>
          ) : (
            <>
              <Link
                href="/wallet/deposit"
                aria-label="Deposit"
                className="inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-lg text-[13px] font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors"
              >
                <ArrowDownToLine size={14} /> <span className="hidden sm:inline">Deposit</span>
              </Link>
              <Link
                href="/wallet/withdrawal"
                aria-label="Withdraw"
                className="inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-lg text-[13px] font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors"
              >
                <ArrowUpFromLine size={14} /> <span className="hidden sm:inline">Withdraw</span>
              </Link>
              <Link
                href="/wallet/transfer"
                aria-label="Transfer"
                className="hidden xs:inline-flex sm:inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-lg text-[13px] font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors"
              >
                <ArrowRightLeft size={14} /> <span className="hidden sm:inline">Transfer</span>
              </Link>
            </>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-lg border border-border-primary bg-bg-base hover:bg-bg-hover flex items-center justify-center text-text-secondary"
              aria-label="More actions"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-bg-primary border border-border-primary rounded-lg py-1 z-30 shadow-lg">
                <Link
                  href={`/accounts/${account.id}/credentials`}
                  className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover"
                  onClick={() => setMenuOpen(false)}
                >
                  Account credentials
                </Link>
                <Link
                  href={`/trading/history?account=${account.id}`}
                  className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover"
                  onClick={() => setMenuOpen(false)}
                >
                  Trade history
                </Link>
                <Link
                  href={`/trading/performance?account=${account.id}`}
                  className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover"
                  onClick={() => setMenuOpen(false)}
                >
                  Performance
                </Link>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onArchive(); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                >
                  Archive account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details — Exness style */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border-primary">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 sm:gap-y-3 gap-x-4 sm:gap-x-8">
            <div className="flex items-center justify-between">
              <span className="text-[12px] sm:text-[13px] text-text-secondary">Actual leverage</span>
              <span className="text-[12px] sm:text-[13px] font-semibold text-text-primary tabular-nums">1:{leverage}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] sm:text-[13px] text-text-secondary">Free margin</span>
              <span className="text-[12px] sm:text-[13px] font-semibold text-text-primary tabular-nums">
                {freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {account.currency || 'USD'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] sm:text-[13px] text-text-secondary">Adjust leverage</span>
              <span className="text-[12px] sm:text-[13px] font-semibold text-text-primary tabular-nums">1:{leverage}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] sm:text-[13px] text-text-secondary">Equity</span>
              <span className="text-[12px] sm:text-[13px] font-semibold text-text-primary tabular-nums">
                {equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {account.currency || 'USD'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] sm:text-[13px] text-text-secondary">Floating P/L</span>
              <span className={clsx(
                'text-[12px] sm:text-[13px] font-semibold tabular-nums',
                floatingPL >= 0 ? 'text-text-primary' : 'text-red-500',
              )}>
                {floatingPL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {account.currency || 'USD'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] sm:text-[13px] text-text-secondary">Platform</span>
              <span className="text-[12px] sm:text-[13px] font-semibold text-text-primary">Exness</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Archived card ─── */

function ArchivedCard({
  account,
  onRestore,
}: {
  account: AccountRow;
  onRestore: () => void;
}) {
  const groupLabel = account.group_name ?? account.account_group?.name ?? 'Standard';
  const platform = (account.platform ?? 'MT5').toUpperCase();
  const archivedAt = fmtArchivedDate(account.archived_at);

  const restore = async () => {
    try {
      await api.post(`/accounts/${account.id}/restore`, {});
      toast.success('Account restored');
      onRestore();
    } catch (e: any) {
      toast.error(e?.message || 'Could not restore');
    }
  };

  return (
    <div className="bg-bg-primary border border-border-primary rounded-2xl px-4 sm:px-5 py-4 sm:py-5">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-3">
        <Badge>{account.is_demo ? 'Demo' : 'Real'}</Badge>
        <Badge>{platform}</Badge>
        <Badge>{groupLabel}</Badge>
        <span className="text-[13px] sm:text-[15px] font-semibold text-text-primary ml-0.5 sm:ml-1">
          # {account.account_number}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[14px] sm:text-[15px] font-semibold text-text-primary">Balance unavailable</p>
          {archivedAt && (
            <p className="text-[12px] sm:text-[13px] text-text-secondary">
              Archived on {archivedAt}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void restore()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-[12px] sm:text-[13px] font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors"
          >
            <RefreshCcw size={13} /> Restore
          </button>
          <Link
            href={`/trading/history?account=${account.id}`}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-[12px] sm:text-[13px] font-semibold text-text-primary bg-bg-base border border-border-primary hover:bg-bg-hover transition-colors"
          >
            <ArrowDownToLine size={13} /> <span className="whitespace-nowrap">Statements</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty state ─── */

function EmptyState({ kind, onOpen }: { kind: 'real' | 'demo'; onOpen: () => void }) {
  return (
    <div className="bg-bg-primary border border-border-primary rounded-2xl py-16 px-6 text-center">
      <p className="text-[18px] font-semibold text-text-primary">No active accounts</p>
      <p className="text-sm text-text-secondary mt-1 mb-5">
        Create a new {kind === 'real' ? 'real' : 'demo'} account or restore an archived one to get started.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold text-text-primary bg-[#ffe600] hover:bg-[#f5dc00] transition-colors"
      >
        <Plus size={14} strokeWidth={2.2} /> Open account
      </button>
    </div>
  );
}

/* ─── Bits ─── */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-bg-base border border-border-primary text-[11px] font-medium text-text-secondary">
      {children}
    </span>
  );
}

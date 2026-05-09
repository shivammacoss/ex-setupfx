'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, ExternalLink, Eye, EyeOff, Copy, Check, ChevronDown, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import DashboardShell from '@/components/layout/DashboardShell';
import LegalFooter from '@/components/layout/LegalFooter';
import api from '@/lib/api/client';
import { tradingTerminalUrl, setPersistedTradingAccountId } from '@/lib/tradingNav';
import { useI18n } from '@/lib/i18n/I18nContext';

interface OpenAccountResponse {
  id: string;
  account_number: string;
  balance: number;
  account_group_id: string;
  account_group_name: string;
}

interface GroupItem {
  id: string;
  name: string;
  description: string;
  leverage_default: number;
  minimum_deposit: number;
  spread_markup: number;
  commission_per_lot: number;
  swap_free: boolean;
  is_demo?: boolean;
}

const PROFESSIONAL_THRESHOLD = 2000;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED'];
const LEVERAGE_STEPS = [10, 25, 50, 100, 200, 300, 400, 500, 1000, 2000, 3000];

/** Build leverage options bounded by the admin-set max for the selected group. */
function leverageOptionsFor(adminMax: number | undefined | null): number[] {
  const max = Math.max(1, Number(adminMax) || 0);
  if (max <= 0) return [];
  const opts = LEVERAGE_STEPS.filter((v) => v <= max);
  // Always include the exact admin value so admins can set non-standard caps (e.g. 1:300, 1:750).
  if (!opts.includes(max)) opts.push(max);
  return Array.from(new Set(opts)).sort((a, b) => a - b);
}

type Phase = 'select' | 'setup' | 'created';
type Platform = 'mt4' | 'mt5' | 'exsetup';

function GroupIcon({ kind }: { kind: 'standard' | 'cent' | 'pro' | 'raw' | 'zero' }) {
  const fill = '#7c75a8';
  const fillDark = '#4f4a73';
  const fillLight = '#a39ed1';
  switch (kind) {
    case 'cent':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0">
          <ellipse cx="32" cy="40" rx="22" ry="8" fill={fillDark} />
          <ellipse cx="32" cy="34" rx="22" ry="8" fill={fill} />
          <ellipse cx="32" cy="34" rx="14" ry="5" fill={fillLight} opacity="0.5" />
        </svg>
      );
    case 'pro':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0">
          <polygon points="14,42 30,50 30,30 14,22" fill={fillDark} />
          <polygon points="30,30 30,50 50,40 50,20" fill={fill} />
          <polygon points="14,22 30,30 50,20 34,12" fill={fillLight} />
        </svg>
      );
    case 'raw':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0">
          <polygon points="14,32 32,42 50,32 32,22" fill={fillLight} />
          <polygon points="14,32 32,42 32,52 14,42" fill={fillDark} />
          <polygon points="50,32 32,42 32,52 50,42" fill={fill} />
        </svg>
      );
    case 'zero':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0">
          <ellipse cx="32" cy="36" rx="20" ry="14" fill={fillDark} />
          <ellipse cx="32" cy="32" rx="20" ry="14" fill={fill} />
          <ellipse cx="32" cy="32" rx="9" ry="6" fill="#1a1626" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0">
          <polygon points="12,42 32,52 32,30 12,20" fill={fillDark} />
          <polygon points="32,30 32,52 52,42 52,20" fill={fill} />
          <polygon points="12,20 32,30 52,20 32,10" fill={fillLight} />
        </svg>
      );
  }
}

function detectKind(name: string): 'standard' | 'cent' | 'pro' | 'raw' | 'zero' {
  const n = name.toLowerCase();
  if (n.includes('cent')) return 'cent';
  if (n.includes('raw')) return 'raw';
  if (n.includes('zero')) return 'zero';
  if (n.includes('pro')) return 'pro';
  return 'standard';
}

function fmtCommission(c: number): string {
  if (!c || c <= 0) return 'No commission';
  return `Up to ${c.toFixed(2)} USD per lot/side`;
}

function fmtSpread(s: number): string {
  if (!s || s <= 0) return '0.00 pips';
  return `${s.toFixed(2)} pips`;
}

function fmtLeverage(l: number): string {
  if (!l || l >= 1000) return '1:Unlimited';
  return `1:${l}`;
}

function validatePassword(p: string): { ok: boolean; rules: { label: string; ok: boolean }[] } {
  const rules = [
    { label: 'Between 8-15 characters', ok: p.length >= 8 && p.length <= 15 },
    { label: 'At least one upper and one lower case letter', ok: /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { label: 'At least one number', ok: /\d/.test(p) },
    { label: 'At least one special character', ok: /[^A-Za-z0-9]/.test(p) },
  ];
  return { ok: rules.every((r) => r.ok), rules };
}

const GROUPS_CACHE_KEY = 'open_account.groups.v1';
const GROUPS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readGroupsCache(): GroupItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(GROUPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; items: GroupItem[] };
    if (!parsed?.items || !Array.isArray(parsed.items)) return null;
    if (Date.now() - parsed.ts > GROUPS_CACHE_TTL_MS) return null;
    return parsed.items;
  } catch { return null; }
}

function writeGroupsCache(items: GroupItem[]) {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify({ ts: Date.now(), items })); } catch {}
}

function OpenAccountPageInner() {
  const { t: tr } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cachedGroups = typeof window !== 'undefined' ? readGroupsCache() : null;
  const [groups, setGroups] = useState<GroupItem[]>(cachedGroups || []);
  const [loading, setLoading] = useState(!cachedGroups);
  const [opening, setOpening] = useState(false);
  const [selected, setSelected] = useState<string | null>(() => {
    if (!cachedGroups) return null;
    const firstStd = cachedGroups.find((g) => g.minimum_deposit < PROFESSIONAL_THRESHOLD && !g.is_demo);
    return firstStd?.id ?? null;
  });

  const [phase, setPhase] = useState<Phase>('select');
  const [accountType, setAccountType] = useState<'demo' | 'real'>('real');
  const [currency, setCurrency] = useState('USD');
  const [nickname, setNickname] = useState('Standard');
  const [maxLeverage, setMaxLeverage] = useState(2000);
  const [platform, setPlatform] = useState<Platform>('exsetup');
  const [tradePassword, setTradePassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<OpenAccountResponse | null>(null);
  const [copiedField, setCopiedField] = useState<'id' | 'pwd' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ items: GroupItem[] }>('/accounts/available-groups');
        if (!cancelled) {
          const list = Array.isArray(res?.items) ? res.items : [];
          setGroups(list);
          writeGroupsCache(list);
          if (!selected) {
            const firstStd = list.find((g) => g.minimum_deposit < PROFESSIONAL_THRESHOLD && !g.is_demo);
            if (firstStd) setSelected(firstStd.id);
          }
        }
      } catch (e) {
        if (!cancelled && groups.length === 0) toast.error(e instanceof Error ? e.message : 'Could not load account types');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preselectId = searchParams.get('group');
  useEffect(() => {
    if (!preselectId || groups.length === 0) return;
    if (groups.some((g) => g.id === preselectId)) setSelected(preselectId);
  }, [preselectId, groups]);

  const { standard, professional, demo } = useMemo(() => {
    const std: GroupItem[] = [];
    const pro: GroupItem[] = [];
    const dem: GroupItem[] = [];
    for (const g of groups) {
      if (g.is_demo) dem.push(g);
      else if (g.minimum_deposit >= PROFESSIONAL_THRESHOLD) pro.push(g);
      else std.push(g);
    }
    return { standard: std, professional: pro, demo: dem };
  }, [groups]);

  const selectedGroup = useMemo(() => groups.find((g) => g.id === selected), [groups, selected]);

  const leverageOptions = useMemo(
    () => leverageOptionsFor(selectedGroup?.leverage_default),
    [selectedGroup?.leverage_default],
  );

  // Sync defaults when entering setup phase or group changes
  useEffect(() => {
    if (phase === 'setup' && selectedGroup) {
      setNickname(selectedGroup.name);
      const adminMax = Number(selectedGroup.leverage_default) || 0;
      setMaxLeverage(adminMax > 0 ? adminMax : 100);
      setAccountType(selectedGroup.is_demo ? 'demo' : 'real');
    }
  }, [phase, selectedGroup]);

  // Clamp leverage if user switches group to one with a lower cap
  useEffect(() => {
    if (leverageOptions.length === 0) return;
    if (!leverageOptions.includes(maxLeverage)) {
      setMaxLeverage(leverageOptions[leverageOptions.length - 1]);
    }
  }, [leverageOptions, maxLeverage]);

  const pwdState = validatePassword(tradePassword);

  const submitSetup = async () => {
    if (!selected) return;
    if (platform !== 'exsetup') {
      toast.error('Selected platform is not yet available');
      return;
    }
    if (!pwdState.ok) {
      toast.error('Trading password does not meet requirements');
      return;
    }
    setOpening(true);
    try {
      const res = await api.post<OpenAccountResponse>('/accounts/open', { account_group_id: selected });
      setCreatedAccount(res);
      setPhase('created');
      toast.success('Trading account created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open account');
    } finally {
      setOpening(false);
    }
  };

  const copy = (text: string, field: 'id' | 'pwd') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const launchTerminal = () => {
    if (!createdAccount) return;
    setPersistedTradingAccountId(createdAccount.id);
    const url = tradingTerminalUrl(createdAccount.id, { view: 'chart' });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <DashboardShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (phase === 'setup') { setPhase('select'); return; }
                if (phase === 'created') { router.push('/accounts'); return; }
                router.back();
              }}
              aria-label="Back"
              className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-primary"
            >
              <ArrowLeft size={20} strokeWidth={2.2} />
            </button>
            <h1 className="text-[24px] sm:text-[30px] font-semibold tracking-tight text-text-primary">
              {phase === 'select' ? tr('open_account.title') : phase === 'setup' ? tr('open_account.setup_title') : tr('open_account.created_title')}
            </h1>
          </div>
        </div>

        {phase === 'select' && (
          loading && groups.length === 0 ? (
            <SkeletonAccountList />
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-border-primary bg-bg-secondary p-10 text-center text-sm text-text-tertiary">
              No account types are available yet. Please contact support.
            </div>
          ) : (
            <div className="space-y-8">
              {standard.length > 0 && <Section title={tr('open_account.standard_accounts')} items={standard} selected={selected} onSelect={setSelected} />}
              {professional.length > 0 && <Section title={tr('open_account.professional_accounts')} items={professional} selected={selected} onSelect={setSelected} />}
              {demo.length > 0 && <Section title={tr('open_account.demo_accounts')} items={demo} selected={selected} onSelect={setSelected} />}

              <div>
                <button
                  type="button"
                  disabled={!selected}
                  onClick={() => setPhase('setup')}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-warning hover:brightness-110 text-[15px] font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-[260px]"
                >
                  {tr('common.continue')}
                </button>
              </div>
            </div>
          )
        )}

        {phase === 'setup' && selectedGroup && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div className="space-y-5">
              {/* Demo / Real toggle */}
              <div className="grid grid-cols-2 rounded-xl border border-border-primary overflow-hidden bg-bg-secondary">
                {(['demo', 'real'] as const).map((t) => {
                  const active = accountType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAccountType(t)}
                      className={clsx(
                        'py-3 text-sm font-semibold transition-colors',
                        active ? 'bg-card text-text-primary border-b-2 border-warning' : 'text-text-tertiary hover:text-text-primary',
                      )}
                    >
                      {t === 'demo' ? tr('open_account.demo') : tr('open_account.real')}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-tertiary">
                {accountType === 'real' ? tr('open_account.real_desc') : tr('open_account.demo_desc')}
              </p>

              <Field label={tr('open_account.currency')} required>
                <Select value={currency} onChange={setCurrency}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c} — {c === 'USD' ? 'United States Dollar' : c === 'EUR' ? 'Euro' : c === 'GBP' ? 'British Pound' : c === 'INR' ? 'Indian Rupee' : 'UAE Dirham'}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={tr('open_account.nickname')} required hint={`Nicknames can't contain special characters: <>"&?^*#@`} counter={`${nickname.length}/36`}>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.replace(/[<>"&?^*#@]/g, '').slice(0, 36))}
                  className="w-full rounded-lg border border-border-primary bg-bg-input text-text-primary px-3 py-2.5 text-sm outline-none focus:border-warning"
                />
              </Field>

              <Field label={tr('open_account.max_leverage')} required>
                <Select value={String(maxLeverage)} onChange={(v) => setMaxLeverage(Number(v))}>
                  {leverageOptions.map((l) => (
                    <option key={l} value={l}>1:{l}</option>
                  ))}
                </Select>
              </Field>

              <Field label={tr('open_account.platform')} required>
                <PlatformSelect value={platform} onChange={setPlatform} />
              </Field>

              <Field label={tr('open_account.trading_password')} required>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={tradePassword}
                    onChange={(e) => setTradePassword(e.target.value)}
                    className="w-full rounded-lg border border-border-primary bg-bg-input text-text-primary px-3 py-2.5 pr-10 text-sm outline-none focus:border-warning"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-tertiary hover:text-text-primary"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {pwdState.rules.map((r) => (
                    <li key={r.label} className={clsx('text-xs flex items-center gap-2', r.ok ? 'text-buy' : 'text-text-tertiary')}>
                      <span className={clsx('inline-block w-3.5 h-3.5 rounded-full border', r.ok ? 'bg-buy border-buy' : 'border-border-primary')}>
                        {r.ok && <Check size={12} className="text-black" strokeWidth={3} />}
                      </span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              </Field>

              <button
                type="button"
                onClick={submitSetup}
                disabled={opening || platform !== 'exsetup' || !pwdState.ok || !nickname.trim()}
                className="w-full rounded-lg bg-warning hover:brightness-110 text-black text-sm font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {opening ? `${tr('common.loading')}` : tr('open_account.create_account')}
              </button>
            </div>

            {/* Right summary panel */}
            <aside className="rounded-xl border border-border-primary bg-card p-5 h-fit lg:sticky lg:top-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-text-primary">{selectedGroup.name}</h3>
                <button type="button" onClick={() => setPhase('select')} className="text-xs font-semibold text-warning hover:underline">
                  Change
                </button>
              </div>
              <SummaryRow label="Min deposit" value={`${selectedGroup.minimum_deposit} USD`} />
              <SummaryRow label="Min spread" value={fmtSpread(selectedGroup.spread_markup)} />
              <SummaryRow label="Max leverage" value={fmtLeverage(selectedGroup.leverage_default)} />
              <SummaryRow label="Commission" value={fmtCommission(selectedGroup.commission_per_lot)} />
            </aside>
          </div>
        )}

        {phase === 'created' && createdAccount && (
          <div className="w-full space-y-6">
            <div className="rounded-xl border border-warning/40 bg-warning/[0.06] p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-warning/20 border border-warning/40 flex items-center justify-center mx-auto">
                <Check size={26} className="text-warning" strokeWidth={3} />
              </div>
              <h2 className="text-xl font-bold text-text-primary">{tr('open_account.account_ready')}</h2>
              <p className="text-sm text-text-tertiary">{tr('open_account.save_creds')}</p>
            </div>

            <div className="rounded-xl border border-border-primary bg-card divide-y divide-border-primary">
              <CredRow
                label={tr('open_account.account_id')}
                value={createdAccount.account_number}
                copied={copiedField === 'id'}
                onCopy={() => copy(createdAccount.account_number, 'id')}
              />
              <CredRow
                label={tr('open_account.trading_password')}
                value={tradePassword}
                masked
                copied={copiedField === 'pwd'}
                onCopy={() => copy(tradePassword, 'pwd')}
              />
              <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-text-tertiary">Account type</p>
                  <p className="text-text-primary font-semibold capitalize mt-0.5">{accountType}</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Platform</p>
                  <p className="text-text-primary font-semibold mt-0.5">StockPip Trading</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Currency</p>
                  <p className="text-text-primary font-semibold mt-0.5">{currency}</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Leverage</p>
                  <p className="text-text-primary font-semibold mt-0.5">1:{maxLeverage}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={launchTerminal}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-warning hover:brightness-110 text-black text-sm font-bold py-3 transition-all"
              >
                {tr('open_account.open_terminal')} <ExternalLink size={15} />
              </button>
              <button
                type="button"
                onClick={() => router.push('/accounts')}
                className="px-5 py-3 rounded-lg border border-border-primary text-text-primary text-sm font-semibold hover:bg-bg-hover transition-colors"
              >
                {tr('open_account.back_to_accounts')}
              </button>
            </div>

            <p className="text-[11px] text-text-tertiary text-center">
              Terminal opens in a new tab. Bookmark it for quick access — your charts, orders, and positions sync in real-time.
            </p>
          </div>
        )}
      </div>
      <LegalFooter />
    </DashboardShell>
  );
}

function Field({
  label,
  required,
  hint,
  counter,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-warning mb-1.5">
        {label}
        {required && <span className="text-warning ml-0.5">*</span>}
      </label>
      {children}
      {(hint || counter) && (
        <div className="mt-1.5 flex items-start justify-between gap-3">
          {hint && <p className="text-[11px] text-text-tertiary">{hint}</p>}
          {counter && <p className="text-[11px] text-text-tertiary shrink-0">{counter}</p>}
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border-primary bg-bg-input text-text-primary px-3 py-2.5 pr-9 text-sm outline-none focus:border-warning cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary" />
    </div>
  );
}

function PlatformSelect({ value, onChange }: { value: Platform; onChange: (v: Platform) => void }) {
  const [open, setOpen] = useState(false);
  const items: { id: Platform; title: string; desc: string; comingSoon?: boolean }[] = [
    { id: 'exsetup', title: 'StockPip Trading', desc: 'Great for all traders. Simple, intuitive, and built for the StockPip Terminal.' },
    { id: 'mt5', title: 'MT5', desc: 'Coming soon — advanced platform integration in progress.', comingSoon: true },
    { id: 'mt4', title: 'MT4', desc: 'Coming soon — legacy platform integration in progress.', comingSoon: true },
  ];
  const current = items.find((i) => i.id === value)!;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-border-primary bg-bg-input text-text-primary px-3 py-2.5 text-sm outline-none hover:border-warning"
      >
        <span className="flex items-center gap-2">
          {current.title}
          {current.comingSoon && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-warning/15 text-warning">Soon</span>}
        </span>
        <ChevronDown size={16} className={clsx('text-text-tertiary transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <button type="button" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" aria-hidden />
          <ul className="absolute z-20 left-0 right-0 mt-1.5 rounded-lg border border-border-primary bg-card shadow-lg overflow-hidden">
            {items.map((i) => {
              const disabled = i.comingSoon;
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      onChange(i.id);
                      setOpen(false);
                    }}
                    className={clsx(
                      'w-full text-left px-4 py-3 transition-colors flex items-start gap-3',
                      disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-bg-hover cursor-pointer',
                      value === i.id && !disabled && 'bg-warning/5',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{i.title}</span>
                        {i.comingSoon && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary mt-0.5 leading-snug">{i.desc}</p>
                    </div>
                    {disabled && <Lock size={14} className="text-text-tertiary mt-1 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="text-sm font-semibold text-text-primary mt-0.5">{value}</p>
    </div>
  );
}

function CredRow({
  label,
  value,
  masked,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  masked?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  const [reveal, setReveal] = useState(!masked);
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
        <p className="text-sm font-mono font-semibold text-text-primary mt-0.5 truncate">
          {masked && !reveal ? '•'.repeat(Math.min(value.length, 12)) : value}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {masked && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
            aria-label={reveal ? 'Hide' : 'Reveal'}
          >
            {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Copy"
        >
          {copied ? <Check size={15} className="text-buy" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: GroupItem[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_100px_120px_180px] items-end gap-x-4 mb-3 px-1">
        <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
        <div className="hidden sm:block text-[12px] text-text-tertiary text-right">Min deposit</div>
        <div className="hidden sm:block text-[12px] text-text-tertiary text-right">Min spread</div>
        <div className="hidden sm:block text-[12px] text-text-tertiary text-right">Max leverage</div>
        <div className="hidden sm:block text-[12px] text-text-tertiary text-left">Commission</div>
      </div>

      <ul className="space-y-2">
        {items.map((g) => {
          const isSel = selected === g.id;
          return (
            <li key={g.id}>
              <label
                className={`block cursor-pointer rounded-xl border transition-colors ${
                  isSel ? 'border-warning bg-warning/[0.06]' : 'border-border-primary bg-bg-primary hover:bg-bg-secondary/60'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_100px_120px_180px] items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`relative inline-flex w-5 h-5 rounded-full border-2 shrink-0 ${isSel ? 'border-warning' : 'border-border-strong'}`}>
                      {isSel && <span className="absolute inset-1 rounded-full bg-warning" />}
                    </span>
                    <input
                      type="radio"
                      name="account-group"
                      value={g.id}
                      checked={isSel}
                      onChange={() => onSelect(g.id)}
                      className="sr-only"
                    />
                    <GroupIcon kind={detectKind(g.name)} />
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-text-primary truncate flex items-center gap-2">
                        {g.name}
                        {g.is_demo && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-warning/15 text-warning">Demo</span>
                        )}
                      </div>
                      {g.description ? (
                        <p className="text-[12.5px] text-text-tertiary leading-snug mt-0.5 line-clamp-2">{g.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <Metric label="Min deposit" value={`${g.minimum_deposit} USD`} align="right" />
                  <Metric label="Min spread" value={fmtSpread(g.spread_markup)} align="right" />
                  <Metric label="Max leverage" value={fmtLeverage(g.leverage_default)} align="right" />
                  <Metric label="Commission" value={fmtCommission(g.commission_per_lot)} align="left" />
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Metric({
  label,
  value,
  align,
}: {
  label: string;
  value: string;
  align: 'left' | 'right';
}) {
  return (
    <div className={`text-[14px] text-text-primary ${align === 'right' ? 'sm:text-right' : 'sm:text-left'}`}>
      <span className="sm:hidden text-[11px] uppercase tracking-wide text-text-tertiary mr-2">{label}:</span>
      {value}
    </div>
  );
}

function SkeletonAccountList() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_100px_120px_180px] items-end gap-x-4 mb-3 px-1">
          <div className="h-4 w-32 bg-bg-secondary rounded" />
          <div className="hidden sm:block h-3 w-16 bg-bg-secondary rounded ml-auto" />
          <div className="hidden sm:block h-3 w-16 bg-bg-secondary rounded ml-auto" />
          <div className="hidden sm:block h-3 w-20 bg-bg-secondary rounded ml-auto" />
          <div className="hidden sm:block h-3 w-20 bg-bg-secondary rounded" />
        </div>
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="rounded-xl border border-border-primary bg-bg-primary">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_100px_120px_180px] items-center gap-x-4 px-4 sm:px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-bg-secondary" />
                  <div className="w-12 h-12 rounded-lg bg-bg-secondary" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-bg-secondary rounded" />
                    <div className="h-3 w-48 bg-bg-secondary rounded" />
                  </div>
                </div>
                <div className="hidden sm:block h-4 w-16 bg-bg-secondary rounded ml-auto" />
                <div className="hidden sm:block h-4 w-14 bg-bg-secondary rounded ml-auto" />
                <div className="hidden sm:block h-4 w-20 bg-bg-secondary rounded ml-auto" />
                <div className="hidden sm:block h-4 w-32 bg-bg-secondary rounded" />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="h-12 w-full sm:w-[260px] bg-bg-secondary rounded-lg" />
    </div>
  );
}

export default function OpenAccountPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-sm text-text-tertiary">Loading…</div>
        </DashboardShell>
      }
    >
      <OpenAccountPageInner />
    </Suspense>
  );
}

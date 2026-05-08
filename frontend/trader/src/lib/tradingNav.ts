const STORAGE_KEY = 'pt_active_trading_account';

export function setPersistedTradingAccountId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) sessionStorage.setItem(STORAGE_KEY, id);
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function getPersistedTradingAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

// ---- Open-account prefetch -------------------------------------------------

const GROUPS_CACHE_KEY = 'open_account.groups.v1';
const GROUPS_CACHE_TTL_MS = 5 * 60 * 1000;

let prefetchInFlight: Promise<unknown> | null = null;

/** Eagerly fetch account groups + cache in sessionStorage. Safe to call repeatedly. */
export function prefetchAccountGroups(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(GROUPS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { ts: number };
      if (parsed?.ts && Date.now() - parsed.ts < GROUPS_CACHE_TTL_MS) return;
    }
  } catch {}
  if (prefetchInFlight) return;
  prefetchInFlight = fetch('/api/v1/accounts/available-groups', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.items && Array.isArray(json.items)) {
        sessionStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify({ ts: Date.now(), items: json.items }));
      }
    })
    .catch(() => {})
    .finally(() => { prefetchInFlight = null; });
}

/** Terminal URL; without account id returns picker path `/trading`. */
export function tradingTerminalUrl(accountId: string | null | undefined, extra?: Record<string, string>) {
  if (!accountId) return '/trading';
  const q = new URLSearchParams({ account: accountId, ...extra });
  return `/trading/terminal?${q.toString()}`;
}

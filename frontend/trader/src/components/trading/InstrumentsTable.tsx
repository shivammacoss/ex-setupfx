'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { ChevronDown, Search, MoreHorizontal, X, Star } from 'lucide-react';
import { useTradingStore, type InstrumentInfo } from '@/stores/tradingStore';
import { tradingTerminalUrl } from '@/lib/tradingNav';
import SymbolIcon from './SymbolIcon';

type Trend = 'up' | 'down' | 'neutral';

type CategoryId =
  | 'favorites'
  | 'most_traded'
  | 'top_movers'
  | 'majors'
  | 'metals'
  | 'crypto'
  | 'indices'
  | 'stocks'
  | 'energy'
  | 'exotic'
  | 'minors'
  | 'all';

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'favorites', label: 'Favorites' },
  { id: 'most_traded', label: 'Most traded' },
  { id: 'top_movers', label: 'Top movers' },
  { id: 'majors', label: 'Majors' },
  { id: 'metals', label: 'Metals' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'indices', label: 'Indices' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'energy', label: 'Energy' },
  { id: 'exotic', label: 'Exotic' },
  { id: 'minors', label: 'Minors' },
  { id: 'all', label: 'All' },
];

/* Default favorites if the user hasn't starred anything yet — main symbols. */
const DEFAULT_FAVORITES = [
  'BTCUSD', 'XAUUSD', 'XAGUSD', 'ETHUSD',
  'USOIL', 'USDJPY', 'EURUSD', 'USTEC',
  'NAS100', 'GBPUSD',
];

const MOST_TRADED = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD',
  'AUDUSD', 'USOIL', 'NAS100', 'US30', 'ETHUSD',
];

const MAJORS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
const MINORS = ['EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'AUDJPY', 'CADJPY', 'NZDJPY', 'AUDNZD'];
const EXOTIC = ['USDTRY', 'USDZAR', 'USDMXN', 'USDSGD', 'USDHKD', 'USDNOK', 'USDSEK'];
const METALS = ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'];
const ENERGY = ['USOIL', 'UKOIL', 'NGAS'];
const INDICES = ['US30', 'US500', 'NAS100', 'UK100', 'GER40', 'JPN225', 'AUS200', 'USTEC'];

const SYMBOL_DESC: Record<string, string> = {
  EURUSD: 'Euro vs US Dollar',
  GBPUSD: 'British Pound vs US Dollar',
  USDJPY: 'US Dollar vs Japanese Yen',
  AUDUSD: 'Australian Dollar vs US Dollar',
  USDCAD: 'US Dollar vs Canadian Dollar',
  USDCHF: 'US Dollar vs Swiss Franc',
  NZDUSD: 'New Zealand Dollar vs US Dollar',
  EURGBP: 'Euro vs British Pound',
  EURJPY: 'Euro vs Japanese Yen',
  GBPJPY: 'British Pound vs Japanese Yen',
  XAUUSD: 'Gold vs US Dollar',
  XAGUSD: 'Silver vs US Dollar',
  USOIL: 'Crude Oil',
  US30: 'Dow Jones Industrial',
  US500: 'S&P 500 Index',
  NAS100: 'NASDAQ 100 Index',
  USTEC: 'US Tech 100',
  UK100: 'FTSE 100 Index',
  GER40: 'DAX 40 Index',
  BTCUSD: 'Bitcoin vs US Dollar',
  ETHUSD: 'Ethereum vs US Dollar',
  LTCUSD: 'Litecoin vs US Dollar',
  XRPUSD: 'Ripple vs US Dollar',
  SOLUSD: 'Solana vs US Dollar',
  DOGUSD: 'Dogecoin vs US Dollar',
  BCHUSD: 'Bitcoin Cash vs US Dollar',
  BNBUSD: 'Binance Coin vs US Dollar',
};

function getDigits(symbol: string): number {
  if (['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'NZDJPY'].includes(symbol)) return 3;
  if (symbol === 'XRPUSD') return 4;
  if (['XAUUSD', 'USOIL', 'BTCUSD', 'ETHUSD', 'LTCUSD', 'SOLUSD', 'DOGUSD'].includes(symbol)) return 2;
  if (['US30', 'US500', 'NAS100', 'UK100', 'GER40', 'USTEC'].includes(symbol)) return 1;
  return 5;
}

function categoryOf(symbol: string, instruments: InstrumentInfo[]): CategoryId {
  const u = symbol.toUpperCase();
  if (METALS.includes(u)) return 'metals';
  if (ENERGY.includes(u) || u.includes('OIL') || u.includes('GAS')) return 'energy';
  if (INDICES.includes(u)) return 'indices';
  if (MAJORS.includes(u)) return 'majors';
  if (MINORS.includes(u)) return 'minors';
  if (EXOTIC.includes(u)) return 'exotic';
  const inst = instruments.find((i) => i.symbol === symbol);
  const seg = String(inst?.segment || '').toLowerCase();
  if (seg.includes('crypto')) return 'crypto';
  if (seg.includes('indic')) return 'indices';
  if (seg.includes('commodit')) return 'energy';
  if (seg.includes('metal')) return 'metals';
  if (seg.includes('stock') || seg.includes('equit')) return 'stocks';
  if (u.endsWith('USD') && u.length === 6 && (u.startsWith('BTC') || u.startsWith('ETH') || u.startsWith('XRP') || u.startsWith('LTC') || u.startsWith('SOL') || u.startsWith('DOG') || u.startsWith('BCH') || u.startsWith('BNB') || u.startsWith('ADA'))) return 'crypto';
  if (u.length === 6 && u.endsWith('USD')) return 'majors';
  return 'all';
}

const STARRED_KEY = 'piphigh.terminal.starred';

function readStarred(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STARRED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeStarred(s: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STARRED_KEY, JSON.stringify(Array.from(s)));
  } catch {
    /* ignore */
  }
}

export type InstrumentsTableProps = {
  onExitMarkets?: () => void;
  onViewNews?: () => void;
};

export default function InstrumentsTable({ onExitMarkets }: InstrumentsTableProps) {
  const router = useRouter();
  const urlParams = useSearchParams();
  const { watchlist, prices, selectedSymbol, setSelectedSymbol, instruments } = useTradingStore();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryId>('favorites');
  const [catOpen, setCatOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(() => readStarred());

  const [bidFlash, setBidFlash] = useState<Record<string, Trend>>({});
  const dayOpenRef = useRef<Record<string, number>>({});
  const prevTickRef = useRef<Record<string, { bid: number; ask: number }>>({});
  const catRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Track day-open price for % change
  useEffect(() => {
    for (const symbol of watchlist) {
      const tick = prices[symbol];
      if (!tick) continue;
      if (!(symbol in dayOpenRef.current)) {
        dayOpenRef.current[symbol] = tick.bid;
      }
    }
  }, [prices, watchlist]);

  // Flash bid on changes
  useEffect(() => {
    const next: Record<string, Trend> = {};
    for (const symbol of watchlist) {
      const tick = prices[symbol];
      if (!tick) continue;
      const prev = prevTickRef.current[symbol];
      if (prev) {
        if (tick.bid > prev.bid) next[symbol] = 'up';
        else if (tick.bid < prev.bid) next[symbol] = 'down';
      }
      prevTickRef.current[symbol] = { bid: tick.bid, ask: tick.ask };
    }
    if (Object.keys(next).length === 0) return;
    setBidFlash((p) => ({ ...p, ...next }));
    const timer = setTimeout(() => {
      setBidFlash((p) => {
        const n = { ...p };
        for (const k of Object.keys(next)) delete n[k];
        return n;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [prices, watchlist]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const allSymbols = useMemo(() => {
    return Array.from(new Set([...watchlist, ...instruments.map((i) => i.symbol)]));
  }, [watchlist, instruments]);

  const rows = useMemo(() => {
    const hasQuery = search.trim().length > 0;
    const q = search.trim().toLowerCase();
    const source = hasQuery ? allSymbols : allSymbols;

    const filtered = source.filter((s) => prices[s] != null);

    const filteredBySearch = filtered.filter((s) => {
      if (!hasQuery) return true;
      const inst = instruments.find((i) => i.symbol === s);
      const hay = `${s} ${inst?.display_name || ''} ${SYMBOL_DESC[s] || ''}`.toLowerCase();
      return hay.includes(q);
    });

    if (hasQuery) return filteredBySearch;

    let list: string[];
    switch (category) {
      case 'favorites': {
        const userStars = Array.from(starred);
        list = userStars.length > 0
          ? userStars
          : DEFAULT_FAVORITES.filter((s) => filteredBySearch.includes(s));
        // Always merge with available source so missing ones don't crash
        list = list.filter((s) => filteredBySearch.includes(s));
        break;
      }
      case 'most_traded':
        list = MOST_TRADED.filter((s) => filteredBySearch.includes(s));
        break;
      case 'top_movers': {
        const withChange = filteredBySearch
          .map((s) => {
            const tick = prices[s];
            const open = dayOpenRef.current[s] ?? tick?.bid ?? 0;
            const change = open > 0 && tick ? ((tick.bid - open) / open) * 100 : 0;
            return { s, change: Math.abs(change) };
          })
          .sort((a, b) => b.change - a.change)
          .slice(0, 15);
        list = withChange.map((x) => x.s);
        break;
      }
      case 'majors':
        list = MAJORS.filter((s) => filteredBySearch.includes(s));
        break;
      case 'minors':
        list = MINORS.filter((s) => filteredBySearch.includes(s));
        break;
      case 'exotic':
        list = EXOTIC.filter((s) => filteredBySearch.includes(s));
        break;
      case 'metals':
        list = filteredBySearch.filter((s) => categoryOf(s, instruments) === 'metals');
        break;
      case 'crypto':
        list = filteredBySearch.filter((s) => categoryOf(s, instruments) === 'crypto');
        break;
      case 'indices':
        list = filteredBySearch.filter((s) => categoryOf(s, instruments) === 'indices');
        break;
      case 'stocks':
        list = filteredBySearch.filter((s) => categoryOf(s, instruments) === 'stocks');
        break;
      case 'energy':
        list = filteredBySearch.filter((s) => categoryOf(s, instruments) === 'energy');
        break;
      case 'all':
      default:
        list = filteredBySearch;
        break;
    }
    return list;
  }, [allSymbols, search, category, prices, instruments, starred]);

  const handleRowClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    const acc = urlParams.get('account');
    if (acc && !window.location.pathname.includes('/terminal')) {
      router.push(tradingTerminalUrl(acc, { view: 'chart' }));
    }
  };

  const toggleStar = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred((p) => {
      const next = new Set(p);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      writeStarred(next);
      return next;
    });
  };

  const currentLabel = CATEGORIES.find((c) => c.id === category)?.label ?? 'Favorites';

  return (
    <div className="h-full min-h-0 flex flex-col bg-bg-base text-text-primary">
      {/* Title bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border-primary">
        <span className="text-text-secondary font-bold uppercase tracking-wider">
          Instruments
        </span>
        <div className="flex items-center gap-1">
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              aria-label="More"
            >
              <MoreHorizontal size={16} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-bg-base border border-border-primary rounded-lg py-1 z-50 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setStarred(new Set());
                    writeStarred(new Set());
                    setMoreOpen(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-white/[0.04]"
                >
                  Clear favorites
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategory('favorites');
                    setMoreOpen(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-white/[0.04]"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
          {onExitMarkets && (
            <button
              type="button"
              onClick={onExitMarkets}
              className="w-7 h-7 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]"
              aria-label="Close instruments"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            data-terminal-symbol-search
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-lg border border-border-primary bg-transparent text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {/* Category dropdown */}
      <div className="shrink-0 px-3 pt-2 pb-3 relative" ref={catRef}>
        <button
          type="button"
          onClick={() => setCatOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border-primary bg-transparent text-[13px] font-semibold text-text-primary hover:bg-white/[0.03] transition-colors"
        >
          <span>{currentLabel}</span>
          <ChevronDown
            size={16}
            className={clsx('text-text-tertiary transition-transform', catOpen && 'rotate-180')}
          />
        </button>
        {catOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 z-40 bg-bg-base border border-border-primary rounded-lg py-1 shadow-2xl max-h-[60vh] overflow-y-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategory(c.id);
                  setCatOpen(false);
                }}
                className={clsx(
                  'w-full text-left px-4 py-2.5 text-[14px] transition-colors',
                  c.id === category
                    ? 'bg-white/[0.04] text-text-primary font-semibold'
                    : 'text-text-primary hover:bg-white/[0.04]',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table header */}
      <div className="shrink-0 grid grid-cols-[20px_minmax(80px,1.2fr)_minmax(60px,1fr)_minmax(60px,1fr)_36px] gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary border-b border-border-primary">
        <div></div>
        <div>Symbol</div>
        <div className="text-right">Bid</div>
        <div className="text-right">Ask</div>
        <div className="text-right">1D</div>
      </div>

      {/* Table rows */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-text-tertiary px-4 text-center">
            No instruments in this category
          </div>
        ) : (
          rows.map((symbol) => {
            const tick = prices[symbol];
            const digits = getDigits(symbol);
            const sel = symbol === selectedSymbol;
            const flash = bidFlash[symbol];
            const open = dayOpenRef.current[symbol] ?? tick?.bid ?? 0;
            const change = tick && open > 0 ? ((tick.bid - open) / open) * 100 : 0;
            const isUp = change >= 0;
            const isStarred = starred.has(symbol);

            return (
              <button
                key={symbol}
                type="button"
                onClick={() => handleRowClick(symbol)}
                className={clsx(
                  'w-full grid grid-cols-[20px_minmax(80px,1.2fr)_minmax(60px,1fr)_minmax(60px,1fr)_36px] gap-2 px-3 py-2.5 text-left transition-colors items-center border-l-[3px]',
                  sel ? 'bg-accent/[0.07] border-l-accent' : 'border-l-transparent hover:bg-white/[0.04]',
                )}
              >
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => toggleStar(symbol, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleStar(symbol, e as any); }}
                  className={clsx(
                    'shrink-0 transition-colors cursor-pointer',
                    isStarred ? 'text-accent' : 'text-text-tertiary/40 hover:text-text-tertiary',
                  )}
                  aria-label="Star"
                >
                  <Star className="w-3.5 h-3.5" fill={isStarred ? 'currentColor' : 'none'} />
                </span>

                <div className="flex items-center gap-2 min-w-0">
                  <SymbolIcon symbol={symbol} size={18} />
                  <span className="text-[13px] font-bold text-text-primary font-mono truncate">{symbol}</span>
                </div>

                <div
                  className={clsx(
                    'text-right text-[12.5px] font-mono font-semibold tabular-nums',
                    flash === 'up'
                      ? 'text-buy'
                      : flash === 'down'
                        ? 'text-sell'
                        : 'text-text-primary',
                  )}
                >
                  {tick ? tick.bid.toFixed(digits) : '—'}
                </div>

                <div className="text-right text-[12.5px] font-mono text-text-secondary tabular-nums">
                  {tick ? tick.ask.toFixed(digits) : '—'}
                </div>

                <div
                  className={clsx(
                    'text-right text-[11px] font-semibold tabular-nums',
                    isUp ? 'text-buy' : 'text-sell',
                  )}
                >
                  {tick ? (isUp ? '↑' : '↓') : ''}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

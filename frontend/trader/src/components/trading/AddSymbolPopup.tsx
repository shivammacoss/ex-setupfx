'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, Search, Star, GripVertical, Ban } from 'lucide-react';
import { useTradingStore, type InstrumentInfo } from '@/stores/tradingStore';
import SymbolIcon from './SymbolIcon';

type CategoryId =
  | 'favorites'
  | 'most_traded'
  | 'majors'
  | 'metals'
  | 'crypto'
  | 'indices'
  | 'energy'
  | 'minors'
  | 'all';

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'favorites', label: 'Favorites' },
  { id: 'most_traded', label: 'Most traded' },
  { id: 'majors', label: 'Majors' },
  { id: 'minors', label: 'Minors' },
  { id: 'metals', label: 'Metals' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'indices', label: 'Indices' },
  { id: 'energy', label: 'Energy' },
  { id: 'all', label: 'All' },
];

const DEFAULT_FAVORITES = ['BTCUSD', 'XAUUSD', 'XAGUSD', 'ETHUSD', 'USOIL', 'USDJPY', 'EURUSD', 'USTEC'];
const MOST_TRADED = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'AUDUSD', 'USOIL', 'NAS100', 'US30', 'ETHUSD'];
const MAJORS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
const MINORS = ['EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'AUDJPY', 'CADJPY', 'NZDJPY', 'AUDNZD'];
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
  USTEC: 'US Tech 100 Index',
  UK100: 'FTSE 100 Index',
  GER40: 'DAX 40 Index',
  BTCUSD: 'Bitcoin vs US Dollar',
  ETHUSD: 'Ethereum vs US Dollar',
  LTCUSD: 'Litecoin vs US Dollar',
  XRPUSD: 'Ripple vs US Dollar',
  SOLUSD: 'Solana vs US Dollar',
};

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

function categoryFilter(category: CategoryId, allSymbols: string[], instruments: InstrumentInfo[], starred: Set<string>): string[] {
  switch (category) {
    case 'favorites': {
      const userStars = Array.from(starred);
      const list = userStars.length > 0 ? userStars : DEFAULT_FAVORITES;
      return list.filter((s) => allSymbols.includes(s));
    }
    case 'most_traded':
      return MOST_TRADED.filter((s) => allSymbols.includes(s));
    case 'majors':
      return MAJORS.filter((s) => allSymbols.includes(s));
    case 'minors':
      return MINORS.filter((s) => allSymbols.includes(s));
    case 'metals':
      return allSymbols.filter((s) => METALS.includes(s));
    case 'energy':
      return allSymbols.filter((s) => ENERGY.includes(s) || s.includes('OIL') || s.includes('GAS'));
    case 'indices':
      return allSymbols.filter((s) => INDICES.includes(s));
    case 'crypto':
      return allSymbols.filter((s) => {
        const inst = instruments.find((i) => i.symbol === s);
        const seg = String(inst?.segment || '').toLowerCase();
        return seg.includes('crypto') || ['BTC', 'ETH', 'LTC', 'XRP', 'SOL', 'DOG', 'BCH', 'BNB', 'ADA'].some((p) => s.startsWith(p));
      });
    case 'all':
    default:
      return allSymbols;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (symbol: string) => void;
  /** existing tabs — used to disable already-open symbols */
  existingTabs: string[];
  /** anchor offset from the left edge of the popup container */
  anchorLeft?: number;
}

export default function AddSymbolPopup({ open, onClose, onSelect, existingTabs, anchorLeft = 0 }: Props) {
  const { instruments, prices } = useTradingStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryId>('favorites');
  const [catOpen, setCatOpen] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(() => readStarred());
  const popupRef = useRef<HTMLDivElement>(null);

  const allSymbols = useMemo(
    () => Array.from(new Set([...instruments.map((i) => i.symbol)])),
    [instruments],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return allSymbols.filter((s) => {
        const inst = instruments.find((i) => i.symbol === s);
        const hay = `${s} ${inst?.display_name || ''} ${SYMBOL_DESC[s] || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return categoryFilter(category, allSymbols, instruments, starred);
  }, [search, category, allSymbols, instruments, starred]);

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

  if (!open) return null;

  const currentLabel = CATEGORIES.find((c) => c.id === category)?.label ?? 'Favorites';

  return (
    <div
      ref={popupRef}
      className="absolute top-[60px] z-[90] w-[480px] max-w-[95vw] bg-card border border-border-primary rounded-xl shadow-2xl overflow-hidden"
      style={{ left: anchorLeft }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
          Instruments
        </span>
      </div>

      {/* Search + category */}
      <div className="px-3 pb-3 grid grid-cols-[1fr_180px] gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-lg border border-border-primary bg-bg-input text-text-primary placeholder:text-text-tertiary outline-none focus:border-warning"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            className="w-full h-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border-primary bg-bg-input text-[13px] font-semibold text-text-primary hover:bg-bg-hover transition-colors"
          >
            <span className="truncate">{currentLabel}</span>
            <ChevronDown size={14} className={clsx('text-text-tertiary transition-transform', catOpen && 'rotate-180')} />
          </button>
          {catOpen && (
            <div className="absolute right-0 top-full mt-1 w-full bg-card border border-border-primary rounded-lg py-1 z-10 shadow-xl">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategory(c.id);
                    setCatOpen(false);
                  }}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-[13px] hover:bg-bg-hover transition-colors',
                    c.id === category ? 'text-text-primary font-semibold' : 'text-text-secondary',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[20px_minmax(110px,1fr)_minmax(160px,1.4fr)_30px] gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary border-b border-border-primary">
        <div></div>
        <div>Symbol</div>
        <div>Description</div>
        <div></div>
      </div>

      {/* Rows */}
      <div className="max-h-[420px] overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-text-tertiary">
            {search ? `No symbols match "${search}"` : 'No symbols in this category'}
          </div>
        ) : (
          rows.map((symbol) => {
            const inst = instruments.find((i) => i.symbol === symbol);
            const desc = SYMBOL_DESC[symbol] || inst?.display_name || symbol;
            const isStarred = starred.has(symbol);
            const isOpen = existingTabs.includes(symbol);
            const tick = prices[symbol];
            const isClosed = !tick;

            return (
              <button
                key={symbol}
                type="button"
                disabled={isOpen}
                onClick={() => {
                  if (isOpen) return;
                  onSelect(symbol);
                  onClose();
                }}
                className={clsx(
                  'w-full grid grid-cols-[20px_minmax(110px,1fr)_minmax(160px,1.4fr)_30px] gap-2 px-3 py-2.5 text-left items-center transition-colors',
                  isOpen
                    ? 'bg-bg-secondary text-text-tertiary cursor-not-allowed'
                    : 'hover:bg-bg-hover text-text-primary',
                )}
              >
                <GripVertical size={14} className="text-text-tertiary" />
                <div className="flex items-center gap-2 min-w-0">
                  <SymbolIcon symbol={symbol} size={18} />
                  <span className="text-[13px] font-bold font-mono truncate">{symbol}</span>
                  {isClosed && <Ban size={12} className="text-text-tertiary shrink-0" aria-label="Market closed" />}
                </div>
                <div className="text-[12.5px] text-text-secondary truncate">{desc}</div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => toggleStar(symbol, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleStar(symbol, e as any); }}
                  className={clsx(
                    'shrink-0 transition-colors cursor-pointer text-center',
                    isStarred ? 'text-warning' : 'text-text-tertiary hover:text-text-secondary',
                  )}
                  aria-label="Star"
                >
                  <Star size={14} fill={isStarred ? 'currentColor' : 'none'} strokeWidth={1.85} />
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

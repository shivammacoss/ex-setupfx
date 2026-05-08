'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { ChevronRight, Maximize2, Minimize2, Search, X } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { TERMINAL_RESIZE, maxBottomPanelHeightPx } from '@/lib/terminalLayout';
import PanelResizeHandle from '@/components/trading/PanelResizeHandle';
import { useTradingStore, InstrumentInfo } from '@/stores/tradingStore';
import toast from 'react-hot-toast';
import { sounds, unlockAudio } from '@/lib/sounds';
import { getMarketStatus } from '@/lib/marketHours';
import { getDigits } from '@/lib/utils';
import api from '@/lib/api/client';
import { setPersistedTradingAccountId, getPersistedTradingAccountId, tradingTerminalUrl } from '@/lib/tradingNav';
import Watchlist from '@/components/trading/Watchlist';
import InstrumentsTable from '@/components/trading/InstrumentsTable';
import OrderPanel from '@/components/trading/OrderPanel';
import RiskCalculator from '@/components/trading/RiskCalculator';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import PositionsPanel from '@/components/trading/PositionsPanel';
import MobilePositionsPanel from '@/components/trading/MobilePositionsPanel';
import { ActiveAccountBadge } from '@/components/trading/ActiveAccountBadge';
import TerminalLeftRail, { type TerminalSpaceId } from '@/components/trading/TerminalLeftRail';
import TerminalTopBar from '@/components/trading/TerminalTopBar';
import EconomicCalendarPanel from '@/components/trading/EconomicCalendarPanel';
import PriceAlertsPanel from '@/components/trading/PriceAlertsPanel';
import TerminalSettingsPanel from '@/components/trading/TerminalSettingsPanel';

const AdvancedChart = dynamic(() => import('@/components/charts/AdvancedChart'), { ssr: false });
const TradingViewNewsTimeline = dynamic(() => import('@/components/charts/TradingViewNewsTimeline'), {
  ssr: false,
});

const ORDER_MIN = 250;
const ORDER_MAX = 560;
const MARKETS_MIN = 560;
const MARKETS_MAX = 1200;
const BOTTOM_MIN = 160;

export default function TradingTerminalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get('account');
  const {
    orderPanelWidth,
    bottomPanelHeight,
    terminalMarketsOpen,
    terminalNewsOpen,
    setTerminalMarketsOpen,
    setTerminalNewsOpen,
    setOrderPanelWidth,
    setBottomPanelHeight,
    toggleTerminalMarkets,
  } = useUIStore();

  useDocumentTitle();

  const [opW, setOpW] = useState(orderPanelWidth);
  const [bpH, setBpH] = useState(bottomPanelHeight);
  const [isMobile, setIsMobile] = useState(false);

  /** Snapshot at pointer-down: stable clamps while store updates mid-drag. */
  const layoutDragStartRef = useRef({ op: 0, bp: 0, vw: 0, colH: 0 });
  const centerColumnRef = useRef<HTMLDivElement>(null);
  const bottomRestoreRef = useRef(320);
  const [activeSpace, setActiveSpace] = useState<TerminalSpaceId>('balanced');
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [terminalCalcOpen, setTerminalCalcOpen] = useState(false);
  const [terminalCalendarOpen, setTerminalCalendarOpen] = useState(false);
  const [terminalAlertsOpen, setTerminalAlertsOpen] = useState(false);
  const [terminalSettingsOpen, setTerminalSettingsOpen] = useState(false);

  const snapshotLayout = useCallback(() => {
    const s = useUIStore.getState();
    const rect = centerColumnRef.current?.getBoundingClientRect();
    const col =
      rect?.height ??
      (typeof window !== 'undefined' ? window.innerHeight - 8 : 0);
    layoutDragStartRef.current = {
      op: s.orderPanelWidth,
      bp: s.bottomPanelHeight,
      vw: typeof window !== 'undefined' ? window.innerWidth : 0,
      colH: Math.max(120, col),
    };
  }, []);

  /** Between chart and order+markets rail: drag right widens the rail. */
  const onChartRailDrag = useCallback(
    (dx: number) => {
      const { op, vw } = layoutDragStartRef.current;
      const hardMax = terminalMarketsOpen ? MARKETS_MAX : ORDER_MAX;
      const hardMin = terminalMarketsOpen ? MARKETS_MIN : ORDER_MIN;
      const maxOp = Math.min(
        hardMax,
        vw - TERMINAL_RESIZE.handlesSlack - TERMINAL_RESIZE.chartMinWidth,
      );
      const next = Math.max(hardMin, Math.min(maxOp, op - dx));
      setOpW(next);
      setOrderPanelWidth(next);
    },
    [setOrderPanelWidth, terminalMarketsOpen],
  );

  const onBottomDrag = useCallback(
    (dy: number) => {
      const { bp, colH } = layoutDragStartRef.current;
      const maxBp = maxBottomPanelHeightPx(colH);
      const next = Math.max(BOTTOM_MIN, Math.min(maxBp, bp - dy));
      setBpH(next);
      setBottomPanelHeight(next);
    },
    [setBottomPanelHeight],
  );

  useEffect(() => {
    setOpW(orderPanelWidth);
  }, [orderPanelWidth]);

  /** Auto-size the right rail when switching to/from Markets view. */
  const orderWidthBeforeMarketsRef = useRef<number | null>(null);
  useEffect(() => {
    if (terminalMarketsOpen) {
      if (orderWidthBeforeMarketsRef.current == null) {
        orderWidthBeforeMarketsRef.current = opW;
      }
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1600;
      const target = Math.min(MARKETS_MAX, Math.max(MARKETS_MIN, Math.round(vw * 0.55)));
      setOpW(target);
      setOrderPanelWidth(target);
    } else if (orderWidthBeforeMarketsRef.current != null) {
      const restored = orderWidthBeforeMarketsRef.current;
      orderWidthBeforeMarketsRef.current = null;
      setOpW(restored);
      setOrderPanelWidth(restored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalMarketsOpen]);

  useEffect(() => {
    setBpH(bottomPanelHeight);
  }, [bottomPanelHeight]);

  useEffect(() => {
    if (!bottomCollapsed) bottomRestoreRef.current = bottomPanelHeight;
  }, [bottomPanelHeight, bottomCollapsed]);

  const applySpace = useCallback(
    (id: TerminalSpaceId) => {
      setActiveSpace(id);
      setBottomCollapsed(false);
      if (id === 'balanced') {
        setOrderPanelWidth(340);
        setOpW(340);
        setBottomPanelHeight(320);
        setBpH(320);
      } else if (id === 'chart') {
        setOrderPanelWidth(ORDER_MIN);
        setOpW(ORDER_MIN);
        setBottomPanelHeight(200);
        setBpH(200);
      } else {
        setOrderPanelWidth(480);
        setOpW(480);
        setBottomPanelHeight(360);
        setBpH(360);
      }
    },
    [setOrderPanelWidth, setBottomPanelHeight],
  );

  const onToggleBottomPanel = useCallback(() => {
    const s = useUIStore.getState();
    if (bottomCollapsed) {
      const h = Math.max(BOTTOM_MIN, bottomRestoreRef.current);
      setBottomPanelHeight(h);
      setBpH(h);
      setBottomCollapsed(false);
    } else {
      bottomRestoreRef.current = s.bottomPanelHeight;
      setBottomPanelHeight(BOTTOM_MIN);
      setBpH(BOTTOM_MIN);
      setBottomCollapsed(true);
    }
  }, [bottomCollapsed, setBottomPanelHeight]);

  const onFocusSymbolSearch = useCallback(() => {
    setTerminalNewsOpen(false);
    setTerminalMarketsOpen(true);
    setChartExpanded(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelector<HTMLInputElement>('[data-terminal-symbol-search]')?.focus();
      });
    });
  }, [setTerminalMarketsOpen, setTerminalNewsOpen]);

  const onPanelsSelectMarkets = useCallback(() => {
    setTerminalNewsOpen(false);
    setChartExpanded(false);
    setTerminalCalcOpen(false);
    setTerminalMarketsOpen(true);
  }, [setTerminalMarketsOpen, setTerminalNewsOpen]);

  const onPanelsSelectOrder = useCallback(() => {
    setTerminalNewsOpen(false);
    setChartExpanded(false);
    setTerminalCalcOpen(false);
    setTerminalMarketsOpen(false);
  }, [setTerminalMarketsOpen, setTerminalNewsOpen]);

  const onExpandFullChartFromRail = useCallback(() => {
    setTerminalNewsOpen(false);
    setTerminalMarketsOpen(false);
    setTerminalCalcOpen(false);
    setChartExpanded(true);
  }, [setTerminalMarketsOpen, setTerminalNewsOpen]);

  const onPanelsSelectNews = useCallback(() => {
    setChartExpanded(false);
    setTerminalCalcOpen(false);
    setTerminalNewsOpen(true);
  }, [setTerminalNewsOpen]);

  const onPanelsSelectCalc = useCallback(() => {
    setTerminalNewsOpen(false);
    setChartExpanded(false);
    setTerminalMarketsOpen(false);
    setTerminalCalcOpen(true);
  }, [setTerminalMarketsOpen, setTerminalNewsOpen]);
  const [lotSize, setLotSize] = useState('0.01');
  const [chartTabs, setChartTabs] = useState<string[]>([]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [mobileSymbolSearch, setMobileSymbolSearch] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const {
    selectedSymbol,
    prices,
    instruments,
    setSelectedSymbol,
    activeAccount,
    positions,
    placeOrder,
  } = useTradingStore();

  // Live floating P&L (sum of open positions). Recomputed when prices/positions change.
  const totalFloatingPnl = positions.reduce((sum, p) => {
    const tick = prices[p.symbol];
    if (!tick || !activeAccount) return sum + (Number(p.profit) || 0);
    const last = p.side === 'buy' ? Number(tick.bid) : Number(tick.ask);
    const open = Number(p.open_price);
    const lots = Number(p.lots) || 0;
    const contract = 100000;
    const direction = p.side === 'buy' ? 1 : -1;
    return sum + (last - open) * direction * lots * contract;
  }, 0);
  const equityVal = activeAccount
    ? activeAccount.balance + (activeAccount.credit || 0) + totalFloatingPnl
    : 0;
  const freeMarginVal = activeAccount ? equityVal - activeAccount.margin_used : 0;
  const marginLevelVal =
    activeAccount && activeAccount.margin_used > 0
      ? `${((equityVal / activeAccount.margin_used) * 100).toFixed(2)}%`
      : '—';

  const instrumentInfo = instruments.find((i: InstrumentInfo) => i.symbol === selectedSymbol);
  const mobileMarketStatus = getMarketStatus(selectedSymbol, (instrumentInfo as any)?.segment);
  /** Default `chart` so Trade opens chart + buy/sell (not symbol list only). Watchlist tab still passes view=watchlist. */
  const mobileView = searchParams.get('view') || 'chart';

  const accounts = useTradingStore((s) => s.accounts);

  useEffect(() => {
    if (accountId) {
      setPersistedTradingAccountId(accountId);
      return;
    }
    // No account in URL — auto-pick persisted or first account
    const persisted = getPersistedTradingAccountId();
    const target = persisted && accounts.find((a) => a.id === persisted)
      ? persisted
      : accounts[0]?.id;
    if (target) {
      router.replace(tradingTerminalUrl(target));
    }
  }, [accountId, accounts, router]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!chartExpanded || !isMobile) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [chartExpanded, isMobile]);

  useEffect(() => {
    if (!chartExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setChartExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chartExpanded]);

  // Sync selected symbol with tabs — use functional update to avoid stale closure duplicates
  useEffect(() => {
    if (selectedSymbol) {
      setChartTabs(prev => prev.includes(selectedSymbol) ? prev : [...prev, selectedSymbol]);
    }
  }, [selectedSymbol]);

  const removeTab = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    const nextTabs = chartTabs.filter(s => s !== symbol);
    setChartTabs(nextTabs);
    if (selectedSymbol === symbol && nextTabs.length > 0) {
      setSelectedSymbol(nextTabs[nextTabs.length - 1]);
    }
  };

  if (!accountId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-0 bg-bg-base">
        <p className="text-sm text-text-tertiary">Choose an account to trade…</p>
      </div>
    );
  }

  if (isMobile) {
    const digits = instruments.find((i: InstrumentInfo) => i.symbol === selectedSymbol)?.digits ?? 5;
    const price = prices[selectedSymbol];

    const handleLotChange = (val: number) => {
      const current = parseFloat(lotSize) || 0;
      const next = Math.max(0.01, +(current + val).toFixed(2));
      setLotSize(next.toFixed(2));
    };

    const placeMarketOrder = async (side: 'buy' | 'sell') => {
      unlockAudio();
      if (!activeAccount) {
        toast.error('No account selected');
        return;
      }
      if (!mobileMarketStatus.isOpen) {
        toast.error(mobileMarketStatus.reason || 'Market is closed');
        return;
      }
      if (!selectedSymbol?.trim()) {
        toast.error('Select a symbol');
        return;
      }
      const lots = parseFloat(lotSize);
      if (!Number.isFinite(lots) || lots <= 0) {
        toast.error('Invalid lot size');
        return;
      }
      // Optimistic: instant feedback, API fires in background
      sounds.orderPlaced();
      toast.success(`${side.toUpperCase()} ${lotSize} ${selectedSymbol}`);
      setOrderSubmitting(true);
      placeOrder({
        account_id: activeAccount.id,
        symbol: selectedSymbol,
        side,
        order_type: 'market',
        lots,
      }).catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : 'Order failed');
      }).finally(() => {
        setOrderSubmitting(false);
      });
    };

    return (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 pb-[70px] scrollbar-none bg-bg-base">
        <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col scrollbar-none">
          {mobileView === 'watchlist' && <Watchlist />}
          {mobileView === 'news' && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-bg-primary">
              <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border-glass bg-bg-secondary">
                <button
                  type="button"
                  onClick={() => router.push(tradingTerminalUrl(accountId, { view: 'chart' }))}
                  className="text-xs font-semibold text-buy"
                >
                  ← Chart
                </button>
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Live news</span>
                <span className="w-14" aria-hidden />
              </div>
              <div className="flex-1 min-h-0">
                <TradingViewNewsTimeline />
              </div>
            </div>
          )}
          {mobileView === 'chart' && (
            <div className="h-full flex flex-col min-h-0">
              {/* Dynamic Chart Tabs Header */}
              {!chartExpanded ? (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-bg-secondary border-b border-border-glass overflow-x-auto no-scrollbar scrollbar-none">
                {chartTabs.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={clsx(
                      'px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all border whitespace-nowrap flex items-center gap-2 group',
                      symbol === selectedSymbol
                        ? 'bg-bg-primary text-text-primary border-border-glass shadow-sm'
                        : 'bg-transparent text-text-tertiary border-transparent hover:text-text-primary'
                    )}
                  >
                    {symbol}
                    <div
                      onClick={(e) => removeTab(e, symbol)}
                      className="p-0.5 rounded-md hover:bg-sell/10 hover:text-sell transition-colors opacity-60 group-hover:opacity-100"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => { setMobileSymbolSearch(true); setMobileSearchQuery(''); setTimeout(() => mobileSearchRef.current?.focus(), 100); }}
                  className="shrink-0 w-10 h-[34px] flex items-center justify-center rounded-xl bg-bg-hover/80 text-text-primary border border-border-glass hover:bg-buy/10 transition-all active:scale-95"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(tradingTerminalUrl(accountId, { view: 'news' }))}
                  className="shrink-0 px-3 h-[34px] rounded-xl bg-bg-hover/80 text-text-primary border border-border-glass text-[10px] font-extrabold uppercase tracking-wide hover:bg-buy/10 transition-all active:scale-95"
                >
                  News
                </button>
              </div>
              ) : null}

              {/* ── Mobile Symbol Search Overlay ── */}
              {mobileSymbolSearch && (
                <div className="fixed inset-0 z-[90] flex flex-col bg-bg-base">
                  {/* Search header */}
                  <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-b border-border-glass bg-bg-secondary">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        ref={mobileSearchRef}
                        type="text"
                        value={mobileSearchQuery}
                        onChange={(e) => setMobileSearchQuery(e.target.value)}
                        placeholder="Search symbol..."
                        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-border-glass bg-bg-primary text-text-primary placeholder:text-text-tertiary outline-none focus:border-buy/50 focus:ring-1 focus:ring-buy/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileSymbolSearch(false)}
                      className="shrink-0 px-3 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Filtered instrument list */}
                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                    {(() => {
                      const q = mobileSearchQuery.toLowerCase().trim();
                      const matched = instruments.filter((inst: InstrumentInfo) =>
                        q === '' ? true : inst.symbol.toLowerCase().includes(q) || (inst.segment || '').toLowerCase().includes(q)
                      );
                      if (matched.length === 0 && q !== '') {
                        return (
                          <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Search className="w-10 h-10 text-text-tertiary/40" />
                            <p className="text-sm text-text-tertiary">No symbols match &ldquo;{mobileSearchQuery}&rdquo;</p>
                          </div>
                        );
                      }
                      return matched.map((inst: InstrumentInfo) => {
                        const tick = prices[inst.symbol];
                        const isInTabs = chartTabs.includes(inst.symbol);
                        return (
                          <button
                            key={inst.symbol}
                            type="button"
                            onClick={() => {
                              setSelectedSymbol(inst.symbol);
                              setChartTabs(prev => prev.includes(inst.symbol) ? prev : [...prev, inst.symbol]);
                              setMobileSymbolSearch(false);
                            }}
                            className={clsx(
                              'w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors',
                              isInTabs ? 'bg-buy/[0.06]' : 'hover:bg-bg-hover active:bg-buy/5',
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-text-primary font-mono">{inst.symbol}</span>
                                {isInTabs && <span className="text-buy text-[10px] font-bold">OPEN</span>}
                              </div>
                              <p className="text-xs text-text-tertiary mt-0.5 truncate uppercase tracking-wide">
                                {inst.segment || ''}
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-3">
                              {tick ? (
                                <span className="text-sm font-mono font-bold tabular-nums text-text-primary">
                                  {tick.bid.toFixed(inst.digits ?? 5)}
                                </span>
                              ) : null}
                              {!isInTabs && (
                                <span className="text-buy text-xs font-semibold">+ Open</span>
                              )}
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {!chartExpanded && activeAccount ? (
                <div className="sm:hidden shrink-0 px-3 py-1.5 border-b border-border-glass bg-bg-secondary/40">
                  <ActiveAccountBadge account={activeAccount} variant="compact" />
                </div>
              ) : null}

              <div
                className={clsx(
                  'flex flex-col flex-1 min-h-0 overflow-hidden bg-bg-primary',
                  chartExpanded &&
                    'fixed inset-0 z-[100] h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]',
                )}
              >
                {chartExpanded ? (
                  <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border-glass bg-bg-secondary">
                    <span className="text-sm font-bold text-text-primary truncate">{selectedSymbol || 'Chart'}</span>
                    <button
                      type="button"
                      onClick={() => setChartExpanded(false)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-text-secondary border border-border-glass hover:bg-bg-hover hover:text-text-primary"
                    >
                      <Minimize2 className="w-4 h-4 shrink-0" aria-hidden />
                      Close
                    </button>
                  </div>
                ) : null}
                <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
                  <AdvancedChart />
                </div>
              </div>

              {/* Refined Quick Trade Bottom Bar */}
              <div className="fixed bottom-[calc(4rem+max(0.5rem,env(safe-area-inset-bottom,0px)))] left-0 right-0 p-3 bg-bg-secondary/95 backdrop-blur-xl border-t border-border-glass z-50">
                {!mobileMarketStatus.isOpen && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sell/10 border border-sell/20">
                    <span className="text-[9px] font-bold text-sell uppercase tracking-wider">● CLOSED</span>
                    <span className="text-[10px] text-sell/80 truncate">{mobileMarketStatus.reason}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1 h-[52px]">
                   {/* SELL button */}
                   <button
                     type="button"
                     disabled={orderSubmitting || !mobileMarketStatus.isOpen}
                     onClick={() => placeMarketOrder('sell')}
                     className="flex-1 h-full bg-sell rounded-xl flex flex-col items-center justify-center shadow-lg shadow-sell/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none min-w-0"
                   >
                     <span className="text-white text-[14px] font-black uppercase tracking-[0.05em]">Sell</span>
                     <span className="text-white/70 text-[10px] font-mono font-bold leading-tight">{price?.bid.toFixed(digits) || '--'}</span>
                   </button>

                   {/* Lot size controls — center */}
                   <div className="shrink-0 flex flex-col items-center">
                      <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-wider leading-none mb-1">Lots</span>
                      <div className="flex items-center gap-1">
                         <button
                           onClick={() => handleLotChange(-0.01)}
                           className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-primary border border-border-glass text-text-primary active:scale-90 transition-transform"
                         >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/></svg>
                         </button>
                         <input
                           type="text"
                           inputMode="decimal"
                           value={lotSize}
                           onChange={(e) => {
                             const v = e.target.value;
                             if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setLotSize(v);
                           }}
                           onBlur={() => {
                             const n = parseFloat(lotSize);
                             if (!Number.isFinite(n) || n <= 0) setLotSize('0.01');
                             else setLotSize(n.toFixed(2));
                           }}
                           className="w-16 h-9 text-[15px] font-black font-mono text-center bg-bg-primary border-2 border-border-glass rounded-lg text-text-primary outline-none"
                         />
                         <button
                           onClick={() => handleLotChange(0.01)}
                           className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-primary border border-border-glass text-text-primary active:scale-90 transition-transform"
                         >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                         </button>
                      </div>
                   </div>

                   {/* BUY button */}
                   <button
                     type="button"
                     disabled={orderSubmitting || !mobileMarketStatus.isOpen}
                     onClick={() => placeMarketOrder('buy')}
                     className="flex-1 h-full bg-buy rounded-xl flex flex-col items-center justify-center shadow-lg shadow-buy/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none min-w-0"
                   >
                     <span className="text-white text-[14px] font-black uppercase tracking-[0.05em]">Buy</span>
                     <span className="text-white/70 text-[10px] font-mono font-bold leading-tight">{price?.ask.toFixed(digits) || '--'}</span>
                   </button>
                </div>
              </div>
            </div>
          )}
          {mobileView === 'order' && <MobilePositionsPanel />}
        </div>
      </div>
    );
  }

  // Desktop layout — Exness style:
  //   [ rail | (instruments panel when open) | chart | order panel ]
  //   [ ─── positions/pending/closed strip ─── ]
  // The Buy/Sell order panel is ALWAYS pinned to the right; the instruments
  // table slides out next to the left rail when the user clicks the list icon.
  const ORDER_PANEL_WIDTH = 320;
  const INSTRUMENTS_PANEL_WIDTH = 320;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative pt-[env(safe-area-inset-top,0px)] bg-bg-base">
      {/* Exness-style dark top bar with symbol tabs + balance + deposit */}
      <TerminalTopBar
        chartTabs={chartTabs}
        onSelectTab={(s) => setSelectedSymbol(s)}
        onCloseTab={(s) => {
          const next = chartTabs.filter((x) => x !== s);
          setChartTabs(next);
          if (selectedSymbol === s && next.length > 0) setSelectedSymbol(next[next.length - 1]);
        }}
        onAddSymbol={(sym) => {
          // Add to chart tabs and select it. The chartTabs effect on
          // selectedSymbol already de-dupes so even direct selectSymbol works.
          setChartTabs((prev) => (prev.includes(sym) ? prev : [...prev, sym]));
          setSelectedSymbol(sym);
        }}
      />

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
      <TerminalLeftRail
        terminalMarketsOpen={terminalMarketsOpen}
        onToggleMarkets={() => toggleTerminalMarkets()}
        chartExpanded={chartExpanded}
        terminalNewsOpen={terminalNewsOpen}
        terminalCalendarOpen={terminalCalendarOpen}
        terminalAlertsOpen={terminalAlertsOpen}
        terminalSettingsOpen={terminalSettingsOpen}
        onPanelsSelectMarkets={() => {
          setTerminalNewsOpen(false);
          setChartExpanded(false);
          setTerminalCalcOpen(false);
          setTerminalCalendarOpen(false);
          setTerminalAlertsOpen(false);
          setTerminalSettingsOpen(false);
          setTerminalMarketsOpen(!terminalMarketsOpen);
        }}
        onPanelsSelectCalendar={() => {
          setTerminalNewsOpen(false);
          setChartExpanded(false);
          setTerminalCalcOpen(false);
          setTerminalMarketsOpen(false);
          setTerminalAlertsOpen(false);
          setTerminalSettingsOpen(false);
          setTerminalCalendarOpen(!terminalCalendarOpen);
        }}
        onPanelsSelectAlerts={() => {
          setTerminalNewsOpen(false);
          setChartExpanded(false);
          setTerminalCalcOpen(false);
          setTerminalMarketsOpen(false);
          setTerminalCalendarOpen(false);
          setTerminalSettingsOpen(false);
          setTerminalAlertsOpen(!terminalAlertsOpen);
        }}
        onPanelsSelectSettings={() => {
          setTerminalNewsOpen(false);
          setChartExpanded(false);
          setTerminalCalcOpen(false);
          setTerminalMarketsOpen(false);
          setTerminalCalendarOpen(false);
          setTerminalAlertsOpen(false);
          setTerminalSettingsOpen(!terminalSettingsOpen);
        }}
      />

      {/* Instruments panel — slides out next to the rail when open */}
      {terminalMarketsOpen && (
        <div
          className="shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-bg-base border-r border-border-primary"
          style={{ width: INSTRUMENTS_PANEL_WIDTH }}
        >
          <InstrumentsTable
            onExitMarkets={() => setTerminalMarketsOpen(false)}
            onViewNews={() => setTerminalMarketsOpen(false)}
          />
        </div>
      )}

      {/* Economic Calendar panel — slides out next to the rail when open */}
      {terminalCalendarOpen && (
        <div
          className="shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-bg-base border-r border-border-primary"
          style={{ width: INSTRUMENTS_PANEL_WIDTH }}
        >
          <EconomicCalendarPanel onClose={() => setTerminalCalendarOpen(false)} />
        </div>
      )}

      {/* Price Alerts panel — slides out next to the rail when open */}
      {terminalAlertsOpen && (
        <div
          className="shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-bg-base border-r border-border-primary"
          style={{ width: INSTRUMENTS_PANEL_WIDTH }}
        >
          <PriceAlertsPanel onClose={() => setTerminalAlertsOpen(false)} />
        </div>
      )}

      {/* Settings panel — slides out next to the rail when open */}
      {terminalSettingsOpen && (
        <div
          className="shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-bg-base border-r border-border-primary"
          style={{ width: INSTRUMENTS_PANEL_WIDTH }}
        >
          <TerminalSettingsPanel onClose={() => setTerminalSettingsOpen(false)} />
        </div>
      )}

      {/* Center column — chart on top, positions strip below.
          The order panel is OUTSIDE this column so the positions strip only
          spans the chart's width, not the full screen (matches Exness). */}
      <div
        ref={centerColumnRef}
        className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 relative z-0"
      >
        <div className="flex flex-col overflow-hidden bg-bg-base flex-1 min-w-0 min-h-0 relative isolate z-0">
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden relative bg-bg-base">
            <AdvancedChart />
            {/* Sell/Buy inside chart — below TV toolbar, only when order panel is closed */}
            {!selectedSymbol && chartTabs.length > 0 && <ChartOverlaySellBuy symbol={chartTabs[chartTabs.length - 1]} />}
          </div>
        </div>

        {/* Bottom — positions / pending / closed (only under the chart) */}
        <PanelResizeHandle
          axis="horizontal"
          hitSize={TERMINAL_RESIZE.bottomHandleHitPx}
          onDragStart={snapshotLayout}
          onDrag={onBottomDrag}
          className="z-[80]"
        />
        <div
          className="shrink-0 overflow-hidden min-h-0 flex flex-col relative z-[1] border-t border-border-primary"
          style={{ height: bpH }}
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <PositionsPanel variant="terminal" />
          </div>
        </div>
      </div>

      {/* Right — Buy/Sell order panel — only visible when a symbol is selected */}
      {selectedSymbol && (
        <div
          className="shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-bg-base border-l border-border-primary"
          style={{ width: ORDER_PANEL_WIDTH }}
        >
          <OrderPanel />
        </div>
      )}
      </div>

      {/* Account status footer — Equity / Free Margin / Balance / Margin / Margin level */}
      <div className="shrink-0 h-[36px] flex items-center justify-between gap-6 px-4 border-t border-border-primary bg-bg-base text-[12px]">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none no-scrollbar">
          <FooterMetric label="Equity" value={`${equityVal.toFixed(2)} USD`} />
          <FooterMetric label="Free Margin" value={`${freeMarginVal.toFixed(2)} USD`} />
          <FooterMetric label="Balance" value={`${(activeAccount?.balance ?? 0).toFixed(2)} USD`} />
          <FooterMetric label="Margin" value={`${(activeAccount?.margin_used ?? 0).toFixed(2)} USD`} />
          <FooterMetric label="Margin level:" value={marginLevelVal} dim />
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-text-tertiary">
          <span className="inline-flex items-end gap-[2px]">
            <span className="w-[3px] h-[6px] bg-warning rounded-sm" />
            <span className="w-[3px] h-[9px] bg-warning rounded-sm" />
            <span className="w-[3px] h-[12px] bg-warning rounded-sm" />
            <span className="w-[3px] h-[15px] bg-warning rounded-sm" />
          </span>
          <span className="text-[10px] tabular-nums">5.6.1</span>
        </div>
      </div>
    </div>
  );
}


/** Floating Sell/Buy inside the chart (top-right). One-click trading.
 *  Clicking Sell/Buy places a 0.01 lot market order immediately.
 *  The > arrow opens the full OrderPanel for more options. */
function ChartOverlaySellBuy({ symbol }: { symbol: string }) {
  const { prices, activeAccount, positions, setPositions, refreshPositions, refreshAccount, setSelectedSymbol } = useTradingStore();
  const [busy, setBusy] = useState(false);
  const tick = prices[symbol];
  const digits = getDigits(symbol);
  const sellPrice = tick?.bid ?? 0;
  const buyPrice = tick?.ask ?? 0;
  const spread = tick ? Math.abs(buyPrice - sellPrice) : 0;
  const spreadPips = spread * Math.pow(10, digits >= 3 ? digits - 1 : digits);

  const quickOrder = async (side: 'buy' | 'sell') => {
    if (!activeAccount || !tick || busy) return;
    unlockAudio();
    sounds.orderPlaced();
    setBusy(true);
    const price = side === 'buy' ? buyPrice : sellPrice;
    const lots = 0.01;
    const optimistic = {
      id: `optim-${Date.now().toString(36)}`,
      account_id: activeAccount.id,
      symbol,
      side,
      lots,
      open_price: price,
      current_price: price,
      swap: 0,
      commission: 0,
      profit: 0,
      trade_type: 'market',
      created_at: new Date().toISOString(),
    } as (typeof positions)[number];
    const prev = positions;
    setPositions([optimistic, ...prev]);
    try {
      await api.post('/orders/', {
        account_id: activeAccount.id,
        symbol,
        order_type: 'market',
        side,
        lots,
      });
      toast.success(`${side.toUpperCase()} ${lots} ${symbol}`);
      await Promise.all([refreshPositions(), refreshAccount()]);
    } catch (e: any) {
      setPositions(prev);
      toast.error(e?.message || 'Order failed');
    } finally {
      setBusy(false);
    }
  };

  if (!symbol || !tick) return null;

  return (
    <div className="absolute top-1 right-1 z-[50] flex items-center gap-0">
      <button
        type="button"
        disabled={busy}
        onClick={() => void quickOrder('sell')}
        className="flex items-center gap-1.5 px-3 py-1 rounded-l bg-[#ef4444] hover:bg-[#dc2626] text-white text-[12px] font-bold tabular-nums transition-colors disabled:opacity-50"
      >
        <span className="text-[10px] font-semibold opacity-80">Sell</span>
        <span>{sellPrice.toFixed(digits)}</span>
      </button>
      <span className="px-1.5 py-1 bg-bg-primary text-[10px] text-text-tertiary font-mono tabular-nums">
        {spreadPips.toFixed(1)}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void quickOrder('buy')}
        className="flex items-center gap-1.5 px-3 py-1 rounded-r bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-bold tabular-nums transition-colors disabled:opacity-50"
      >
        <span className="text-[10px] font-semibold opacity-80">Buy</span>
        <span>{buyPrice.toFixed(digits)}</span>
      </button>
      <button
        type="button"
        onClick={() => setSelectedSymbol(symbol)}
        className="flex items-center justify-center w-7 h-[30px] ml-0.5 rounded bg-bg-hover hover:bg-bg-secondary text-text-tertiary hover:text-text-primary transition-colors"
        title="Open order panel"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function FooterMetric({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5 shrink-0 whitespace-nowrap">
      <span className="text-text-tertiary text-[12px]">{label}</span>
      <span className={`font-mono tabular-nums text-[12.5px] font-semibold ${dim ? 'text-text-tertiary' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}

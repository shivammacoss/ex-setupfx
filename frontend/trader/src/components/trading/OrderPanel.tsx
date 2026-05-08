'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { ChevronDown, HelpCircle, Minus, Plus, X } from 'lucide-react';
import { useTradingStore } from '@/stores/tradingStore';
import { useUIStore } from '@/stores/uiStore';
import api from '@/lib/api/client';
import { sounds, unlockAudio } from '@/lib/sounds';
import { getDigits } from '@/lib/utils';
import { getMarketStatus } from '@/lib/marketHours';

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'pending';
type SLTPMode = 'price' | 'pips' | 'usd';
type FormType = 'regular' | 'one-click' | 'risk-calculator';

const FORM_TYPES: { id: FormType; label: string }[] = [
  { id: 'regular', label: 'Regular form' },
  { id: 'one-click', label: 'One-click form' },
  { id: 'risk-calculator', label: 'Risk calculator form' },
];

const SLTP_MODES: { id: SLTPMode; label: string }[] = [
  { id: 'price', label: 'Price' },
  { id: 'pips', label: 'Pips' },
  { id: 'usd', label: 'USD' },
];

function symbolColor(symbol: string): string {
  const u = symbol.toUpperCase();
  if (u.startsWith('BTC')) return '#f7931a';
  if (u.startsWith('ETH')) return '#627eea';
  if (u.startsWith('XAU')) return '#ffd700';
  if (u.startsWith('XAG')) return '#c0c0c0';
  if (u.includes('OIL')) return '#444';
  if (u.includes('NAS') || u.includes('US')) return '#1a73e8';
  return '#22c55e';
}

export default function OrderPanel() {
  const {
    selectedSymbol,
    setSelectedSymbol,
    prices,
    instruments,
    activeAccount,
    positions,
    setPositions,
    refreshPositions,
    refreshAccount,
    orderFormCloneDraft,
    setOrderFormCloneDraft,
  } = useTradingStore();

  const setTerminalMarketsOpen = useUIStore((s) => s.setTerminalMarketsOpen);
  const setTerminalNewsOpen = useUIStore((s) => s.setTerminalNewsOpen);

  const [side, setSide] = useState<OrderSide>('buy');
  const [orderTab, setOrderTab] = useState<OrderType>('market');
  const [lots, setLots] = useState('0.01');
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [tpMode, setTpMode] = useState<SLTPMode>('price');
  const [slMode, setSlMode] = useState<SLTPMode>('price');
  const [tpModeOpen, setTpModeOpen] = useState(false);
  const [slModeOpen, setSlModeOpen] = useState(false);
  const [confirmingSide, setConfirmingSide] = useState<OrderSide | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formType, setFormType] = useState<FormType>('regular');
  const [formTypeOpen, setFormTypeOpen] = useState(false);
  const [risk, setRisk] = useState('');
  const [riskMode, setRiskMode] = useState<SLTPMode>('usd');
  const [riskModeOpen, setRiskModeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const tpRef = useRef<HTMLDivElement>(null);
  const slRef = useRef<HTMLDivElement>(null);
  const formTypeRef = useRef<HTMLDivElement>(null);
  const riskRef = useRef<HTMLDivElement>(null);

  const tick = prices[selectedSymbol];
  const instrumentInfo = instruments.find((i) => i.symbol === selectedSymbol);
  const segment = (instrumentInfo as any)?.segment as string | undefined;
  const digits = getDigits(selectedSymbol);
  const contractSize = instrumentInfo?.contract_size || 100000;

  const marketStatus = useMemo(
    () => getMarketStatus(selectedSymbol, segment),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSymbol, segment, Math.floor(Date.now() / 60_000)],
  );

  const lotsNum = parseFloat(lots) || 0;
  const sellPrice = tick?.bid ?? 0;
  const buyPrice = tick?.ask ?? 0;
  const execPrice = side === 'buy' ? buyPrice : sellPrice;

  const marginRequired = useMemo(() => {
    if (!execPrice || !activeAccount) return 0;
    return (lotsNum * contractSize * execPrice) / activeAccount.leverage;
  }, [execPrice, lotsNum, activeAccount, contractSize]);

  const lotUsdValue = useMemo(() => {
    return lotsNum * contractSize * execPrice;
  }, [lotsNum, contractSize, execPrice]);

  /** Synthetic sentiment percentage for the Sell/Buy split bar.
   *  Real venues compute this from open interest; without that endpoint
   *  we hash the symbol so the value is stable per symbol. */
  const sentiment = useMemo(() => {
    let h = 0;
    for (let i = 0; i < selectedSymbol.length; i++) {
      h = (h * 31 + selectedSymbol.charCodeAt(i)) >>> 0;
    }
    const sellPct = 35 + (h % 35); // 35–69
    return { sell: sellPct, buy: 100 - sellPct };
  }, [selectedSymbol]);

  // Hydrate from "clone trade" deep-link
  useEffect(() => {
    if (!orderFormCloneDraft) return;
    const d = orderFormCloneDraft;
    setSelectedSymbol(d.symbol);
    setSide(d.side);
    setLots(Math.max(0.01, Number(d.lots.toFixed(4))).toString());
    if (d.stop_loss != null && !Number.isNaN(Number(d.stop_loss))) setSl(String(d.stop_loss));
    else setSl('');
    if (d.take_profit != null && !Number.isNaN(Number(d.take_profit))) setTp(String(d.take_profit));
    else setTp('');
    setOrderTab('market');
    setOrderFormCloneDraft(null);
    setTerminalMarketsOpen(false);
    setTerminalNewsOpen(false);
    toast.success('Order form filled — review and place');
  }, [orderFormCloneDraft, setSelectedSymbol, setOrderFormCloneDraft, setTerminalMarketsOpen, setTerminalNewsOpen]);

  // Close mode dropdowns on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (tpRef.current && !tpRef.current.contains(e.target as Node)) setTpModeOpen(false);
      if (slRef.current && !slRef.current.contains(e.target as Node)) setSlModeOpen(false);
      if (formTypeRef.current && !formTypeRef.current.contains(e.target as Node)) setFormTypeOpen(false);
      if (riskRef.current && !riskRef.current.contains(e.target as Node)) setRiskModeOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const adjustLots = (delta: number) => {
    setLots(Math.max(0.01, parseFloat((lotsNum + delta).toFixed(2))).toString());
  };

  const adjustNumeric = (value: string, setter: (v: string) => void, delta: number, decimals: number) => {
    const n = parseFloat(value);
    const base = Number.isFinite(n) ? n : execPrice;
    setter((base + delta).toFixed(decimals));
  };

  const placeOrder = async (orderSide: OrderSide) => {
    unlockAudio();
    if (!activeAccount) {
      toast.error('No account selected');
      return;
    }
    if (orderTab === 'market' && !marketStatus.isOpen) {
      toast.error(marketStatus.reason || 'Market is closed');
      return;
    }
    if (activeAccount.free_margin < marginRequired) {
      toast.error('Insufficient margin');
      return;
    }
    sounds.orderPlaced();
    toast.success(`${orderSide.toUpperCase()} ${lotsNum} ${selectedSymbol}`);

    const optimisticId = `optim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    let rollback: (() => void) | null = null;
    if (orderTab === 'market') {
      const nowIso = new Date().toISOString();
      const optimistic = {
        id: optimisticId,
        account_id: activeAccount.id,
        symbol: selectedSymbol,
        side: orderSide,
        lots: lotsNum,
        open_price: orderSide === 'buy' ? buyPrice : sellPrice,
        current_price: orderSide === 'buy' ? buyPrice : sellPrice,
        stop_loss: sl ? parseFloat(sl) : undefined,
        take_profit: tp ? parseFloat(tp) : undefined,
        swap: 0,
        commission: 0,
        profit: 0,
        trade_type: 'market',
        created_at: nowIso,
      } as (typeof positions)[number];
      const prev = positions;
      setPositions([optimistic, ...prev]);
      rollback = () => setPositions(prev);
    }

    setSubmitting(true);
    api
      .post('/orders/', {
        account_id: activeAccount.id,
        symbol: selectedSymbol,
        order_type: orderTab === 'market' ? 'market' : 'limit',
        side: orderSide,
        lots: lotsNum,
        stop_loss: sl ? parseFloat(sl) : undefined,
        take_profit: tp ? parseFloat(tp) : undefined,
      })
      .then(() => {
        Promise.all([refreshPositions(), refreshAccount()]).catch(() => {});
      })
      .catch((e: any) => {
        if (rollback) rollback();
        toast.error(e?.message || 'Order failed');
      })
      .finally(() => {
        // Reset order panel to fresh state so Buy/Sell are immediately usable
        // for the next trade without ghosted state. Without this, the side
        // highlight would stay on whichever button was pressed, and SL/TP
        // from the previous order would carry over to the next one.
        setSubmitting(false);
        setConfirmingSide(null);
        setSl('');
        setTp('');
      });
  };

  const triggerSide = (s: OrderSide) => {
    // Hard-reset transient flags so a stuck `submitting` from a previous
    // order (slow network, dropped response, double-click, etc.) doesn't
    // disable the Confirm button on this fresh click. User must always be
    // able to repeat Buy → Confirm → Buy → Confirm in sequence.
    setSubmitting(false);
    setSide(s);
    if (formType === 'one-click') {
      void placeOrder(s);
    } else {
      // Re-arm confirm even if it was already on this side — forces React
      // to flush any pending state updates from the prior order cycle.
      setConfirmingSide(null);
      // Small microtask delay so React batches these as separate renders
      // and the Confirm button is unmounted/remounted cleanly.
      queueMicrotask(() => setConfirmingSide(s));
    }
  };

  const onConfirm = () => {
    if (!confirmingSide) return;
    if (submitting) return; // guard against double-tap
    void placeOrder(confirmingSide);
  };

  // Reset transient state whenever the user switches symbol — stale
  // confirmingSide / submitting / SL/TP from the previous symbol must
  // never leak into the new one.
  useEffect(() => {
    setConfirmingSide(null);
    setSubmitting(false);
    setSl('');
    setTp('');
  }, [selectedSymbol]);

  if (!selectedSymbol) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-text-tertiary p-4">
        Select an instrument from the list
      </div>
    );
  }

  const dotColor = symbolColor(selectedSymbol);

  return (
    <div className="h-full min-h-0 flex flex-col overflow-y-auto overflow-x-hidden bg-bg-base text-text-primary scrollbar-none">
      {/* Header — symbol + close */}
      <div className="shrink-0 flex items-center justify-between px-3 py-3 border-b border-border-primary">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold shrink-0"
            style={{ backgroundColor: `${dotColor}33`, color: dotColor }}
          >
            {selectedSymbol.slice(0, 1)}
          </span>
          <span className="text-[14px] font-bold truncate">{selectedSymbol}</span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedSymbol('')}
          aria-label="Close order form"
          className="text-text-tertiary hover:text-text-primary p-1 rounded hover:bg-white/[0.04]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Form-type dropdown */}
      <div className="shrink-0 px-3 pt-2 relative" ref={formTypeRef}>
        <button
          type="button"
          onClick={() => setFormTypeOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border-primary bg-transparent text-[13px] font-semibold text-text-primary hover:bg-white/[0.03] transition-colors"
        >
          <span>{FORM_TYPES.find((f) => f.id === formType)?.label}</span>
          <ChevronDown size={15} className={clsx('text-text-tertiary transition-transform', formTypeOpen && 'rotate-180')} />
        </button>
        {formTypeOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 rounded-lg border border-border-primary bg-bg-base py-1 z-20">
            {FORM_TYPES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFormType(f.id); setFormTypeOpen(false); }}
                className={clsx(
                  'w-full text-left px-3 py-2 text-[13px] transition-colors',
                  formType === f.id
                    ? 'text-accent font-semibold bg-white/[0.04]'
                    : 'text-text-primary hover:bg-white/[0.04]',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========= REGULAR FORM ========= */}
      {formType === 'regular' && (
        <>
          <SellBuyButtons side={side} onSide={triggerSide} sellPrice={sellPrice} buyPrice={buyPrice} digits={digits} tick={tick} />
          <LotTooltip lotUsdValue={lotUsdValue} />
          <SentimentBar sentiment={sentiment} />
          <MarketPendingTabs orderTab={orderTab} setOrderTab={setOrderTab} />
          <VolumeInput lots={lots} setLots={setLots} adjustLots={adjustLots} lotsNum={lotsNum} />
          <SLTPField label="Take Profit" value={tp} onChange={setTp} mode={tpMode} setMode={setTpMode} modeOpen={tpModeOpen} setModeOpen={setTpModeOpen} modeRef={tpRef} onAdjust={(d) => adjustNumeric(tp, setTp, d, digits)} />
          <SLTPField label="Stop Loss" value={sl} onChange={setSl} mode={slMode} setMode={setSlMode} modeOpen={slModeOpen} setModeOpen={setSlModeOpen} modeRef={slRef} onAdjust={(d) => adjustNumeric(sl, setSl, d, digits)} />
          {confirmingSide && (
            <div className="shrink-0 px-3 pt-3 pb-3 space-y-1.5">
              <button type="button" onClick={onConfirm} disabled={submitting} className={clsx('w-full py-2.5 rounded-lg text-[13px] font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed', confirmingSide === 'buy' ? 'bg-accent hover:bg-accent-hover' : 'bg-error hover:bg-error-hover')}>
                {submitting ? 'Placing…' : `Confirm ${confirmingSide === 'buy' ? 'Buy' : 'Sell'} ${lotsNum} lots`}
              </button>
              <button type="button" onClick={() => setConfirmingSide(null)} disabled={submitting} className="w-full py-2 rounded-lg text-[12px] font-semibold text-text-primary border border-border-primary hover:bg-white/[0.04] transition-colors">Cancel</button>
              <p className="text-[11px] text-text-tertiary text-center">Fees: ≈ {(lotsNum * 14).toFixed(2)} USD</p>
            </div>
          )}
        </>
      )}

      {/* ========= ONE-CLICK FORM ========= */}
      {formType === 'one-click' && (
        <>
          <MarketPendingTabs orderTab={orderTab} setOrderTab={setOrderTab} />
          <VolumeInput lots={lots} setLots={setLots} adjustLots={adjustLots} lotsNum={lotsNum} />
          <SellBuyButtons side={side} onSide={triggerSide} sellPrice={sellPrice} buyPrice={buyPrice} digits={digits} tick={tick} large />
          <LotTooltip lotUsdValue={lotUsdValue} />
          <SentimentBar sentiment={sentiment} />
          {submitting && <p className="text-[11px] text-text-tertiary text-center px-3 pt-2 animate-pulse">Placing order…</p>}
          <div className="shrink-0 px-3 pt-3 space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Fees:</span>
              <span className="text-text-primary font-mono tabular-nums">≈ {(lotsNum * 0.14).toFixed(2)} USD <HelpCircle size={11} className="inline text-text-tertiary/60" /></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Leverage:</span>
              <span className="text-text-primary font-mono tabular-nums">1:{activeAccount?.leverage ?? 100} <HelpCircle size={11} className="inline text-text-tertiary/60" /></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Margin:</span>
              <span className="text-text-primary font-mono tabular-nums">{marginRequired.toFixed(2)} USD</span>
            </div>
            {moreOpen && (
              <>
                <SLTPField label="Take Profit" value={tp} onChange={setTp} mode={tpMode} setMode={setTpMode} modeOpen={tpModeOpen} setModeOpen={setTpModeOpen} modeRef={tpRef} onAdjust={(d) => adjustNumeric(tp, setTp, d, digits)} />
                <SLTPField label="Stop Loss" value={sl} onChange={setSl} mode={slMode} setMode={setSlMode} modeOpen={slModeOpen} setModeOpen={setSlModeOpen} modeRef={slRef} onAdjust={(d) => adjustNumeric(sl, setSl, d, digits)} />
              </>
            )}
            <button type="button" onClick={() => setMoreOpen((o) => !o)} className="text-text-secondary hover:text-text-primary text-[12px] flex items-center gap-0.5 transition-colors">
              {moreOpen ? 'Less' : 'More'} <ChevronDown size={12} className={clsx('transition-transform', moreOpen && 'rotate-180')} />
            </button>
          </div>
        </>
      )}

      {/* ========= RISK CALCULATOR FORM ========= */}
      {formType === 'risk-calculator' && (
        <>
          <SellBuyButtons side={side} onSide={triggerSide} sellPrice={sellPrice} buyPrice={buyPrice} digits={digits} tick={tick} />
          <LotTooltip lotUsdValue={lotUsdValue} />
          <SentimentBar sentiment={sentiment} />
          <MarketPendingTabs orderTab={orderTab} setOrderTab={setOrderTab} />
          <SLTPField label="Risk" value={risk} onChange={setRisk} mode={riskMode} setMode={setRiskMode} modeOpen={riskModeOpen} setModeOpen={setRiskModeOpen} modeRef={riskRef} onAdjust={(d) => adjustNumeric(risk, setRisk, d, 2)} />
          <SLTPField label="Stop Loss" value={sl} onChange={setSl} mode={slMode} setMode={setSlMode} modeOpen={slModeOpen} setModeOpen={setSlModeOpen} modeRef={slRef} onAdjust={(d) => adjustNumeric(sl, setSl, d, digits)} />
          <SLTPField label="Take Profit" value={tp} onChange={setTp} mode={tpMode} setMode={setTpMode} modeOpen={tpModeOpen} setModeOpen={setTpModeOpen} modeRef={tpRef} onAdjust={(d) => adjustNumeric(tp, setTp, d, digits)} />
          {confirmingSide && (
            <div className="shrink-0 px-3 pt-3 pb-3 space-y-1.5">
              <button type="button" onClick={onConfirm} disabled={submitting} className={clsx('w-full py-2.5 rounded-lg text-[13px] font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed', confirmingSide === 'buy' ? 'bg-accent hover:bg-accent-hover' : 'bg-error hover:bg-error-hover')}>
                {submitting ? 'Placing…' : `Confirm ${confirmingSide === 'buy' ? 'Buy' : 'Sell'}`}
              </button>
              <button type="button" onClick={() => setConfirmingSide(null)} disabled={submitting} className="w-full py-2 rounded-lg text-[12px] font-semibold text-text-primary border border-border-primary hover:bg-white/[0.04] transition-colors">Cancel</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SLTPField({
  label,
  value,
  onChange,
  mode,
  setMode,
  modeOpen,
  setModeOpen,
  modeRef,
  onAdjust,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode: SLTPMode;
  setMode: (m: SLTPMode) => void;
  modeOpen: boolean;
  setModeOpen: (v: boolean) => void;
  modeRef: React.RefObject<HTMLDivElement>;
  onAdjust: (delta: number) => void;
}) {
  return (
    <div className="shrink-0 px-3 pt-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-text-secondary">{label}</span>
        <HelpCircle size={13} className="text-text-tertiary/60" />
      </div>
      <div className="flex items-center bg-transparent border border-border-primary rounded-lg overflow-hidden">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Not set"
          className="flex-1 px-3 py-2.5 bg-transparent text-[13px] font-semibold text-text-primary outline-none tabular-nums placeholder:text-text-tertiary placeholder:font-normal"
        />
        <div className="relative" ref={modeRef}>
          <button
            type="button"
            onClick={() => setModeOpen(!modeOpen)}
            className="flex items-center gap-1 px-2.5 h-10 text-[12px] text-text-secondary border-l border-border-primary hover:bg-white/[0.04]"
          >
            {SLTP_MODES.find((m) => m.id === mode)?.label}
            <ChevronDown size={12} />
          </button>
          {modeOpen && (
            <div className="absolute right-0 top-full mt-1 w-24 bg-bg-base border border-border-primary rounded-lg py-1 z-10 shadow-xl">
              {SLTP_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMode(m.id);
                    setModeOpen(false);
                  }}
                  className={clsx(
                    'w-full text-left px-3 py-1.5 text-[12px] hover:bg-white/[0.04]',
                    mode === m.id ? 'text-accent font-semibold' : 'text-text-primary',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAdjust(-1)}
          className="w-9 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary border-l border-border-primary hover:bg-white/[0.04]"
          aria-label={`Decrease ${label}`}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => onAdjust(1)}
          className="w-9 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary border-l border-border-primary hover:bg-white/[0.04]"
          aria-label={`Increase ${label}`}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function SellBuyButtons({
  side,
  onSide,
  sellPrice,
  buyPrice,
  digits,
  tick,
  large,
}: {
  side: OrderSide;
  onSide: (s: OrderSide) => void;
  sellPrice: number;
  buyPrice: number;
  digits: number;
  tick: any;
  large?: boolean;
}) {
  return (
    <div className="shrink-0 px-3 pt-2">
      <div className="grid grid-cols-2 gap-0">
        <button
          type="button"
          onClick={() => onSide('sell')}
          className={clsx(
            'flex flex-col items-start gap-0.5 border rounded-l-lg rounded-r-none -mr-px transition-colors',
            large ? 'px-4 py-3' : 'px-3 py-2',
            side === 'sell'
              ? 'border-error bg-error/8'
              : 'border-border-primary bg-transparent hover:bg-error/5',
          )}
        >
          <span className="text-[12px] font-semibold text-error/80">Sell</span>
          <span className={clsx('font-bold tabular-nums text-error', large ? 'text-[18px]' : 'text-[16px]')}>
            {tick ? sellPrice.toFixed(digits) : '—'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSide('buy')}
          className={clsx(
            'flex flex-col items-end gap-0.5 border rounded-r-lg rounded-l-none transition-colors',
            large ? 'px-4 py-3' : 'px-3 py-2',
            side === 'buy'
              ? 'border-accent bg-accent/8'
              : 'border-border-primary bg-transparent hover:bg-accent/5',
          )}
        >
          <span className="text-[12px] font-semibold text-accent/80">Buy</span>
          <span className={clsx('font-bold tabular-nums text-accent', large ? 'text-[18px]' : 'text-[16px]')}>
            {tick ? buyPrice.toFixed(digits) : '—'}
          </span>
        </button>
      </div>
    </div>
  );
}

function LotTooltip({ lotUsdValue }: { lotUsdValue: number }) {
  return (
    <div className="flex justify-center -mt-3 relative z-10 px-3">
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-bg-base border border-border-primary text-text-primary tabular-nums">
        {lotUsdValue >= 1000
          ? `${(lotUsdValue / 1000).toFixed(2)}K USD`
          : `${lotUsdValue.toFixed(2)} USD`}
      </span>
    </div>
  );
}

function SentimentBar({ sentiment }: { sentiment: { sell: number; buy: number } }) {
  return (
    <div className="shrink-0 px-3 pt-2">
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-semibold text-error tabular-nums">{sentiment.sell}%</span>
        <div className="flex-1 flex h-[3px] rounded-full overflow-hidden bg-bg-primary">
          <div className="h-full bg-error" style={{ width: `${sentiment.sell}%` }} />
          <div className="h-full bg-accent" style={{ width: `${sentiment.buy}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-accent tabular-nums">{sentiment.buy}%</span>
      </div>
    </div>
  );
}

function MarketPendingTabs({ orderTab, setOrderTab }: { orderTab: OrderType; setOrderTab: (t: OrderType) => void }) {
  return (
    <div className="shrink-0 px-3 pt-2.5">
      <div className="grid grid-cols-2 bg-bg-primary rounded-lg p-1">
        {(['market', 'pending'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOrderTab(t)}
            className={clsx(
              'py-2 rounded-md text-[13px] font-semibold capitalize transition-colors',
              orderTab === t
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function VolumeInput({
  lots,
  setLots,
  adjustLots,
  lotsNum,
}: {
  lots: string;
  setLots: (v: string) => void;
  adjustLots: (delta: number) => void;
  lotsNum: number;
}) {
  return (
    <div className="shrink-0 px-3 pt-2.5">
      <label className="block text-[12px] font-medium text-text-secondary mb-1">Volume</label>
      <div className="flex items-center bg-transparent border border-border-primary rounded-lg overflow-hidden">
        <input
          type="text"
          inputMode="decimal"
          value={lots}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setLots(v);
          }}
          onBlur={() => {
            const n = parseFloat(lots);
            if (!Number.isFinite(n) || n <= 0) setLots('0.01');
            else setLots(n.toFixed(2));
          }}
          className="flex-1 px-3 py-2.5 bg-transparent text-[14px] font-semibold text-text-primary outline-none tabular-nums"
        />
        <span className="text-[11px] text-text-tertiary pr-2">Lots</span>
        <button
          type="button"
          onClick={() => adjustLots(-0.01)}
          className="w-9 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary border-l border-border-primary hover:bg-white/[0.04]"
          aria-label="Decrease lots"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => adjustLots(0.01)}
          className="w-9 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary border-l border-border-primary hover:bg-white/[0.04]"
          aria-label="Increase lots"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

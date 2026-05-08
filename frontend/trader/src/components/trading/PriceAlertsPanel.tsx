'use client';

import { useState } from 'react';
import { X, Plus, Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { useTradingStore } from '@/stores/tradingStore';
import { getDigits } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  createdAt: string;
  triggered?: boolean;
  triggeredAt?: string;
}

interface Props {
  onClose: () => void;
}

export default function PriceAlertsPanel({ onClose }: Props) {
  const { selectedSymbol, prices, instruments } = useTradingStore();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [creating, setCreating] = useState(false);
  const [newSymbol, setNewSymbol] = useState(selectedSymbol || 'XAUUSD');
  const [newCondition, setNewCondition] = useState<'above' | 'below'>('above');
  const [newPrice, setNewPrice] = useState('');

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const historyAlerts = alerts.filter((a) => a.triggered);

  const addAlert = () => {
    const p = parseFloat(newPrice);
    if (!p || p <= 0) {
      toast.error('Enter a valid price');
      return;
    }
    const alert: PriceAlert = {
      id: `alert-${Date.now().toString(36)}`,
      symbol: newSymbol,
      condition: newCondition,
      price: p,
      createdAt: new Date().toISOString(),
    };
    setAlerts((prev) => [alert, ...prev]);
    setCreating(false);
    setNewPrice('');
    toast.success(`Alert set: ${newSymbol} ${newCondition} ${p}`);
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const currentList = tab === 'active' ? activeAlerts : historyAlerts;

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-base text-white">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-border-primary">
        <span className="text-[13px] font-bold uppercase tracking-wider text-text-primary">
          Price Alerts
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-text-tertiary hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 px-3 pt-3">
        <div className="flex rounded-md bg-bg-primary border border-border-primary p-0.5">
          {(['active', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-1.5 text-[12px] font-semibold rounded-[4px] transition-colors capitalize',
                tab === t
                  ? 'bg-bg-hover text-white'
                  : 'text-text-tertiary hover:text-white',
              )}
            >
              {t === 'active' ? 'Active' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {currentList.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <Bell className="w-10 h-10 text-text-tertiary/40" strokeWidth={1.25} />
            <p className="text-[13px] font-bold text-text-primary">No alerts</p>
            <p className="text-[11px] text-text-tertiary text-center">
              Get notified instantly about price movements
            </p>
            {tab === 'active' && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-border-primary text-[12px] font-semibold text-text-primary hover:bg-white/[0.04] transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                New alert
              </button>
            )}
          </div>
        ) : (
          <div className="px-3 pt-3 space-y-2">
            {creating && (
              <div className="rounded-lg border border-border-primary bg-bg-primary p-3 space-y-2.5">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary block mb-1">
                    Symbol
                  </label>
                  <select
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full rounded-md bg-bg-base border border-border-primary px-2.5 py-1.5 text-[12px] text-text-primary outline-none"
                  >
                    {instruments.map((inst) => (
                      <option key={inst.symbol} value={inst.symbol}>
                        {inst.symbol}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary block mb-1">
                    Condition
                  </label>
                  <div className="flex rounded-md bg-bg-base border border-border-primary p-0.5">
                    {(['above', 'below'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCondition(c)}
                        className={clsx(
                          'flex-1 py-1 text-[11px] font-semibold rounded-[3px] capitalize transition-colors',
                          newCondition === c
                            ? 'bg-bg-hover text-white'
                            : 'text-text-tertiary hover:text-white',
                        )}
                      >
                        Price {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary block mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder={prices[newSymbol]?.bid?.toFixed(getDigits(newSymbol)) ?? '0.00'}
                    className="w-full rounded-md bg-bg-base border border-border-primary px-2.5 py-1.5 text-[12px] font-mono text-text-primary outline-none placeholder:text-text-tertiary/50 focus:border-[#2a3a45]"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setCreating(false); setNewPrice(''); }}
                    className="flex-1 py-1.5 rounded-md text-[11px] font-semibold bg-bg-hover text-text-primary hover:bg-bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addAlert}
                    className="flex-1 py-1.5 rounded-md text-[11px] font-semibold bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {currentList.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-2 rounded-lg border border-border-primary bg-bg-primary px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-text-primary">{alert.symbol}</p>
                  <p className="text-[10px] text-text-tertiary">
                    Price {alert.condition}{' '}
                    <span className="font-mono text-text-primary">
                      {alert.price.toFixed(getDigits(alert.symbol))}
                    </span>
                  </p>
                </div>
                {tab === 'active' && (
                  <button
                    type="button"
                    onClick={() => deleteAlert(alert.id)}
                    className="p-1 rounded text-text-tertiary hover:text-[#ef4444] transition-colors"
                    title="Delete alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {tab === 'active' && !creating && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-md border border-dashed border-border-primary text-[11px] font-semibold text-text-tertiary hover:text-white hover:border-[#2a3a45] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New alert
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

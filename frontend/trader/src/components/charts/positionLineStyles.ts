/**
 * Visual constants for chart position overlay (entry / SL / TP lines).
 * Single source of truth — tweak colors here, not in the component.
 */

// TradingView LineStyle enum: 0=Solid 1=Dotted 2=Dashed 3=LargeDashed 4=SparseDotted
export const LINE_STYLE_SOLID = 0;
export const LINE_STYLE_DASHED = 2;

export const POSITION_COLORS = {
  buyEntry: '#2962FF',
  sellEntry: '#FF6D00',
  sl: '#EF5350',
  tp: '#26A69A',
  profitPositive: '#16A34A',
  profitNegative: '#DC2626',
  textOnColor: '#FFFFFF',
} as const;

export const POSITION_LINE_WIDTH = 2;
export const POSITION_BODY_FONT = 'bold 11px Inter, Arial, sans-serif';
export const POSITION_QUANTITY_FONT = 'bold 11px Inter, Arial, sans-serif';

export function formatPrice(price: number, digits: number): string {
  if (!Number.isFinite(price)) return '-';
  const d = Number.isFinite(digits) && digits >= 0 ? Math.min(digits, 8) : 5;
  return price.toFixed(d);
}

export function formatProfit(profit: number, currency = 'USD'): string {
  if (!Number.isFinite(profit)) return `0.00 ${currency}`;
  const sign = profit >= 0 ? '+' : '-';
  return `${sign}${Math.abs(profit).toFixed(2)} ${currency}`;
}

export function formatLots(lots: number): string {
  if (!Number.isFinite(lots)) return '0.00';
  return lots.toFixed(2);
}

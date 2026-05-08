'use client';

import { useEffect, useRef } from 'react';
import { useTradingStore, type Position } from '@/stores/tradingStore';

/**
 * Draws horizontal lines on the chart for the entry, stop-loss and
 * take-profit levels of every open position on the active symbol.
 *
 * Uses the basic Drawings API (`createShape` with `horizontal_line`)
 * instead of Trading-Terminal's `createPositionLine`, because the latter
 * is blocked when a `broker_factory` is wired up to the widget — the
 * library throws an empty error and no line ever shows.
 *
 * `createShape` works in any widget mode and gives us a stable
 * `EntityId` we can update via `getShapeById(id).setPoints(...)` or
 * remove via `removeEntity(id)`.
 */

const COLORS = {
  buy: '#2962FF',
  sell: '#FF6D00',
  sl: '#EF5350',
  tp: '#26A69A',
} as const;

const LINE_STYLE = {
  solid: 0,
  dashed: 2,
} as const;

interface ShapeSet {
  entryId: string;
  slId: string | null;
  tpId: string | null;
  lastEntryPrice: number;
  lastSL: number | undefined;
  lastTP: number | undefined;
  lastLots: number;
  lastSide: 'buy' | 'sell';
}

export default function ChartPositionOverlay({ widget }: { widget: unknown }) {
  const positions = useTradingStore((s) => s.positions);
  const selectedSymbol = useTradingStore((s) => s.selectedSymbol);
  const shapesRef = useRef<Map<string, ShapeSet>>(new Map());
  // Track in-flight createShape promises so a positions tick doesn't
  // double-create lines for the same position.
  const creatingRef = useRef<Set<string>>(new Set());

  // Cleanup all shapes when widget changes / component unmounts.
  useEffect(() => {
    const w = widget as any;
    return () => {
      let chart: any = null;
      try { chart = w?.activeChart?.(); } catch {}
      for (const set of shapesRef.current.values()) {
        if (chart) {
          try { chart.removeEntity(set.entryId); } catch {}
          if (set.slId) try { chart.removeEntity(set.slId); } catch {}
          if (set.tpId) try { chart.removeEntity(set.tpId); } catch {}
        }
      }
      shapesRef.current.clear();
      creatingRef.current.clear();
    };
  }, [widget]);

  useEffect(() => {
    if (!widget) {
      // eslint-disable-next-line no-console
      console.log('[ChartOverlay] no widget yet');
      return;
    }
    const w = widget as any;

    let chart: any;
    try { chart = w.activeChart(); } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[ChartOverlay] activeChart() threw', e);
      return;
    }
    if (!chart || typeof chart.createShape !== 'function') {
      // eslint-disable-next-line no-console
      console.warn('[ChartOverlay] chart.createShape is not available', chart);
      return;
    }

    const symbolUpper = (selectedSymbol || '').toUpperCase();
    const symbolPositions = positions.filter(
      (p) => (p.symbol || '').toUpperCase() === symbolUpper,
    );

    // eslint-disable-next-line no-console
    console.log(
      `[ChartOverlay] sync — symbol=${symbolUpper}, total=${positions.length}, matching=${symbolPositions.length}`,
    );

    const currentIds = new Set(symbolPositions.map((p) => p.id));
    const existing = shapesRef.current;

    // 1. Remove shapes for closed / off-symbol positions.
    for (const [id, set] of Array.from(existing.entries())) {
      if (!currentIds.has(id)) {
        try { chart.removeEntity(set.entryId); } catch {}
        if (set.slId) try { chart.removeEntity(set.slId); } catch {}
        if (set.tpId) try { chart.removeEntity(set.tpId); } catch {}
        existing.delete(id);
      }
    }

    // 2. Create new or update existing shapes.
    for (const pos of symbolPositions) {
      const set = existing.get(pos.id);
      if (!set) {
        if (creatingRef.current.has(pos.id)) continue;
        creatingRef.current.add(pos.id);
        void createShapeSet(chart, pos)
          .then((newSet) => {
            if (newSet) existing.set(pos.id, newSet);
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error('[ChartOverlay] createShapeSet failed for', pos.id, e);
          })
          .finally(() => creatingRef.current.delete(pos.id));
      } else {
        void updateShapeSet(chart, set, pos);
      }
    }
  }, [widget, positions, selectedSymbol]);

  return null;
}

// ───────────────────────────── helpers ────────────────────────────────

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

const SHAPE_BASE = {
  lock: true,
  disableSelection: true,
  disableSave: true,
  disableUndo: true,
  zOrder: 'top' as const,
};

async function createShapeSet(chart: any, pos: Position): Promise<ShapeSet | null> {
  const t = nowSec();
  const entryColor = pos.side === 'buy' ? COLORS.buy : COLORS.sell;
  const lotsLabel = pos.lots.toFixed(2);

  let entryId: string;
  try {
    entryId = await chart.createShape(
      { time: t, price: pos.open_price },
      {
        shape: 'horizontal_line',
        text: `${pos.side.toUpperCase()} ${lotsLabel}`,
        ...SHAPE_BASE,
        overrides: {
          linecolor: entryColor,
          linestyle: LINE_STYLE.solid,
          linewidth: 2,
          showLabel: true,
          textcolor: entryColor,
          horzLabelsAlign: 'right',
          vertLabelsAlign: 'top',
          fontsize: 11,
          bold: true,
        },
      },
    );
    // eslint-disable-next-line no-console
    console.log('[ChartOverlay] entry line created for', pos.id, '@', pos.open_price);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[ChartOverlay] createShape entry threw for', pos.id, e);
    return null;
  }

  let slId: string | null = null;
  if (pos.stop_loss && pos.stop_loss > 0) {
    try {
      slId = await chart.createShape(
        { time: t, price: pos.stop_loss },
        {
          shape: 'horizontal_line',
          text: 'SL',
          ...SHAPE_BASE,
          overrides: {
            linecolor: COLORS.sl,
            linestyle: LINE_STYLE.dashed,
            linewidth: 1,
            showLabel: true,
            textcolor: COLORS.sl,
            horzLabelsAlign: 'right',
            vertLabelsAlign: 'top',
            fontsize: 11,
            bold: true,
          },
        },
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ChartOverlay] createShape SL threw for', pos.id, e);
    }
  }

  let tpId: string | null = null;
  if (pos.take_profit && pos.take_profit > 0) {
    try {
      tpId = await chart.createShape(
        { time: t, price: pos.take_profit },
        {
          shape: 'horizontal_line',
          text: 'TP',
          ...SHAPE_BASE,
          overrides: {
            linecolor: COLORS.tp,
            linestyle: LINE_STYLE.dashed,
            linewidth: 1,
            showLabel: true,
            textcolor: COLORS.tp,
            horzLabelsAlign: 'right',
            vertLabelsAlign: 'top',
            fontsize: 11,
            bold: true,
          },
        },
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ChartOverlay] createShape TP threw for', pos.id, e);
    }
  }

  return {
    entryId,
    slId,
    tpId,
    lastEntryPrice: pos.open_price,
    lastSL: pos.stop_loss,
    lastTP: pos.take_profit,
    lastLots: pos.lots,
    lastSide: pos.side,
  };
}

async function updateShapeSet(chart: any, set: ShapeSet, pos: Position) {
  const t = nowSec();

  // Entry line — re-position if open price changed.
  if (pos.open_price !== set.lastEntryPrice) {
    try {
      const api = chart.getShapeById(set.entryId);
      api?.setPoints([{ time: t, price: pos.open_price }]);
    } catch {}
    set.lastEntryPrice = pos.open_price;
  }

  // SL: create / update / remove based on current value.
  const slNow = pos.stop_loss && pos.stop_loss > 0 ? pos.stop_loss : undefined;
  if (slNow != null && set.slId) {
    if (slNow !== set.lastSL) {
      try {
        const api = chart.getShapeById(set.slId);
        api?.setPoints([{ time: t, price: slNow }]);
      } catch {}
      set.lastSL = slNow;
    }
  } else if (slNow != null && !set.slId) {
    try {
      const id = await chart.createShape(
        { time: t, price: slNow },
        {
          shape: 'horizontal_line',
          text: 'SL',
          ...SHAPE_BASE,
          overrides: {
            linecolor: COLORS.sl,
            linestyle: LINE_STYLE.dashed,
            linewidth: 1,
            showLabel: true,
            textcolor: COLORS.sl,
            horzLabelsAlign: 'right',
            vertLabelsAlign: 'top',
            fontsize: 11,
            bold: true,
          },
        },
      );
      set.slId = id;
      set.lastSL = slNow;
    } catch {}
  } else if (slNow == null && set.slId) {
    try { chart.removeEntity(set.slId); } catch {}
    set.slId = null;
    set.lastSL = undefined;
  }

  // TP: mirror of SL.
  const tpNow = pos.take_profit && pos.take_profit > 0 ? pos.take_profit : undefined;
  if (tpNow != null && set.tpId) {
    if (tpNow !== set.lastTP) {
      try {
        const api = chart.getShapeById(set.tpId);
        api?.setPoints([{ time: t, price: tpNow }]);
      } catch {}
      set.lastTP = tpNow;
    }
  } else if (tpNow != null && !set.tpId) {
    try {
      const id = await chart.createShape(
        { time: t, price: tpNow },
        {
          shape: 'horizontal_line',
          text: 'TP',
          ...SHAPE_BASE,
          overrides: {
            linecolor: COLORS.tp,
            linestyle: LINE_STYLE.dashed,
            linewidth: 1,
            showLabel: true,
            textcolor: COLORS.tp,
            horzLabelsAlign: 'right',
            vertLabelsAlign: 'top',
            fontsize: 11,
            bold: true,
          },
        },
      );
      set.tpId = id;
      set.lastTP = tpNow;
    } catch {}
  } else if (tpNow == null && set.tpId) {
    try { chart.removeEntity(set.tpId); } catch {}
    set.tpId = null;
    set.lastTP = undefined;
  }
}

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { X, ChevronDown, RefreshCw, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import {
  getCalendarQueryRange,
  type CalendarDayTab,
  type EconomicCalendarApiResponse,
  type EconomicCalendarEventDTO,
  type EconomicImpactLevel,
} from '@/lib/economic-calendar';

interface Props {
  onClose: () => void;
}

interface CalEvent {
  id: string;
  when: Date;
  region?: string;
  currency: string;
  flag: string;
  impact: EconomicImpactLevel;
  title: string;
  actual?: string;
  previous?: string;
  consensus?: string;
}

function dtoToCalEvent(d: EconomicCalendarEventDTO): CalEvent {
  return {
    id: d.id,
    when: new Date(d.datetime),
    region: d.region,
    currency: d.currency,
    flag: d.flag?.trim() ? d.flag : '·',
    impact: d.impact,
    title: d.title,
    actual: d.actual ?? undefined,
    previous: d.previous ?? undefined,
    consensus: d.consensus ?? undefined,
  };
}

function formatTime(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function formatDateHeader(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(d);
}

function ImpactBars({ impact }: { impact: EconomicImpactLevel }) {
  const n = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
  const color =
    impact === 'high' ? 'var(--color-error)' : impact === 'medium' ? 'var(--color-warning)' : 'var(--color-text-tertiary)';
  return (
    <div className="flex gap-2 bg-bg-secondary items-end shrink-0" title={`${impact} impact`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-[1px]"
          style={{
            height: `${8 + i * 3}px`,
            backgroundColor: i < n ? color : 'var(--color-bg-base)',
          }}
        />
      ))}
    </div>
  );
}

const COUNTRY_OPTIONS = [
  { value: 'all', label: 'All countries' },
  { value: 'USD', label: 'USD — United States' },
  { value: 'EUR', label: 'EUR — Eurozone' },
  { value: 'GBP', label: 'GBP — United Kingdom' },
  { value: 'JPY', label: 'JPY — Japan' },
  { value: 'AUD', label: 'AUD — Australia' },
  { value: 'CAD', label: 'CAD — Canada' },
  { value: 'CNY', label: 'CNY — China' },
  { value: 'CHF', label: 'CHF — Switzerland' },
  { value: 'NZD', label: 'NZD — New Zealand' },
];

export default function EconomicCalendarPanel({ onClose }: Props) {
  const [dayTab, setDayTab] = useState<CalendarDayTab>('today');
  const [country, setCountry] = useState('all');
  const [countryOpen, setCountryOpen] = useState(false);
  const [source, setSource] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = getCalendarQueryRange(dayTab);
    setLoading(true);

    fetch(`/api/economic-calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json() as Promise<EconomicCalendarApiResponse>;
      })
      .then((data) => {
        if (!cancelled) setSource(data.events.map(dtoToCalEvent));
      })
      .catch(() => {
        if (!cancelled) setSource([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [dayTab, tick]);

  const filtered = useMemo(() => {
    let list = [...source];
    if (country !== 'all') {
      list = list.filter((e) => e.currency === country);
    }
    return list.sort((a, b) => a.when.getTime() - b.when.getTime());
  }, [source, country]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of filtered) {
      const key = formatDateHeader(ev.when);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-base text-white">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-border-primary">
        <span className="text-[13px] font-bold uppercase tracking-wider text-text-primary">
          Economic Calendar
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="p-1 rounded text-text-tertiary hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-text-tertiary hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dropdown: Economic calendar type */}
      <div className="shrink-0 px-3 pt-2">
        <div className="w-full rounded-md bg-bg-primary border border-border-primary px-3 py-2 text-text-primary">
          Economic calendar
        </div>
      </div>

      {/* Country filter */}
      <div className="shrink-0 px-3 pt-2 relative">
        <button
          type="button"
          onClick={() => setCountryOpen(!countryOpen)}
          className="w-full flex items-center justify-between rounded-md bg-bg-primary border border-border-primary px-3 py-2 text-text-primary"
        >
          <span>{COUNTRY_OPTIONS.find((c) => c.value === country)?.label}</span>
          <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
        </button>
        {countryOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-bg-base border border-border-primary rounded-md shadow-xl max-h-48 overflow-y-auto">
            {COUNTRY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setCountry(opt.value); setCountryOpen(false); }}
                className={clsx(
                  'w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/[0.04] transition-colors',
                  country === opt.value ? 'text-white font-semibold' : 'text-text-tertiary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="shrink-0 flex items-center px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        <span className="flex-1" />
        <span className="w-14 text-center">Actual</span>
        <span className="w-14 text-center">Forecast</span>
        <span className="w-14 text-center">Previous</span>
      </div>

      {/* Events list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-text-tertiary">
            No events found.
          </div>
        ) : (
          Array.from(grouped.entries()).map(([dateLabel, events]) => (
            <div key={dateLabel}>
              <div className="sticky top-0 z-10 px-3 py-1.5 text-[11px] font-bold text-text-primary bg-bg-primary border-y border-border-primary">
                {dateLabel}
              </div>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="px-3 py-2.5 border-b border-border-primary/50 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 w-16 text-[11px] font-mono text-text-tertiary tabular-nums pt-0.5">
                      {formatTime(ev.when)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm leading-none">{ev.flag}</span>
                        <ImpactBars impact={ev.impact} />
                      </div>
                      <p className="font-medium text-text-primary leading-snug truncate">
                        {ev.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center mt-1 ml-16">
                    <span className="flex-1" />
                    <span className="w-14 text-center text-[11px] font-mono tabular-nums text-text-primary">
                      {ev.actual ?? '-'}
                    </span>
                    <span className="w-14 text-center text-[11px] font-mono tabular-nums text-text-tertiary">
                      {ev.consensus ?? '-'}
                    </span>
                    <span className="w-14 text-center text-[11px] font-mono tabular-nums text-text-tertiary">
                      {ev.previous ?? '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

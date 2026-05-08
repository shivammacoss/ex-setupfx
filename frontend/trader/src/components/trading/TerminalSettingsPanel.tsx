'use client';

import { useState } from 'react';
import { X, ChevronDown, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  onClose: () => void;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={clsx(
        'relative shrink-0 w-[38px] h-[20px] rounded-full transition-colors',
        on ? 'bg-primary' : 'bg-bg-hover',
      )}
    >
      <span
        className={clsx(
          'absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow transition-transform',
          on ? 'left-[20px]' : 'left-[2px]',
        )}
      />
    </button>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'shrink-0 w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center transition-colors',
        checked
          ? 'bg-[#3b82f6] border-[#3b82f6]'
          : 'bg-transparent border-[#3a4a55]',
      )}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-md bg-bg-primary border border-border-primary px-3 py-2.5 text-[13px] text-text-primary hover:border-[#2a3a45] transition-colors"
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown className="w-4 h-4 text-text-tertiary" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-bg-base border border-border-primary rounded-md shadow-xl max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={clsx(
                'w-full text-left px-3 py-2 text-[12px] hover:bg-white/[0.04] transition-colors',
                value === opt.value ? 'text-white font-semibold' : 'text-text-tertiary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TerminalSettingsPanel({ onClose }: Props) {
  // Show on chart
  const [showPriceAlerts, setShowPriceAlerts] = useState(true);
  const [showOpenPositions, setShowOpenPositions] = useState(true);
  const [showTPSL, setShowTPSL] = useState(false);
  const [showEconomicCalendar, setShowEconomicCalendar] = useState(true);

  // Calendar impact checkboxes
  const [impactHigh, setImpactHigh] = useState(true);
  const [impactMiddle, setImpactMiddle] = useState(false);
  const [impactLow, setImpactLow] = useState(false);
  const [impactLowest, setImpactLowest] = useState(false);

  // Sound effects
  const [soundPriceAlerts, setSoundPriceAlerts] = useState(false);
  const [soundClosingTPSL, setSoundClosingTPSL] = useState(false);

  // Trading settings
  const [autoTPSL, setAutoTPSL] = useState(false);

  // Dropdowns
  const [orderMode, setOrderMode] = useState('risk_calculator');
  const [priceSource, setPriceSource] = useState('bid');
  const [appearance, setAppearance] = useState('always_dark');
  const [timezone, setTimezone] = useState('UTC');

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-base text-white">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border-primary">
        <span className="text-[13px] font-bold uppercase tracking-wider text-text-primary">
          Settings
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-text-tertiary hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">

        {/* Show on chart */}
        <section>
          <h3 className="text-[12px] font-bold text-[#3b82f6] uppercase tracking-wider mb-3">
            Show on chart
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-primary">Price alerts</span>
              <Toggle on={showPriceAlerts} onChange={setShowPriceAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-primary">Open positions</span>
              <Toggle on={showOpenPositions} onChange={setShowOpenPositions} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-primary">TP / SL / Stop / Limit</span>
              <Toggle on={showTPSL} onChange={setShowTPSL} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-primary">Economic calendar</span>
              <Toggle on={showEconomicCalendar} onChange={setShowEconomicCalendar} />
            </div>

            {/* Calendar impact sub-options */}
            {showEconomicCalendar && (
              <div className="ml-4 space-y-3 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={impactHigh} onChange={setImpactHigh} />
                  <span className="text-[13px] text-text-primary">High impact</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={impactMiddle} onChange={setImpactMiddle} />
                  <span className="text-[13px] text-text-primary">Middle impact</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={impactLow} onChange={setImpactLow} />
                  <span className="text-[13px] text-text-primary">Low impact</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={impactLowest} onChange={setImpactLowest} />
                  <span className="text-[13px] text-text-primary">Lowest impact</span>
                </label>
              </div>
            )}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-primary" />

        {/* Sound effects */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">
              Sound effects
            </h3>
            <HelpCircle className="w-4 h-4 text-text-tertiary" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-primary">Price alerts</span>
              <Toggle on={soundPriceAlerts} onChange={setSoundPriceAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-primary">Closing by TP / SL / SO</span>
              <Toggle on={soundClosingTPSL} onChange={setSoundClosingTPSL} />
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-primary" />

        {/* Trading settings */}
        <section>
          <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider mb-3">
            Trading settings
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-primary">Set TP/SL automatically</span>
            <Toggle on={autoTPSL} onChange={setAutoTPSL} />
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-primary" />

        {/* Open order mode */}
        <section>
          <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider mb-2">
            Open order mode
          </h3>
          <Select
            value={orderMode}
            onChange={setOrderMode}
            options={[
              { value: 'regular', label: 'Regular form' },
              { value: 'one_click', label: 'One-click form' },
              { value: 'risk_calculator', label: 'Risk calculator form' },
            ]}
          />
        </section>

        {/* Price source */}
        <section>
          <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider mb-2">
            Price source
          </h3>
          <Select
            value={priceSource}
            onChange={setPriceSource}
            options={[
              { value: 'bid', label: 'Bid' },
              { value: 'ask', label: 'Ask' },
              { value: 'mid', label: 'Mid' },
            ]}
          />
        </section>

        {/* Divider */}
        <div className="border-t border-border-primary" />

        {/* Appearance */}
        <section>
          <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider mb-2">
            Appearance
          </h3>
          <Select
            value={appearance}
            onChange={setAppearance}
            options={[
              { value: 'always_dark', label: 'Always dark' },
              { value: 'always_light', label: 'Always light' },
              { value: 'system', label: 'System' },
            ]}
          />
        </section>

        {/* Time zone */}
        <section>
          <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider mb-2">
            Time zone
          </h3>
          <Select
            value={timezone}
            onChange={setTimezone}
            options={[
              { value: 'UTC', label: 'UTC' },
              { value: 'Asia/Kolkata', label: 'UTC+5:30 (India)' },
              { value: 'America/New_York', label: 'UTC-5 (New York)' },
              { value: 'Europe/London', label: 'UTC+0 (London)' },
              { value: 'Europe/Berlin', label: 'UTC+1 (Berlin)' },
              { value: 'Asia/Tokyo', label: 'UTC+9 (Tokyo)' },
              { value: 'Australia/Sydney', label: 'UTC+10 (Sydney)' },
            ]}
          />
        </section>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
    </div>
  );
}

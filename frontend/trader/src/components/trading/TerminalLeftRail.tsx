'use client';

import { List, Calendar, AlarmClock, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export type TerminalSpaceId = 'balanced' | 'chart' | 'trading';

interface TerminalLeftRailProps {
  // Kept for backward compatibility with the terminal page; many handlers are now
  // unused here because Exness's terminal rail only shows 4 icons.
  activeSpace?: TerminalSpaceId;
  onSpaceChange?: (id: TerminalSpaceId) => void;
  terminalMarketsOpen: boolean;
  onToggleMarkets: () => void;
  bottomPanelCollapsed?: boolean;
  onToggleBottomPanel?: () => void;
  onFocusSymbolSearch?: () => void;
  chartExpanded?: boolean;
  terminalNewsOpen?: boolean;
  onPanelsSelectMarkets: () => void;
  onPanelsSelectOrder?: () => void;
  onExpandFullChart?: () => void;
  onPanelsSelectNews?: () => void;
  terminalCalcOpen?: boolean;
  onPanelsSelectCalc?: () => void;
  terminalCalendarOpen?: boolean;
  onPanelsSelectCalendar?: () => void;
  terminalAlertsOpen?: boolean;
  onPanelsSelectAlerts?: () => void;
  terminalSettingsOpen?: boolean;
  onPanelsSelectSettings?: () => void;
}

function RailBtn({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'w-10 h-10 rounded-md flex items-center justify-center transition-colors shrink-0',
        active
          ? 'bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(0,208,72,0.25)]'
          : 'text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Slim terminal left rail — Exness style. Only 4 icons:
 *  1. Instruments / markets (toggles the symbol list panel on the left)
 *  2. Economic calendar (opens external link in new tab)
 *  3. History (jumps to /trading/history)
 *  4. Settings (jumps to /profile)
 *
 * All other panels (news, risk calc, layout spaces) have been removed from the
 * visible rail to match the screenshot; their props are accepted for API
 * compatibility but no longer rendered.
 */
export default function TerminalLeftRail({
  terminalMarketsOpen,
  chartExpanded,
  terminalNewsOpen,
  terminalCalendarOpen,
  terminalAlertsOpen,
  terminalSettingsOpen,
  onPanelsSelectMarkets,
  onPanelsSelectCalendar,
  onPanelsSelectAlerts,
  onPanelsSelectSettings,
}: TerminalLeftRailProps) {
  const marketsActive = terminalMarketsOpen && !chartExpanded && !terminalNewsOpen;
  const calendarActive = !!terminalCalendarOpen;
  const alertsActive = !!terminalAlertsOpen;
  const settingsActive = !!terminalSettingsOpen;

  return (
    <aside
      className="shrink-0 w-[52px] flex flex-col items-center border-r border-border-primary bg-bg-base z-[5] py-2 gap-1"
      aria-label="Terminal toolbar"
    >
      <RailBtn
        title="Instruments"
        active={marketsActive}
        onClick={onPanelsSelectMarkets}
      >
        <List size={18} strokeWidth={1.75} />
      </RailBtn>

      <RailBtn
        title="Economic Calendar"
        active={calendarActive}
        onClick={onPanelsSelectCalendar}
      >
        <Calendar size={18} strokeWidth={1.75} />
      </RailBtn>

      <RailBtn
        title="Price Alerts"
        active={alertsActive}
        onClick={onPanelsSelectAlerts}
      >
        <AlarmClock size={18} strokeWidth={1.75} />
      </RailBtn>

      <RailBtn
        title="Settings"
        active={settingsActive}
        onClick={onPanelsSelectSettings}
      >
        <Settings size={18} strokeWidth={1.75} />
      </RailBtn>
    </aside>
  );
}

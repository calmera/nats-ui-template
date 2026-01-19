/**
 * State Indicator Component
 *
 * Feature: 002-event-driven-state
 *
 * Displays the current state sync status (synced, syncing, stale, offline).
 */

import { useAppState } from "../hooks/useAppState";
import type { SyncStatus } from "../types/state";

interface StateIndicatorProps {
  /** Optional additional className */
  className?: string;
  /** Whether to show only when not synced */
  hideWhenSynced?: boolean;
  /** Compact mode - just shows an icon */
  compact?: boolean;
}

interface StatusConfig {
  icon: React.ReactNode;
  label: string;
  bgClass: string;
  textClass: string;
}

const statusConfigs: Record<SyncStatus, StatusConfig> = {
  synced: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    label: "Synced",
    bgClass: "bg-success/10",
    textClass: "text-success",
  },
  syncing: {
    icon: (
      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
    label: "Syncing...",
    bgClass: "bg-info/10",
    textClass: "text-info",
  },
  stale: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    label: "Data may be outdated",
    bgClass: "bg-warning/10",
    textClass: "text-warning",
  },
  offline: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
        />
      </svg>
    ),
    label: "Offline - showing cached data",
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
  },
};

/**
 * Displays the current state synchronization status.
 *
 * @example
 * ```tsx
 * // Show only when not synced
 * <StateIndicator hideWhenSynced />
 *
 * // Compact mode (icon only)
 * <StateIndicator compact />
 *
 * // Full display
 * <StateIndicator />
 * ```
 */
export function StateIndicator({
  className = "",
  hideWhenSynced = false,
  compact = false,
}: StateIndicatorProps) {
  const { syncStatus } = useAppState();

  if (hideWhenSynced && syncStatus === "synced") {
    return null;
  }

  const config = statusConfigs[syncStatus];

  if (compact) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full p-1.5 ${config.bgClass} ${config.textClass} ${className}`}
        title={config.label}
      >
        {config.icon}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${config.bgClass} ${config.textClass} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}

export { StateIndicator as default };

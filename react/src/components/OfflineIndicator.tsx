/**
 * Offline Indicator Component
 *
 * Feature: 002-event-driven-state
 *
 * Displays a banner or badge when the app is offline.
 */

import { useAppState } from "../hooks/useAppState";

interface OfflineIndicatorProps {
  /** Display mode: 'banner' shows full-width bar, 'badge' shows compact indicator */
  mode?: "banner" | "badge";
  /** Optional additional className */
  className?: string;
}

/**
 * Displays offline status indicator.
 *
 * @example
 * ```tsx
 * // Full-width banner at top of page
 * <OfflineIndicator mode="banner" />
 *
 * // Compact badge
 * <OfflineIndicator mode="badge" />
 * ```
 */
export function OfflineIndicator({ mode = "banner", className = "" }: OfflineIndicatorProps) {
  const { syncStatus } = useAppState();

  if (syncStatus !== "offline") {
    return null;
  }

  if (mode === "badge") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ${className}`}
      >
        <OfflineIcon className="h-3 w-3" />
        Offline
      </span>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 bg-muted px-4 py-2 text-sm text-muted-foreground ${className}`}
    >
      <OfflineIcon className="h-4 w-4" />
      <span>You are offline. Viewing cached data. Some features may be unavailable.</span>
    </div>
  );
}

function OfflineIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
      />
    </svg>
  );
}

export { OfflineIndicator as default };

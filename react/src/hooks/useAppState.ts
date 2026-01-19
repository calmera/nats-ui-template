/**
 * useAppState Hook
 *
 * Feature: 002-event-driven-state
 *
 * Provides access to the materialized application state.
 */

import { useMemo } from "react";
import { useEventContext } from "../contexts/EventContext";
import type { Notification, Session, User } from "../types/events";
import type { SyncStatus } from "../types/state";

// =============================================================================
// Types
// =============================================================================

export interface AppStateValue {
  /** Current user or null if not loaded */
  user: User | null;
  /** All sessions indexed by ID */
  sessions: Record<string, Session>;
  /** All notifications indexed by ID */
  notifications: Record<string, Notification>;
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Timestamp of last successful sync */
  lastSyncedAt: number;
  /** Whether the state is loading */
  isLoading: boolean;
  /** Whether there was an error loading state */
  hasError: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether the state is considered stale */
  isStale: boolean;
  /** Number of unread, non-dismissed notifications */
  unreadNotificationCount: number;
  /** Number of active (non-expired) sessions */
  activeSessionCount: number;
  /** List of notifications as array, sorted by creation date (newest first) */
  notificationList: Notification[];
  /** List of active sessions as array */
  activeSessionList: Session[];
  /** Manually refresh state from backend */
  refreshState: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access the materialized application state.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { user, notifications, isStale, unreadNotificationCount } = useAppState();
 *
 *   if (!user) return <LoadingSpinner />;
 *
 *   return (
 *     <div>
 *       {isStale && <StalenessIndicator />}
 *       <h1>Welcome, {user.name}</h1>
 *       <Badge count={unreadNotificationCount} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useAppState(): AppStateValue {
  const {
    state,
    isLoading,
    hasError,
    isStale,
    unreadNotificationCount,
    activeSessionCount,
    refreshState,
  } = useEventContext();

  // Memoize notification list
  const notificationList = useMemo(() => {
    return Object.values(state.notifications)
      .filter((n) => !n.dismissed)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [state.notifications]);

  // Memoize active session list - use lastSyncedAt as reference time to avoid Date.now()
  // Sessions are filtered based on when state was last synced, which is semantically correct
  // since expired sessions would be removed on the next sync anyway
  const activeSessionList = useMemo(() => {
    // Use lastSyncedAt or a far-past timestamp as fallback
    const referenceTime = state.lastSyncedAt || 0;
    return Object.values(state.sessions)
      .filter((s) => s.expiresAt > referenceTime)
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }, [state.sessions, state.lastSyncedAt]);

  return {
    user: state.user,
    sessions: state.sessions,
    notifications: state.notifications,
    syncStatus: state.syncStatus,
    lastSyncedAt: state.lastSyncedAt,
    isLoading,
    hasError,
    error: state.error,
    isStale,
    unreadNotificationCount,
    activeSessionCount,
    notificationList,
    activeSessionList,
    refreshState,
  };
}

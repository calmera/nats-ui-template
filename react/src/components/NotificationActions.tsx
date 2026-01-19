/**
 * Notification Actions Component
 *
 * Feature: 002-event-driven-state
 *
 * Provides actions for dismissing and marking notifications as read.
 */

import { useCallback } from "react";
import { useCommand } from "../hooks/useCommand";
import type { Notification } from "../types/events";

interface NotificationActionsProps {
  /** The notification to act on */
  notification: Notification;
  /** Compact mode - shows only icons */
  compact?: boolean;
  /** Optional callback when action completes */
  onActionComplete?: () => void;
  /** Optional additional className */
  className?: string;
}

/**
 * Action buttons for a single notification.
 */
export function NotificationActions({
  notification,
  compact = false,
  onActionComplete,
  className = "",
}: NotificationActionsProps) {
  const { execute, isExecuting, canExecute } = useCommand();

  const handleMarkRead = useCallback(async () => {
    if (notification.read) return;

    const result = await execute("notification.markRead", {
      notificationId: notification.id,
    });

    if (result.success) {
      onActionComplete?.();
    }
  }, [notification.id, notification.read, execute, onActionComplete]);

  const handleDismiss = useCallback(async () => {
    if (notification.dismissed) return;

    const result = await execute("notification.dismiss", {
      notificationId: notification.id,
    });

    if (result.success) {
      onActionComplete?.();
    }
  }, [notification.id, notification.dismissed, execute, onActionComplete]);

  if (notification.dismissed) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {!notification.read && (
          <button
            onClick={handleMarkRead}
            disabled={!canExecute || isExecuting}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            title="Mark as read"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleDismiss}
          disabled={!canExecute || isExecuting}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          title="Dismiss"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!notification.read && (
        <button
          onClick={handleMarkRead}
          disabled={!canExecute || isExecuting}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckIcon className="h-3 w-3" />
          Mark Read
        </button>
      )}
      <button
        onClick={handleDismiss}
        disabled={!canExecute || isExecuting}
        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <XIcon className="h-3 w-3" />
        Dismiss
      </button>
    </div>
  );
}

interface MarkAllReadButtonProps {
  /** Number of unread notifications */
  unreadCount: number;
  /** Optional callback when action completes */
  onComplete?: () => void;
  /** Optional additional className */
  className?: string;
}

/**
 * Button to mark all notifications as read.
 */
export function MarkAllReadButton({
  unreadCount,
  onComplete,
  className = "",
}: MarkAllReadButtonProps) {
  const { execute, isExecuting, canExecute } = useCommand();

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;

    const result = await execute("notification.markAllRead", {});

    if (result.success) {
      onComplete?.();
    }
  }, [unreadCount, execute, onComplete]);

  if (unreadCount === 0) {
    return null;
  }

  return (
    <button
      onClick={handleMarkAllRead}
      disabled={!canExecute || isExecuting}
      className={`inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <CheckAllIcon className="h-4 w-4" />
      {isExecuting ? "Marking..." : `Mark all as read (${unreadCount})`}
    </button>
  );
}

// =============================================================================
// Icons
// =============================================================================

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckAllIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

export { NotificationActions as default };

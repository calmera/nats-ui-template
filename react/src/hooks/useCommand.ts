/**
 * useCommand Hook
 *
 * Feature: 002-event-driven-state
 *
 * Provides command execution with feedback and optimistic updates.
 */

import { useState, useCallback, useRef } from "react";
import type { CommandResult, UpdateProfileCommand } from "../types/commands";
import { isCommandSuccess } from "../types/commands";
import {
  getCommandService,
  validateUpdateProfilePayload,
  validateNotificationId,
} from "../services/nats/commands";
import { useAppState } from "./useAppState";
import { getStateStorage } from "../services/state/store";
import { appStateReducer } from "../services/state/reducer";

// =============================================================================
// Types
// =============================================================================

export interface UseCommandResult {
  /** Execute a command */
  execute: <T = unknown>(type: CommandType, payload: CommandPayload) => Promise<CommandResult<T>>;
  /** Whether a command is currently executing */
  isExecuting: boolean;
  /** The last error that occurred */
  error: string | null;
  /** Whether commands can be executed (online status) */
  canExecute: boolean;
  /** Clear the current error */
  clearError: () => void;
}

export type CommandType =
  | "user.updateProfile"
  | "notification.dismiss"
  | "notification.markRead"
  | "notification.markAllRead";

export type CommandPayload =
  | UpdateProfileCommand["payload"]
  | { notificationId: string }
  | Record<string, never>;

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for executing commands with feedback.
 *
 * @example
 * ```tsx
 * function ProfileEditor() {
 *   const { execute, isExecuting, error, canExecute } = useCommand();
 *
 *   const handleSave = async (name: string) => {
 *     const result = await execute('user.updateProfile', { name });
 *     if (result.success) {
 *       // State will update automatically via events
 *     }
 *   };
 *
 *   return (
 *     <form>
 *       {error && <p className="text-red-500">{error}</p>}
 *       <button disabled={!canExecute || isExecuting}>
 *         {isExecuting ? 'Saving...' : 'Save'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useCommand(): UseCommandResult {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optimisticStateRef = useRef<unknown>(null);
  const { syncStatus } = useAppState();

  const commandService = getCommandService();
  const storage = getStateStorage();
  const canExecute = commandService.isOnline() && syncStatus !== "offline";

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const rollbackOptimisticUpdate = useCallback(async () => {
    if (optimisticStateRef.current) {
      // Reload state from storage to rollback
      await storage.getState();
      optimisticStateRef.current = null;
    }
  }, [storage]);

  const execute = useCallback(
    async <T = unknown>(type: CommandType, payload: CommandPayload): Promise<CommandResult<T>> => {
      setError(null);

      // Check if online
      if (!canExecute) {
        const result: CommandResult<T> = {
          commandId: "",
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Cannot execute command while offline",
          },
          timestamp: Date.now(),
        };
        setError(result.error!.message);
        return result;
      }

      // Validate payload
      const validationError = validatePayload(type, payload);
      if (validationError) {
        const result: CommandResult<T> = {
          commandId: "",
          success: false,
          error: {
            code: "INVALID_PAYLOAD",
            message: validationError,
          },
          timestamp: Date.now(),
        };
        setError(validationError);
        return result;
      }

      setIsExecuting(true);

      try {
        // Apply optimistic update
        await applyOptimisticUpdate(type, payload, storage);

        // Execute command
        let result: CommandResult;

        switch (type) {
          case "user.updateProfile":
            result = await commandService.updateProfile(payload as UpdateProfileCommand["payload"]);
            break;
          case "notification.dismiss":
            result = await commandService.dismissNotification(
              (payload as { notificationId: string }).notificationId
            );
            break;
          case "notification.markRead":
            result = await commandService.markNotificationRead(
              (payload as { notificationId: string }).notificationId
            );
            break;
          case "notification.markAllRead":
            result = await commandService.markAllNotificationsRead();
            break;
          default:
            throw new Error(`Unknown command type: ${type}`);
        }

        if (!isCommandSuccess(result)) {
          // Rollback optimistic update on failure
          await rollbackOptimisticUpdate();
          setError(result.error.message);
        }

        return result as CommandResult<T>;
      } catch (err) {
        // Rollback optimistic update on error
        await rollbackOptimisticUpdate();

        const message = err instanceof Error ? err.message : "Command execution failed";
        setError(message);

        return {
          commandId: "",
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message,
          },
          timestamp: Date.now(),
        };
      } finally {
        setIsExecuting(false);
      }
    },
    [canExecute, commandService, storage, rollbackOptimisticUpdate]
  );

  return {
    execute,
    isExecuting,
    error,
    canExecute,
    clearError,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function validatePayload(type: CommandType, payload: CommandPayload): string | null {
  switch (type) {
    case "user.updateProfile": {
      const validation = validateUpdateProfilePayload(payload as UpdateProfileCommand["payload"]);
      return validation.valid ? null : validation.error!;
    }
    case "notification.dismiss":
    case "notification.markRead": {
      const validation = validateNotificationId(
        (payload as { notificationId: string }).notificationId
      );
      return validation.valid ? null : validation.error!;
    }
    case "notification.markAllRead":
      return null;
    default:
      return "Unknown command type";
  }
}

async function applyOptimisticUpdate(
  type: CommandType,
  payload: CommandPayload,
  storage: ReturnType<typeof getStateStorage>
): Promise<void> {
  const currentState = await storage.getState();

  switch (type) {
    case "user.updateProfile":
      if (currentState.user) {
        const updatedState = appStateReducer(currentState, {
          type: "user.updated",
          timestamp: Date.now(),
          payload: {
            id: currentState.user.id,
            changes: payload as UpdateProfileCommand["payload"],
          },
        });
        await storage.setState(updatedState);
      }
      break;

    case "notification.markRead": {
      const notifId = (payload as { notificationId: string }).notificationId;
      const notification = currentState.notifications[notifId];
      if (notification) {
        const updatedState = appStateReducer(currentState, {
          type: "notification.read",
          timestamp: Date.now(),
          payload: { notificationId: notifId },
        });
        await storage.setState(updatedState);
      }
      break;
    }

    case "notification.dismiss": {
      const notifId = (payload as { notificationId: string }).notificationId;
      const notification = currentState.notifications[notifId];
      if (notification) {
        const updatedState = appStateReducer(currentState, {
          type: "notification.dismissed",
          timestamp: Date.now(),
          payload: { notificationId: notifId },
        });
        await storage.setState(updatedState);
      }
      break;
    }

    case "notification.markAllRead": {
      let state = currentState;
      for (const notif of Object.values(currentState.notifications)) {
        if (!notif.read && !notif.dismissed) {
          state = appStateReducer(state, {
            type: "notification.read",
            timestamp: Date.now(),
            payload: { notificationId: notif.id },
          });
        }
      }
      await storage.setState(state);
      break;
    }
  }
}

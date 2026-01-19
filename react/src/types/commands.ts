/**
 * Command type definitions for Event-Driven State Management
 *
 * Feature: 002-event-driven-state
 *
 * These types define the contracts for commands sent via NATS request/response.
 */

// =============================================================================
// Base Command
// =============================================================================

export interface BaseCommand {
  id: string;
  type: string;
  timestamp: number;
}

// =============================================================================
// User Commands
// =============================================================================

export interface UpdateProfileCommand extends BaseCommand {
  type: "user.updateProfile";
  payload: {
    name?: string;
    avatarUrl?: string;
  };
}

// =============================================================================
// Notification Commands
// =============================================================================

export interface DismissNotificationCommand extends BaseCommand {
  type: "notification.dismiss";
  payload: {
    notificationId: string;
  };
}

export interface MarkNotificationReadCommand extends BaseCommand {
  type: "notification.markRead";
  payload: {
    notificationId: string;
  };
}

export interface MarkAllNotificationsReadCommand extends BaseCommand {
  type: "notification.markAllRead";
  payload: Record<string, never>;
}

// =============================================================================
// Command Union
// =============================================================================

export type AppCommand =
  | UpdateProfileCommand
  | DismissNotificationCommand
  | MarkNotificationReadCommand
  | MarkAllNotificationsReadCommand;

// =============================================================================
// Command Results
// =============================================================================

export type CommandErrorCode =
  | "INVALID_PAYLOAD"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface CommandError {
  code: CommandErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface CommandResultSuccess<T = unknown> {
  commandId: string;
  success: true;
  data: T;
  timestamp: number;
}

export interface CommandResultFailure {
  commandId: string;
  success: false;
  error: CommandError;
  timestamp: number;
}

export type CommandResult<T = unknown> = CommandResultSuccess<T> | CommandResultFailure;

// =============================================================================
// Type Guards
// =============================================================================

export function isCommandSuccess<T>(result: CommandResult<T>): result is CommandResultSuccess<T> {
  return result.success === true;
}

export function isCommandFailure(result: CommandResult): result is CommandResultFailure {
  return result.success === false;
}

// =============================================================================
// Command Factory
// =============================================================================

export function createCommand<T extends AppCommand>(type: T["type"], payload: T["payload"]): T {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    payload,
  } as T;
}

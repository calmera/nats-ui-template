/**
 * TypeScript Type Definitions for Event-Driven State Management
 *
 * Feature: 002-event-driven-state
 * Date: 2026-01-19
 *
 * These types define the contracts for events, commands, and state
 * used in the NATS-based event-driven architecture.
 */

// =============================================================================
// Domain Entities
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  updatedAt: number;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  deviceInfo?: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Application State
// =============================================================================

export type SyncStatus = 'synced' | 'syncing' | 'stale' | 'offline';

export interface AppState {
  user: User | null;
  sessions: Record<string, Session>;
  notifications: Record<string, Notification>;
  lastSyncedAt: number;
  syncStatus: SyncStatus;
}

// =============================================================================
// Theme
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemePreference {
  mode: ThemeMode;
  resolved: ResolvedTheme;
}

// =============================================================================
// Events
// =============================================================================

export interface BaseEvent {
  type: string;
  timestamp: number;
  correlationId?: string;
}

export interface UserUpdatedEvent extends BaseEvent {
  type: 'user.updated';
  payload: {
    id: string;
    changes: Partial<Omit<User, 'id'>>;
  };
}

export interface SessionCreatedEvent extends BaseEvent {
  type: 'session.created';
  payload: Session;
}

export interface SessionExpiredEvent extends BaseEvent {
  type: 'session.expired';
  payload: {
    sessionId: string;
    reason: 'timeout' | 'logout' | 'revoked';
  };
}

export interface NotificationReceivedEvent extends BaseEvent {
  type: 'notification.received';
  payload: Notification;
}

export interface NotificationReadEvent extends BaseEvent {
  type: 'notification.read';
  payload: {
    notificationId: string;
  };
}

export interface NotificationDismissedEvent extends BaseEvent {
  type: 'notification.dismissed';
  payload: {
    notificationId: string;
  };
}

export type AppEvent =
  | UserUpdatedEvent
  | SessionCreatedEvent
  | SessionExpiredEvent
  | NotificationReceivedEvent
  | NotificationReadEvent
  | NotificationDismissedEvent;

// Type guards for events
export function isUserUpdatedEvent(event: AppEvent): event is UserUpdatedEvent {
  return event.type === 'user.updated';
}

export function isSessionCreatedEvent(
  event: AppEvent
): event is SessionCreatedEvent {
  return event.type === 'session.created';
}

export function isSessionExpiredEvent(
  event: AppEvent
): event is SessionExpiredEvent {
  return event.type === 'session.expired';
}

export function isNotificationReceivedEvent(
  event: AppEvent
): event is NotificationReceivedEvent {
  return event.type === 'notification.received';
}

export function isNotificationReadEvent(
  event: AppEvent
): event is NotificationReadEvent {
  return event.type === 'notification.read';
}

export function isNotificationDismissedEvent(
  event: AppEvent
): event is NotificationDismissedEvent {
  return event.type === 'notification.dismissed';
}

// =============================================================================
// Commands
// =============================================================================

export interface BaseCommand {
  id: string;
  type: string;
  timestamp: number;
}

export interface UpdateProfileCommand extends BaseCommand {
  type: 'user.updateProfile';
  payload: {
    name?: string;
    avatarUrl?: string;
  };
}

export interface DismissNotificationCommand extends BaseCommand {
  type: 'notification.dismiss';
  payload: {
    notificationId: string;
  };
}

export interface MarkNotificationReadCommand extends BaseCommand {
  type: 'notification.markRead';
  payload: {
    notificationId: string;
  };
}

export interface MarkAllNotificationsReadCommand extends BaseCommand {
  type: 'notification.markAllRead';
  payload: Record<string, never>;
}

export type AppCommand =
  | UpdateProfileCommand
  | DismissNotificationCommand
  | MarkNotificationReadCommand
  | MarkAllNotificationsReadCommand;

// =============================================================================
// Command Results
// =============================================================================

export type CommandErrorCode =
  | 'INVALID_PAYLOAD'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

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

export type CommandResult<T = unknown> =
  | CommandResultSuccess<T>
  | CommandResultFailure;

// Type guard for command results
export function isCommandSuccess<T>(
  result: CommandResult<T>
): result is CommandResultSuccess<T> {
  return result.success === true;
}

export function isCommandFailure(
  result: CommandResult
): result is CommandResultFailure {
  return result.success === false;
}

// =============================================================================
// State Request/Response
// =============================================================================

export interface GetStateRequest {
  // Empty - authentication determines user
}

export interface GetStateResponse {
  user: User;
  sessions: Session[];
  notifications: Notification[];
  serverTime: number;
}

export interface GetStateError {
  error: {
    code: 'AUTH_REQUIRED' | 'INTERNAL_ERROR';
    message: string;
  };
}

// =============================================================================
// Cross-Tab Synchronization
// =============================================================================

export type TabSyncMessageType =
  | 'STATE_INVALIDATED'
  | 'THEME_CHANGED'
  | 'LOGOUT'
  | 'CONNECTION_STATUS_CHANGED';

export interface TabSyncMessage<T = unknown> {
  type: TabSyncMessageType;
  tabId: string;
  timestamp: number;
  payload?: T;
}

export interface StateInvalidatedPayload {
  keys: Array<'user' | 'sessions' | 'notifications'>;
}

export interface ThemeChangedPayload {
  mode: ThemeMode;
  resolved: ResolvedTheme;
}

export interface ConnectionStatusPayload {
  status: ConnectionStatus;
}

// =============================================================================
// Connection State
// =============================================================================

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export interface ConnectionError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface ConnectionState {
  status: ConnectionStatus;
  serverUrl: string | null;
  error: ConnectionError | null;
  lastConnectedAt: number | null;
  subscriptionActive: boolean;
}

// =============================================================================
// NATS Subject Configuration
// =============================================================================

export interface NatsSubjectConfig {
  namespace: string;
}

// =============================================================================
// Configuration Defaults
// =============================================================================

export const NATS_DEFAULTS = {
  /** Default command timeout in milliseconds (aligns with SC-003: 3s acknowledgment) */
  COMMAND_TIMEOUT_MS: 3000,
  /** Default state fetch timeout in milliseconds (aligns with SC-002: 5s initial load) */
  STATE_FETCH_TIMEOUT_MS: 5000,
  /** Reconnection timeout before showing error (aligns with SC-004) */
  RECONNECT_TIMEOUT_MS: 10000,
  /** Stale threshold - when to show staleness indicator */
  STALE_THRESHOLD_MS: 30000,
} as const;

export const createSubjects = (namespace: string) => ({
  events: {
    all: `${namespace}.events.>`,
    user: {
      updated: `${namespace}.events.user.updated`,
    },
    session: {
      created: `${namespace}.events.session.created`,
      expired: `${namespace}.events.session.expired`,
    },
    notification: {
      received: `${namespace}.events.notification.received`,
      read: `${namespace}.events.notification.read`,
      dismissed: `${namespace}.events.notification.dismissed`,
    },
  },
  commands: {
    user: {
      updateProfile: `${namespace}.commands.user.updateProfile`,
    },
    notification: {
      dismiss: `${namespace}.commands.notification.dismiss`,
      markRead: `${namespace}.commands.notification.markRead`,
      markAllRead: `${namespace}.commands.notification.markAllRead`,
    },
  },
  state: {
    get: `${namespace}.state.get`,
  },
});

// =============================================================================
// Command Factory Helpers
// =============================================================================

export function createCommand<T extends AppCommand>(
  type: T['type'],
  payload: T['payload']
): T {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    payload,
  } as T;
}

// =============================================================================
// State Reducer
// =============================================================================

export function appStateReducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'user.updated':
      if (!state.user || state.user.id !== event.payload.id) {
        return state;
      }
      return {
        ...state,
        user: { ...state.user, ...event.payload.changes },
      };

    case 'session.created':
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [event.payload.id]: event.payload,
        },
      };

    case 'session.expired': {
      const { [event.payload.sessionId]: _, ...remainingSessions } =
        state.sessions;
      return {
        ...state,
        sessions: remainingSessions,
      };
    }

    case 'notification.received':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [event.payload.id]: event.payload,
        },
      };

    case 'notification.read': {
      const notification = state.notifications[event.payload.notificationId];
      if (!notification) return state;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [event.payload.notificationId]: { ...notification, read: true },
        },
      };
    }

    case 'notification.dismissed': {
      const notification = state.notifications[event.payload.notificationId];
      if (!notification) return state;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [event.payload.notificationId]: { ...notification, dismissed: true },
        },
      };
    }

    default:
      return state;
  }
}

// =============================================================================
// Initial State
// =============================================================================

export const INITIAL_APP_STATE: AppState = {
  user: null,
  sessions: {},
  notifications: {},
  lastSyncedAt: 0,
  syncStatus: 'syncing',
};

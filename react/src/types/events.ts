/**
 * Event type definitions for Event-Driven State Management
 *
 * Feature: 002-event-driven-state
 *
 * These types define the contracts for events received from NATS subscriptions.
 */

// =============================================================================
// Domain Entities
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  account?: string; // Account NKey
  server?: string; // Server name
  cluster?: string; // Cluster name
  jetstream?: boolean; // JetStream enabled
  updatedAt: number;
}

/** Response from $SYS.REQ.USER.INFO */
export interface NatsUserInfoResponse {
  server: {
    name: string;
    host: string;
    id: string;
    cluster: string;
    domain: string;
    ver: string;
    tags: string[];
    jetstream: boolean;
    flags: number;
    seq: number;
    time: string;
  };
  data: {
    user: string;
    account: string;
  };
}

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  deviceInfo?: string;
}

export type NotificationType = "info" | "success" | "warning" | "error";

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
// Events
// =============================================================================

export interface BaseEvent {
  type: string;
  timestamp: number;
  correlationId?: string;
}

export interface UserUpdatedEvent extends BaseEvent {
  type: "user.updated";
  payload: {
    id: string;
    changes: Partial<Omit<User, "id">>;
  };
}

export interface SessionCreatedEvent extends BaseEvent {
  type: "session.created";
  payload: Session;
}

export interface SessionExpiredEvent extends BaseEvent {
  type: "session.expired";
  payload: {
    sessionId: string;
    reason: "timeout" | "logout" | "revoked";
  };
}

export interface NotificationReceivedEvent extends BaseEvent {
  type: "notification.received";
  payload: Notification;
}

export interface NotificationReadEvent extends BaseEvent {
  type: "notification.read";
  payload: {
    notificationId: string;
  };
}

export interface NotificationDismissedEvent extends BaseEvent {
  type: "notification.dismissed";
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

// =============================================================================
// Type Guards
// =============================================================================

export function isUserUpdatedEvent(event: AppEvent): event is UserUpdatedEvent {
  return event.type === "user.updated";
}

export function isSessionCreatedEvent(event: AppEvent): event is SessionCreatedEvent {
  return event.type === "session.created";
}

export function isSessionExpiredEvent(event: AppEvent): event is SessionExpiredEvent {
  return event.type === "session.expired";
}

export function isNotificationReceivedEvent(event: AppEvent): event is NotificationReceivedEvent {
  return event.type === "notification.received";
}

export function isNotificationReadEvent(event: AppEvent): event is NotificationReadEvent {
  return event.type === "notification.read";
}

export function isNotificationDismissedEvent(event: AppEvent): event is NotificationDismissedEvent {
  return event.type === "notification.dismissed";
}

// =============================================================================
// State Request/Response
// =============================================================================

// Empty type - authentication determines user
export type GetStateRequest = Record<string, never>;

export interface GetStateResponse {
  user: User;
  sessions: Session[];
  notifications: Notification[];
  serverTime: number;
}

export interface GetStateError {
  error: {
    code: "AUTH_REQUIRED" | "INTERNAL_ERROR";
    message: string;
  };
}

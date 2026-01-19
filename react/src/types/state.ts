/**
 * State type definitions for Event-Driven State Management
 *
 * Feature: 002-event-driven-state
 *
 * These types define the application state structure and sync status.
 */

import type { Notification, Session, User } from "./events";

// =============================================================================
// Application State
// =============================================================================

export type SyncStatus = "synced" | "syncing" | "stale" | "offline";

export interface AppState {
  user: User | null;
  sessions: Record<string, Session>;
  notifications: Record<string, Notification>;
  lastSyncedAt: number;
  syncStatus: SyncStatus;
}

// =============================================================================
// Initial State
// =============================================================================

export const INITIAL_APP_STATE: AppState = {
  user: null,
  sessions: {},
  notifications: {},
  lastSyncedAt: 0,
  syncStatus: "syncing",
};

// =============================================================================
// Theme
// =============================================================================

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemePreference {
  mode: ThemeMode;
  resolved: ResolvedTheme;
}

// =============================================================================
// Connection State
// =============================================================================

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

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
// Cross-Tab Sync Messages
// =============================================================================

export type TabSyncMessageType =
  | "STATE_INVALIDATED"
  | "THEME_CHANGED"
  | "LOGOUT"
  | "CONNECTION_STATUS_CHANGED";

export interface TabSyncMessage<T = unknown> {
  type: TabSyncMessageType;
  tabId: string;
  timestamp: number;
  payload?: T;
}

export interface StateInvalidatedPayload {
  keys: Array<"user" | "sessions" | "notifications">;
}

export interface ThemeChangedPayload {
  mode: ThemeMode;
  resolved: ResolvedTheme;
}

export interface ConnectionStatusPayload {
  status: ConnectionStatus;
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

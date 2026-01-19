/**
 * IndexedDB Database Schema using Dexie
 *
 * Feature: 002-event-driven-state
 *
 * Provides persistent storage for the materialized application state.
 */

import Dexie, { type Table } from "dexie";
import type { Notification, Session, User } from "../../types/events";

// =============================================================================
// Stored Entity Types (with storage marker)
// =============================================================================

export interface StoredUser extends User {
  _stored: boolean;
}

export interface StoredSession extends Session {
  _stored: boolean;
}

export interface StoredNotification extends Notification {
  _stored: boolean;
}

export interface StateMeta {
  key: string;
  lastSyncedAt: number;
  version: number;
}

// =============================================================================
// Database Class
// =============================================================================

export class AppDatabase extends Dexie {
  users!: Table<StoredUser, string>;
  sessions!: Table<StoredSession, string>;
  notifications!: Table<StoredNotification, string>;
  meta!: Table<StateMeta, string>;

  constructor() {
    super("nats-ui-state");

    this.version(1).stores({
      users: "id, email",
      sessions: "id, userId, expiresAt",
      notifications: "id, userId, read, dismissed, createdAt",
      meta: "key",
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const db = new AppDatabase();

// =============================================================================
// Database Utilities
// =============================================================================

/**
 * Check if IndexedDB is available in the current environment.
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Clear all data from the database.
 */
export async function clearDatabase(): Promise<void> {
  await db.transaction("rw", [db.users, db.sessions, db.notifications, db.meta], async () => {
    await db.users.clear();
    await db.sessions.clear();
    await db.notifications.clear();
    await db.meta.clear();
  });
}

/**
 * Get the last sync timestamp from meta.
 */
export async function getLastSyncedAt(): Promise<number> {
  const meta = await db.meta.get("appState");
  return meta?.lastSyncedAt ?? 0;
}

/**
 * Update the last sync timestamp.
 */
export async function setLastSyncedAt(timestamp: number): Promise<void> {
  await db.meta.put({
    key: "appState",
    lastSyncedAt: timestamp,
    version: 1,
  });
}

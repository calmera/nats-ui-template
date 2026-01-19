/**
 * State Storage Abstraction
 *
 * Feature: 002-event-driven-state
 *
 * Provides a unified interface for state storage with IndexedDB as primary
 * and in-memory fallback for environments where IndexedDB is unavailable.
 */

import type { Notification, Session, User } from "../../types/events";
import type { AppState } from "../../types/state";
import { INITIAL_APP_STATE } from "../../types/state";
import {
  db,
  isIndexedDBAvailable,
  setLastSyncedAt,
  type StoredNotification,
  type StoredSession,
} from "./database";

// =============================================================================
// State Storage Interface
// =============================================================================

export interface StateStorage {
  isAvailable: boolean;
  getState(): Promise<AppState>;
  setState(state: AppState): Promise<void>;
  updateUser(user: User | null): Promise<void>;
  updateSession(session: Session): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  updateNotification(notification: Notification): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  clear(): Promise<void>;
}

// =============================================================================
// In-Memory Fallback Storage
// =============================================================================

class InMemoryStorage implements StateStorage {
  private state: AppState = { ...INITIAL_APP_STATE };
  readonly isAvailable = false;

  async getState(): Promise<AppState> {
    return { ...this.state };
  }

  async setState(state: AppState): Promise<void> {
    this.state = { ...state };
  }

  async updateUser(user: User | null): Promise<void> {
    this.state = { ...this.state, user };
  }

  async updateSession(session: Session): Promise<void> {
    this.state = {
      ...this.state,
      sessions: { ...this.state.sessions, [session.id]: session },
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { [sessionId]: _removed, ...remaining } = this.state.sessions;
    void _removed; // Intentionally unused - destructuring to remove from object
    this.state = { ...this.state, sessions: remaining };
  }

  async updateNotification(notification: Notification): Promise<void> {
    this.state = {
      ...this.state,
      notifications: { ...this.state.notifications, [notification.id]: notification },
    };
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const { [notificationId]: _removed, ...remaining } = this.state.notifications;
    void _removed; // Intentionally unused - destructuring to remove from object
    this.state = { ...this.state, notifications: remaining };
  }

  async clear(): Promise<void> {
    this.state = { ...INITIAL_APP_STATE };
  }
}

// =============================================================================
// IndexedDB Storage
// =============================================================================

class IndexedDBStorage implements StateStorage {
  readonly isAvailable = true;

  async getState(): Promise<AppState> {
    const [users, sessions, notifications, meta] = await Promise.all([
      db.users.toArray(),
      db.sessions.toArray(),
      db.notifications.toArray(),
      db.meta.get("appState"),
    ]);

    const user = users[0] || null;
    const sessionMap: Record<string, Session> = {};
    const notificationMap: Record<string, Notification> = {};

    for (const s of sessions) {
      const { _stored: _sStored, ...session } = s;
      void _sStored; // Intentionally unused - stripping storage marker
      sessionMap[session.id] = session;
    }

    for (const n of notifications) {
      const { _stored: _nStored, ...notification } = n;
      void _nStored; // Intentionally unused - stripping storage marker
      notificationMap[notification.id] = notification;
    }

    return {
      user: user ? this.stripStoredMarker(user) : null,
      sessions: sessionMap,
      notifications: notificationMap,
      lastSyncedAt: meta?.lastSyncedAt ?? 0,
      syncStatus: "synced",
    };
  }

  async setState(state: AppState): Promise<void> {
    await db.transaction("rw", [db.users, db.sessions, db.notifications, db.meta], async () => {
      // Clear existing data
      await Promise.all([db.users.clear(), db.sessions.clear(), db.notifications.clear()]);

      // Store new data
      if (state.user) {
        await db.users.put({ ...state.user, _stored: true });
      }

      const sessions: StoredSession[] = Object.values(state.sessions).map((s) => ({
        ...s,
        _stored: true,
      }));
      const notifications: StoredNotification[] = Object.values(state.notifications).map((n) => ({
        ...n,
        _stored: true,
      }));

      await Promise.all([
        sessions.length > 0 ? db.sessions.bulkPut(sessions) : Promise.resolve(),
        notifications.length > 0 ? db.notifications.bulkPut(notifications) : Promise.resolve(),
      ]);

      await setLastSyncedAt(state.lastSyncedAt || Date.now());
    });
  }

  async updateUser(user: User | null): Promise<void> {
    await db.transaction("rw", db.users, async () => {
      await db.users.clear();
      if (user) {
        await db.users.put({ ...user, _stored: true });
      }
    });
    await setLastSyncedAt(Date.now());
  }

  async updateSession(session: Session): Promise<void> {
    await db.sessions.put({ ...session, _stored: true });
    await setLastSyncedAt(Date.now());
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.sessions.delete(sessionId);
    await setLastSyncedAt(Date.now());
  }

  async updateNotification(notification: Notification): Promise<void> {
    await db.notifications.put({ ...notification, _stored: true });
    await setLastSyncedAt(Date.now());
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await db.notifications.delete(notificationId);
    await setLastSyncedAt(Date.now());
  }

  async clear(): Promise<void> {
    await db.transaction("rw", [db.users, db.sessions, db.notifications, db.meta], async () => {
      await Promise.all([
        db.users.clear(),
        db.sessions.clear(),
        db.notifications.clear(),
        db.meta.clear(),
      ]);
    });
  }

  private stripStoredMarker<T extends { _stored: boolean }>(obj: T): Omit<T, "_stored"> {
    const { _stored: _marker, ...rest } = obj;
    void _marker; // Intentionally unused - stripping storage marker
    return rest as Omit<T, "_stored">;
  }
}

// =============================================================================
// Storage Factory
// =============================================================================

let storageInstance: StateStorage | null = null;

/**
 * Get the state storage instance.
 * Uses IndexedDB if available, otherwise falls back to in-memory storage.
 */
export function getStateStorage(): StateStorage {
  if (!storageInstance) {
    storageInstance = isIndexedDBAvailable() ? new IndexedDBStorage() : new InMemoryStorage();
  }
  return storageInstance;
}

/**
 * Reset the storage instance (for testing purposes).
 */
export function resetStateStorage(): void {
  storageInstance = null;
}

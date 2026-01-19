/**
 * Cross-Tab State Synchronization Service
 *
 * Feature: 002-event-driven-state
 *
 * Uses BroadcastChannel to notify other tabs of state changes.
 * IndexedDB is the source of truth; this service only sends invalidation signals.
 */

import type {
  ConnectionStatusPayload,
  StateInvalidatedPayload,
  TabSyncMessage,
  TabSyncMessageType,
  ThemeChangedPayload,
  ThemeMode,
  ResolvedTheme,
  ConnectionStatus,
} from "../../types/state";

// =============================================================================
// Types
// =============================================================================

export type StateSyncCallback = (message: TabSyncMessage) => void;

export interface StateSyncService {
  /** Notify other tabs that state has changed */
  notifyStateInvalidated(keys: StateInvalidatedPayload["keys"]): void;
  /** Notify other tabs that theme has changed */
  notifyThemeChanged(mode: ThemeMode, resolved: ResolvedTheme): void;
  /** Notify other tabs that user has logged out */
  notifyLogout(): void;
  /** Notify other tabs of connection status change */
  notifyConnectionStatusChanged(status: ConnectionStatus): void;
  /** Subscribe to sync messages from other tabs */
  subscribe(callback: StateSyncCallback): () => void;
  /** Close the sync service */
  close(): void;
}

// =============================================================================
// Constants
// =============================================================================

const CHANNEL_NAME = "nats-ui-state-sync";
const STORAGE_KEY = "nats-ui-state-sync";

// =============================================================================
// Implementation
// =============================================================================

class BroadcastStateSyncService implements StateSyncService {
  private channel: BroadcastChannel | null = null;
  private readonly tabId: string;
  private readonly listeners = new Set<StateSyncCallback>();
  private useFallback = false;

  constructor(tabId: string) {
    this.tabId = tabId;
    this.init();
  }

  private init(): void {
    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.addEventListener("message", this.handleMessage);
      } catch {
        this.useFallback = true;
      }
    } else {
      this.useFallback = true;
    }

    if (this.useFallback && typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorageEvent);
    }
  }

  private handleMessage = (event: MessageEvent<TabSyncMessage>): void => {
    const message = event.data;
    if (message.tabId === this.tabId) return;
    this.notifyListeners(message);
  };

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;

    try {
      const message = JSON.parse(event.newValue) as TabSyncMessage;
      if (message.tabId === this.tabId) return;
      this.notifyListeners(message);
    } catch {
      // Ignore invalid JSON
    }
  };

  private notifyListeners(message: TabSyncMessage): void {
    for (const listener of this.listeners) {
      try {
        listener(message);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private send<T>(type: TabSyncMessageType, payload?: T): void {
    const message: TabSyncMessage<T> = {
      type,
      tabId: this.tabId,
      timestamp: Date.now(),
      payload,
    };

    if (this.channel && !this.useFallback) {
      this.channel.postMessage(message);
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
    }
  }

  notifyStateInvalidated(keys: StateInvalidatedPayload["keys"]): void {
    this.send<StateInvalidatedPayload>("STATE_INVALIDATED", { keys });
  }

  notifyThemeChanged(mode: ThemeMode, resolved: ResolvedTheme): void {
    this.send<ThemeChangedPayload>("THEME_CHANGED", { mode, resolved });
  }

  notifyLogout(): void {
    this.send("LOGOUT");
  }

  notifyConnectionStatusChanged(status: ConnectionStatus): void {
    this.send<ConnectionStatusPayload>("CONNECTION_STATUS_CHANGED", { status });
  }

  subscribe(callback: StateSyncCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  close(): void {
    if (this.channel) {
      this.channel.removeEventListener("message", this.handleMessage);
      this.channel.close();
      this.channel = null;
    }

    if (this.useFallback && typeof window !== "undefined") {
      window.removeEventListener("storage", this.handleStorageEvent);
    }

    this.listeners.clear();
  }
}

// =============================================================================
// Factory
// =============================================================================

let syncServiceInstance: BroadcastStateSyncService | null = null;

/**
 * Get or create the state sync service.
 */
export function getStateSyncService(tabId?: string): StateSyncService {
  if (!syncServiceInstance) {
    const id = tabId || crypto.randomUUID();
    syncServiceInstance = new BroadcastStateSyncService(id);
  }
  return syncServiceInstance;
}

/**
 * Reset the sync service (for testing purposes).
 */
export function resetStateSyncService(): void {
  if (syncServiceInstance) {
    syncServiceInstance.close();
    syncServiceInstance = null;
  }
}

/**
 * Generate a unique tab ID.
 */
export function generateTabId(): string {
  return crypto.randomUUID();
}

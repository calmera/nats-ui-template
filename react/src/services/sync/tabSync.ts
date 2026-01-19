import type { TabSyncMessage, TabSyncEventType, TabSyncPayload } from "@/types";

/**
 * Channel name for cross-tab synchronization
 */
const CHANNEL_NAME = "nats-auth";

/**
 * Local storage key for Safari fallback
 */
const STORAGE_KEY = "nats-auth-state";

/**
 * Tab sync service using BroadcastChannel with localStorage fallback
 */
class TabSyncService {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private listeners: Set<(message: TabSyncMessage) => void> = new Set();
  private useFallback: boolean = false;

  constructor(tabId: string) {
    this.tabId = tabId;
    this.init();
  }

  /**
   * Initialize the sync channel
   */
  private init(): void {
    // Check for BroadcastChannel support
    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.addEventListener("message", this.handleMessage);
      } catch {
        // Fallback to localStorage
        this.useFallback = true;
      }
    } else {
      this.useFallback = true;
    }

    if (this.useFallback) {
      window.addEventListener("storage", this.handleStorageEvent);
    }
  }

  /**
   * Handle incoming BroadcastChannel message
   */
  private handleMessage = (event: MessageEvent<TabSyncMessage>): void => {
    const message = event.data;

    // Ignore messages from this tab
    if (message.sourceTabId === this.tabId) {
      return;
    }

    this.notifyListeners(message);
  };

  /**
   * Handle localStorage storage event (fallback)
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      const message = JSON.parse(event.newValue) as TabSyncMessage;

      // Ignore messages from this tab
      if (message.sourceTabId === this.tabId) {
        return;
      }

      this.notifyListeners(message);
    } catch {
      // Ignore invalid JSON
    }
  };

  /**
   * Notify all listeners of a message
   */
  private notifyListeners(message: TabSyncMessage): void {
    for (const listener of this.listeners) {
      try {
        listener(message);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Send a message to other tabs
   */
  send(type: TabSyncEventType, payload: TabSyncPayload): void {
    const message: TabSyncMessage = {
      type,
      payload,
      sourceTabId: this.tabId,
      timestamp: Date.now(),
    };

    if (this.channel && !this.useFallback) {
      this.channel.postMessage(message);
    } else {
      // Fallback: write to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
    }
  }

  /**
   * Subscribe to messages from other tabs
   */
  subscribe(listener: (message: TabSyncMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Request current state from other tabs
   */
  requestState(): void {
    this.send("REQUEST_STATE", {});
  }

  /**
   * Close the channel
   */
  close(): void {
    if (this.channel) {
      this.channel.removeEventListener("message", this.handleMessage);
      this.channel.close();
      this.channel = null;
    }

    if (this.useFallback) {
      window.removeEventListener("storage", this.handleStorageEvent);
    }

    this.listeners.clear();
  }
}

// Singleton instance
let tabSyncInstance: TabSyncService | null = null;

/**
 * Get the tab sync service singleton
 */
export function getTabSyncService(tabId: string): TabSyncService {
  if (!tabSyncInstance) {
    tabSyncInstance = new TabSyncService(tabId);
  }
  return tabSyncInstance;
}

/**
 * Reset the tab sync service (for testing)
 */
export function resetTabSyncService(): void {
  if (tabSyncInstance) {
    tabSyncInstance.close();
    tabSyncInstance = null;
  }
}

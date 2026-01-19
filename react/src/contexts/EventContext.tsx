/**
 * Event Context Provider
 *
 * Feature: 002-event-driven-state
 *
 * Manages the event-driven application state, including:
 * - Initial state loading from NATS
 * - Real-time event subscription
 * - State persistence to IndexedDB
 * - Cross-tab synchronization
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppEvent, GetStateResponse, Notification, Session } from "../types/events";
import type { AppState, SyncStatus } from "../types/state";
import { INITIAL_APP_STATE, NATS_DEFAULTS } from "../types/state";
import { appStateReducer } from "../services/state/reducer";
import { getStateStorage } from "../services/state/store";
import { getStateSyncService, generateTabId } from "../services/state/sync";
import { getEventService } from "../services/nats/events";
import { getNatsService } from "../services/nats/connection";

// =============================================================================
// Types
// =============================================================================

interface EventContextState extends AppState {
  /** Error message if state loading failed */
  error: string | null;
}

type EventContextAction =
  | { type: "SET_SYNCING" }
  | { type: "SET_STATE"; payload: AppState }
  | { type: "APPLY_EVENT"; payload: AppEvent }
  | { type: "SET_SYNC_STATUS"; payload: SyncStatus }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" };

interface EventContextValue {
  state: EventContextState;
  /** Whether the app is currently loading initial state */
  isLoading: boolean;
  /** Whether the app has an error */
  hasError: boolean;
  /** Whether the state is considered stale */
  isStale: boolean;
  /** Number of unread notifications */
  unreadNotificationCount: number;
  /** Number of active sessions */
  activeSessionCount: number;
  /** Manually refresh state from backend */
  refreshState: () => Promise<void>;
}

// =============================================================================
// Reducer
// =============================================================================

const initialContextState: EventContextState = {
  ...INITIAL_APP_STATE,
  error: null,
};

function eventContextReducer(
  state: EventContextState,
  action: EventContextAction
): EventContextState {
  switch (action.type) {
    case "SET_SYNCING":
      return { ...state, syncStatus: "syncing", error: null };

    case "SET_STATE":
      return { ...action.payload, error: null };

    case "APPLY_EVENT": {
      const newState = appStateReducer(state, action.payload);
      return {
        ...newState,
        lastSyncedAt: Date.now(),
        syncStatus: "synced",
        error: null,
      };
    }

    case "SET_SYNC_STATUS":
      return { ...state, syncStatus: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, syncStatus: "stale" };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "RESET":
      return initialContextState;

    default:
      return state;
  }
}

// =============================================================================
// Context
// =============================================================================

const EventContext = createContext<EventContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface EventProviderProps {
  children: ReactNode;
  /** NATS namespace (optional, uses env or default) */
  namespace?: string;
}

export function EventProvider({ children, namespace }: EventProviderProps) {
  const [state, dispatch] = useReducer(eventContextReducer, initialContextState);
  // Use useState with lazy initializer to generate tabId once
  const [tabId] = useState(() => generateTabId());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  // Get services - memoize to avoid recreation
  const storage = getStateStorage();
  const syncService = getStateSyncService(tabId);
  const eventService = getEventService(namespace ? { namespace } : undefined);
  const natsService = getNatsService();

  // Derived state
  const isLoading = state.syncStatus === "syncing";
  const hasError = state.error !== null;

  // State for time-dependent calculations (updated via effect)
  const [isStale, setIsStale] = useState(false);
  const [activeSessionCount, setActiveSessionCount] = useState(0);

  // Update time-dependent derived values via effect
  useEffect(() => {
    const updateTimeDependentState = () => {
      const now = Date.now();
      const stale =
        state.syncStatus === "stale" ||
        state.syncStatus === "offline" ||
        (state.lastSyncedAt > 0 && now - state.lastSyncedAt > NATS_DEFAULTS.STALE_THRESHOLD_MS);
      setIsStale(stale);

      const activeCount = Object.values(state.sessions).filter(
        (s: Session) => s.expiresAt > now
      ).length;
      setActiveSessionCount(activeCount);
    };

    updateTimeDependentState();

    // Periodically update stale status
    const interval = setInterval(updateTimeDependentState, 10000);
    return () => clearInterval(interval);
  }, [state.syncStatus, state.lastSyncedAt, state.sessions]);

  // Unread count doesn't depend on time, calculate directly
  const unreadNotificationCount = Object.values(state.notifications).filter(
    (n: Notification) => !n.read && !n.dismissed
  ).length;

  // Transform server response to AppState
  const transformResponseToState = useCallback((response: GetStateResponse): AppState => {
    const sessions: Record<string, Session> = {};
    const notifications: Record<string, Notification> = {};

    for (const s of response.sessions) {
      sessions[s.id] = s;
    }
    for (const n of response.notifications) {
      notifications[n.id] = n;
    }

    return {
      user: response.user,
      sessions,
      notifications,
      lastSyncedAt: response.serverTime || Date.now(),
      syncStatus: "synced",
    };
  }, []);

  // Load initial state from IndexedDB (for offline support)
  const loadFromStorage = useCallback(async () => {
    try {
      const storedState = await storage.getState();
      if (storedState.user) {
        dispatch({
          type: "SET_STATE",
          payload: { ...storedState, syncStatus: "stale" },
        });
      }
    } catch (error) {
      console.warn("Failed to load state from storage:", error);
    }
  }, [storage]);

  // Fetch initial state from NATS
  const fetchInitialState = useCallback(async () => {
    dispatch({ type: "SET_SYNCING" });

    try {
      const response = await eventService.fetchInitialState();
      const newState = transformResponseToState(response);

      dispatch({ type: "SET_STATE", payload: newState });

      // Persist to storage
      await storage.setState(newState);

      // Notify other tabs
      syncService.notifyStateInvalidated(["user", "sessions", "notifications"]);

      return newState;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load state";
      dispatch({ type: "SET_ERROR", payload: message });
      throw error;
    }
  }, [eventService, storage, syncService, transformResponseToState]);

  // Subscribe to events
  const subscribeToEvents = useCallback(async () => {
    // Unsubscribe from existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const handleEvent = async (event: AppEvent) => {
      dispatch({ type: "APPLY_EVENT", payload: event });

      // Persist to storage
      try {
        const currentState = await storage.getState();
        const newState = appStateReducer(currentState, event);
        await storage.setState({
          ...newState,
          lastSyncedAt: Date.now(),
          syncStatus: "synced",
        });

        // Notify other tabs
        const keys: Array<"user" | "sessions" | "notifications"> = [];
        if (event.type === "user.updated") keys.push("user");
        if (event.type.startsWith("session.")) keys.push("sessions");
        if (event.type.startsWith("notification.")) keys.push("notifications");
        if (keys.length > 0) {
          syncService.notifyStateInvalidated(keys);
        }
      } catch (error) {
        console.error("Failed to persist event to storage:", error);
      }
    };

    const handleError = (error: Error) => {
      console.error("Event subscription error:", error);
      dispatch({ type: "SET_SYNC_STATUS", payload: "stale" });
    };

    try {
      unsubscribeRef.current = await eventService.subscribe(handleEvent, handleError);
    } catch (error) {
      console.error("Failed to subscribe to events:", error);
    }
  }, [eventService, storage, syncService]);

  // Manual refresh
  const refreshState = useCallback(async () => {
    await fetchInitialState();
    await subscribeToEvents();
  }, [fetchInitialState, subscribeToEvents]);

  // Initialize on mount when connected
  useEffect(() => {
    const initializeState = async () => {
      if (isInitializedRef.current) return;
      if (!natsService.isConnected()) return;

      isInitializedRef.current = true;

      // First, try to load from storage for immediate display
      await loadFromStorage();

      // Then, fetch fresh state from server
      try {
        await fetchInitialState();
        await subscribeToEvents();
      } catch (error) {
        console.error("Failed to initialize state:", error);
        // Keep showing stored state if available
      }
    };

    initializeState();
  }, [natsService, loadFromStorage, fetchInitialState, subscribeToEvents]);

  // Handle connection status changes
  useEffect(() => {
    const unsubscribe = natsService.onEvent(async (event) => {
      switch (event.type) {
        case "connected":
          // Initial connection - initialize state
          if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            await loadFromStorage();
            try {
              await fetchInitialState();
              await subscribeToEvents();
            } catch (error) {
              console.error("Failed to initialize on connect:", error);
            }
          }
          break;

        case "reconnected":
          // Reconnection - refresh state
          dispatch({ type: "SET_SYNCING" });
          try {
            await fetchInitialState();
            await subscribeToEvents();
          } catch (error) {
            console.error("Failed to refresh on reconnect:", error);
          }
          break;

        case "disconnected":
          dispatch({ type: "SET_SYNC_STATUS", payload: "offline" });
          break;

        case "reconnecting":
          dispatch({ type: "SET_SYNC_STATUS", payload: "stale" });
          break;
      }
    });

    return unsubscribe;
  }, [natsService, loadFromStorage, fetchInitialState, subscribeToEvents]);

  // Handle cross-tab sync messages
  useEffect(() => {
    const unsubscribe = syncService.subscribe(async (message) => {
      switch (message.type) {
        case "STATE_INVALIDATED":
          // Another tab updated state - reload from storage
          try {
            const storedState = await storage.getState();
            dispatch({ type: "SET_STATE", payload: storedState });
          } catch (error) {
            console.error("Failed to sync state from storage:", error);
          }
          break;

        case "LOGOUT":
          dispatch({ type: "RESET" });
          break;
      }
    });

    return unsubscribe;
  }, [syncService, storage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const value: EventContextValue = {
    state,
    isLoading,
    hasError,
    isStale,
    unreadNotificationCount,
    activeSessionCount,
    refreshState,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access the event context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useEventContext(): EventContextValue {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
}

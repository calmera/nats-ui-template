import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  AuthState,
  AuthAction,
  Credential,
  ConnectionError,
  DerivedAuthState,
  Connection,
} from "@/types";

/**
 * Generate a unique tab ID
 */
function generateTabId(): string {
  return crypto.randomUUID();
}

/**
 * Initial connection state
 */
const initialConnection: Connection = {
  status: "disconnected",
  serverUrl: "",
  connectedAt: null,
  reconnectAttempt: 0,
  lastError: null,
};

/**
 * Initial auth state
 */
const initialState: AuthState = {
  credential: null,
  credentialStatus: "not_loaded",
  connection: initialConnection,
  lastSyncTimestamp: 0,
  tabId: generateTabId(),
};

/**
 * Auth state reducer
 */
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOAD_CREDENTIAL_START":
      return {
        ...state,
        credentialStatus: "loading",
        connection: {
          ...state.connection,
          lastError: null,
        },
      };

    case "LOAD_CREDENTIAL_SUCCESS":
      return {
        ...state,
        credential: action.payload,
        credentialStatus: "loaded",
      };

    case "LOAD_CREDENTIAL_ERROR":
      return {
        ...state,
        credential: null,
        credentialStatus: "invalid",
        connection: {
          ...state.connection,
          lastError: action.payload,
        },
      };

    case "SET_CONNECTING":
      return {
        ...state,
        connection: {
          ...state.connection,
          status: "connecting",
          lastError: null,
        },
      };

    case "SET_CONNECTED":
      return {
        ...state,
        connection: {
          ...state.connection,
          status: "connected",
          serverUrl: action.payload.serverUrl,
          connectedAt: Date.now(),
          reconnectAttempt: 0,
          lastError: null,
        },
      };

    case "SET_RECONNECTING":
      return {
        ...state,
        connection: {
          ...state.connection,
          status: "reconnecting",
          reconnectAttempt: action.payload.attempt,
        },
      };

    case "SET_DISCONNECTED":
      return {
        ...state,
        connection: {
          ...state.connection,
          status: "disconnected",
          connectedAt: null,
          reconnectAttempt: 0,
        },
      };

    case "SET_FAILED":
      return {
        ...state,
        connection: {
          ...state.connection,
          status: "failed",
          lastError: action.payload,
        },
      };

    case "CLEAR_CREDENTIAL":
      return {
        ...state,
        credential: null,
        credentialStatus: "not_loaded",
        connection: initialConnection,
      };

    case "SYNC_STATE":
      return {
        ...state,
        ...action.payload,
        lastSyncTimestamp: Date.now(),
      };

    default:
      return state;
  }
}

/**
 * Auth context value type
 */
interface AuthContextValue {
  state: AuthState;
  derived: DerivedAuthState;
  dispatch: React.Dispatch<AuthAction>;
  loadCredential: (credential: Credential) => void;
  loadCredentialError: (error: ConnectionError) => void;
  setConnecting: () => void;
  setConnected: (serverUrl: string) => void;
  setReconnecting: (attempt: number) => void;
  setDisconnected: () => void;
  setFailed: (error: ConnectionError) => void;
  clearCredential: () => void;
}

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Compute derived state
  const derived: DerivedAuthState = {
    isAuthenticated: state.connection.status === "connected",
    isLoading:
      state.credentialStatus === "loading" ||
      state.connection.status === "connecting" ||
      state.connection.status === "reconnecting",
    canAccessPrivate: state.connection.status === "connected",
  };

  // Action helpers
  const loadCredential = useCallback((credential: Credential) => {
    dispatch({ type: "LOAD_CREDENTIAL_START" });
    dispatch({ type: "LOAD_CREDENTIAL_SUCCESS", payload: credential });
  }, []);

  const loadCredentialError = useCallback((error: ConnectionError) => {
    dispatch({ type: "LOAD_CREDENTIAL_ERROR", payload: error });
  }, []);

  const setConnecting = useCallback(() => {
    dispatch({ type: "SET_CONNECTING" });
  }, []);

  const setConnected = useCallback((serverUrl: string) => {
    dispatch({ type: "SET_CONNECTED", payload: { serverUrl } });
  }, []);

  const setReconnecting = useCallback((attempt: number) => {
    dispatch({ type: "SET_RECONNECTING", payload: { attempt } });
  }, []);

  const setDisconnected = useCallback(() => {
    dispatch({ type: "SET_DISCONNECTED" });
  }, []);

  const setFailed = useCallback((error: ConnectionError) => {
    dispatch({ type: "SET_FAILED", payload: error });
  }, []);

  const clearCredential = useCallback(() => {
    dispatch({ type: "CLEAR_CREDENTIAL" });
  }, []);

  // Tab synchronization - listen to other tabs' state changes
  useEffect(() => {
    // Import dynamically to avoid circular dependencies
    import("@/services/sync/tabSync").then(({ getTabSyncService }) => {
      const tabSync = getTabSyncService(state.tabId);

      const handleTabMessage = (message: {
        type: string;
        payload: { connectionStatus?: string; hasCredential?: boolean };
        sourceTabId: string;
      }) => {
        // Ignore messages from this tab
        if (message.sourceTabId === state.tabId) return;

        switch (message.type) {
          case "CREDENTIAL_CLEARED":
            // Another tab logged out - sync the logout
            dispatch({ type: "CLEAR_CREDENTIAL" });
            break;

          case "CONNECTION_STATE_CHANGED":
            // Another tab's connection state changed
            if (message.payload.connectionStatus === "disconnected") {
              dispatch({ type: "SET_DISCONNECTED" });
            }
            break;
        }
      };

      const unsubscribe = tabSync.subscribe(
        handleTabMessage as (message: unknown) => void
      );
      return unsubscribe;
    });
  }, [state.tabId]);

  const value: AuthContextValue = {
    state,
    derived,
    dispatch,
    loadCredential,
    loadCredentialError,
    setConnecting,
    setConnected,
    setReconnecting,
    setDisconnected,
    setFailed,
    clearCredential,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

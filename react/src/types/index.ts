/**
 * React NATS Authentication Boilerplate - Type Contracts
 *
 * This file defines the TypeScript interfaces and types used throughout
 * the authentication boilerplate. These serve as contracts between
 * components, services, and contexts.
 */

// =============================================================================
// Credential Types
// =============================================================================

/**
 * Authentication type discriminator
 */
export type AuthType = "credsfile" | "userpass";

/**
 * Base fields shared by all credential types
 */
interface BaseCredential {
  /** Unique identifier for this credential instance */
  id: string;
  /** Timestamp when credential was loaded */
  loadedAt: number;
  /** Source of the credential */
  source: "file" | "storage" | "form";
}

/**
 * Credential file authentication (.creds file)
 */
export interface CredsFileCredential extends BaseCredential {
  /** Authentication type discriminator */
  authType: "credsfile";
  /** User JWT extracted from .creds file */
  jwt: string;
  /** NKey seed (private key material) - handle with care */
  seed: Uint8Array;
  /** Derived public key (starts with 'U' for user) */
  publicKey: string;
}

/**
 * Username/password authentication
 */
export interface UserPassCredential extends BaseCredential {
  /** Authentication type discriminator */
  authType: "userpass";
  /** Username for authentication */
  username: string;
  /** Password for authentication */
  password: string;
}

/**
 * Union type for all credential types
 */
export type Credential = CredsFileCredential | UserPassCredential;

/**
 * Type guard for credential file credentials
 */
export function isCredsFileCredential(cred: Credential): cred is CredsFileCredential {
  return cred.authType === "credsfile";
}

/**
 * Type guard for username/password credentials
 */
export function isUserPassCredential(cred: Credential): cred is UserPassCredential {
  return cred.authType === "userpass";
}

/**
 * Credential status in the loading lifecycle
 */
export type CredentialStatus = "not_loaded" | "loading" | "loaded" | "invalid";

/**
 * Stored credential format in IndexedDB (encrypted)
 */
export interface StoredCredential {
  /** Credential identifier */
  id: string;
  /** Base64-encoded IV + AES-GCM ciphertext */
  encrypted: string;
  /** Base64-encoded PBKDF2 salt */
  salt: string;
  /** PBKDF2 iteration count */
  iterations: number;
  /** Timestamp when stored */
  storedAt: number;
  /** Associated NATS server URL */
  serverUrl: string;
  /** Authentication type used */
  authType: AuthType;
}

// =============================================================================
// Connection Types
// =============================================================================

/**
 * NATS connection status
 */
export type ConnectionStatus =
  | "disconnected" // No connection, no credential loaded
  | "connecting" // Attempting initial connection
  | "connected" // Active connection established
  | "reconnecting" // Lost connection, attempting to restore
  | "failed"; // Connection failed, user action required

/**
 * Error codes for connection failures
 */
export type ConnectionErrorCode =
  | "INVALID_CREDENTIAL" // Credential file format error
  | "AUTH_FAILED" // Server rejected authentication
  | "CONNECTION_REFUSED" // Server unreachable
  | "CONNECTION_TIMEOUT" // Connection timed out
  | "PERMISSION_DENIED" // User lacks permissions
  | "SERVER_ERROR" // NATS server error
  | "UNKNOWN"; // Unexpected error

/**
 * Connection error with user-friendly messaging
 */
export interface ConnectionError {
  /** Machine-readable error code */
  code: ConnectionErrorCode;
  /** Technical error message (for logging) */
  message: string;
  /** User-friendly message (for UI display) */
  userMessage: string;
  /** When the error occurred */
  timestamp: number;
  /** Whether the system can auto-recover */
  recoverable: boolean;
}

/**
 * NATS connection state
 */
export interface Connection {
  /** Current connection status */
  status: ConnectionStatus;
  /** Connected NATS server URL */
  serverUrl: string;
  /** Timestamp when connection was established */
  connectedAt: number | null;
  /** Current reconnection attempt number */
  reconnectAttempt: number;
  /** Last error encountered (if any) */
  lastError: ConnectionError | null;
}

// =============================================================================
// Route Types
// =============================================================================

/**
 * Route access level
 */
export type RouteAccessLevel = "public" | "private";

/**
 * Route definition for the application
 */
export interface RouteDefinition {
  /** URL path */
  path: string;
  /** Page title for display */
  title: string;
  /** Access level requirement */
  accessLevel: RouteAccessLevel;
}

// =============================================================================
// Auth State Types (React Context)
// =============================================================================

/**
 * Combined authentication state for React context
 */
export interface AuthState {
  // Credential state
  credential: Credential | null;
  credentialStatus: CredentialStatus;

  // Connection state
  connection: Connection;

  // Auth check state
  authCheckComplete: boolean;

  // Sync metadata
  lastSyncTimestamp: number;
  tabId: string;
}

/**
 * Derived auth state properties (computed, not stored)
 */
export interface DerivedAuthState {
  /** True if connection is active */
  isAuthenticated: boolean;
  /** True if any loading operation in progress */
  isLoading: boolean;
  /** True if user can access private routes */
  canAccessPrivate: boolean;
}

/**
 * Auth context actions
 */
export type AuthAction =
  | { type: "LOAD_CREDENTIAL_START" }
  | { type: "LOAD_CREDENTIAL_SUCCESS"; payload: Credential }
  | { type: "LOAD_CREDENTIAL_ERROR"; payload: ConnectionError }
  | { type: "SET_CONNECTING" }
  | { type: "SET_CONNECTED"; payload: { serverUrl: string } }
  | { type: "SET_RECONNECTING"; payload: { attempt: number } }
  | { type: "SET_DISCONNECTED" }
  | { type: "SET_FAILED"; payload: ConnectionError }
  | { type: "SET_AUTH_CHECK_COMPLETE" }
  | { type: "CLEAR_CREDENTIAL" }
  | { type: "SYNC_STATE"; payload: Partial<AuthState> };

// =============================================================================
// Tab Sync Types (BroadcastChannel)
// =============================================================================

/**
 * Event types for cross-tab synchronization
 */
export type TabSyncEventType =
  | "CREDENTIAL_LOADED"
  | "CREDENTIAL_CLEARED"
  | "CONNECTION_STATE_CHANGED"
  | "REQUEST_STATE";

/**
 * Payload for tab sync messages
 */
export interface TabSyncPayload {
  connectionStatus?: ConnectionStatus;
  hasCredential?: boolean;
  error?: ConnectionError;
}

/**
 * Message format for BroadcastChannel
 */
export interface TabSyncMessage {
  /** Event type */
  type: TabSyncEventType;
  /** Event payload */
  payload: TabSyncPayload;
  /** ID of the tab that sent this message */
  sourceTabId: string;
  /** Message timestamp */
  timestamp: number;
}

// =============================================================================
// Service Types
// =============================================================================

/**
 * NATS connection options
 */
export interface NatsConnectionOptions {
  /** NATS server URL (wss://) */
  serverUrl: string;
  /** Credential for authentication */
  credential: Credential;
  /** Connection timeout in ms */
  timeout?: number;
  /** Enable automatic reconnection */
  reconnect?: boolean;
  /** Max reconnection attempts (-1 for unlimited) */
  maxReconnectAttempts?: number;
  /** Initial reconnect wait time in ms */
  reconnectTimeWait?: number;
}

/**
 * Credential storage options
 */
export interface CredentialStorageOptions {
  /** Database name */
  dbName?: string;
  /** Store name */
  storeName?: string;
  /** PBKDF2 iterations */
  iterations?: number;
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for ProtectedRoute component
 */
export interface ProtectedRouteProps {
  /** Component to render if authenticated */
  children: React.ReactNode;
  /** Where to redirect if not authenticated */
  redirectTo?: string;
}

/**
 * Props for ConnectionStatus component
 */
export interface ConnectionStatusProps {
  /** Current connection state */
  status: ConnectionStatus;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Props for CredentialUpload component
 */
export interface CredentialUploadProps {
  /** Callback when credential is loaded */
  onCredentialLoaded: (credential: Credential) => void;
  /** Callback when error occurs */
  onError: (error: ConnectionError) => void;
  /** Whether upload is disabled */
  disabled?: boolean;
}

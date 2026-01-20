# Data Model: React NATS Authentication Boilerplate

**Date**: 2026-01-12 | **Branch**: `001-react-auth-boilerplate`

## Overview

This document defines the data model for the React NATS authentication boilerplate, including entities, state machines, and validation rules.

---

## Entities

### 1. Credential

Represents a NATS credential file containing NKey-based authentication material.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (generated UUID) |
| `jwt` | string | Yes | User JWT from .creds file |
| `seed` | Uint8Array | Yes | NKey seed (private key material) |
| `publicKey` | string | Yes | Derived public key (starts with 'U') |
| `loadedAt` | number | Yes | Timestamp when credential was loaded |
| `source` | "file" \| "storage" | Yes | How credential was obtained |

**Validation Rules**:
- JWT must be a valid base64url-encoded string
- Seed must start with 'SU' (user seed prefix)
- Seed must be valid NKey format (decoded via @nats-io/nkeys)
- PublicKey must start with 'U' (user public key prefix)

**State Machine**:
```
[not_loaded] ──(upload file)──> [loading] ──(parse success)──> [loaded]
                                    │                              │
                                    └──(parse error)──> [invalid]  │
                                                                   │
[loaded] ──(clear)──> [not_loaded]                                │
[loaded] ──(connect success)──> [authenticated]                   │
[authenticated] ──(disconnect)──> [loaded]                        │
[authenticated] ──(credential expired)──> [invalid]               │
```

**Storage Schema** (IndexedDB):
```typescript
interface StoredCredential {
  id: string;
  encrypted: string;      // Base64: IV + AES-GCM ciphertext
  salt: string;           // Base64: PBKDF2 salt
  iterations: number;     // PBKDF2 iterations (100000)
  storedAt: number;       // Timestamp
  serverUrl: string;      // Associated NATS server
}
```

---

### 2. Connection

Represents the NATS WebSocket connection to the server.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | ConnectionStatus | Yes | Current connection state |
| `serverUrl` | string | Yes | Connected NATS server URL |
| `connectedAt` | number \| null | No | Timestamp of connection |
| `reconnectAttempt` | number | Yes | Current reconnection attempt count |
| `lastError` | ConnectionError \| null | No | Last error encountered |

**ConnectionStatus Enum**:
```typescript
type ConnectionStatus =
  | "disconnected"    // No connection, no credential loaded
  | "connecting"      // Attempting initial connection
  | "connected"       // Active connection established
  | "reconnecting"    // Lost connection, attempting to restore
  | "failed";         // Connection failed, user action required
```

**ConnectionError Type**:
```typescript
interface ConnectionError {
  code: ErrorCode;
  message: string;         // Technical error message (for logs)
  userMessage: string;     // User-friendly message (for UI)
  timestamp: number;
  recoverable: boolean;    // Can system auto-recover?
}

type ErrorCode =
  | "INVALID_CREDENTIAL"     // Credential file format error
  | "AUTH_FAILED"            // Server rejected authentication
  | "CONNECTION_REFUSED"     // Server unreachable
  | "CONNECTION_TIMEOUT"     // Connection timed out
  | "PERMISSION_DENIED"      // User lacks permissions
  | "SERVER_ERROR"           // NATS server error
  | "UNKNOWN";               // Unexpected error
```

**State Machine**:
```
[disconnected] ──(load credential)──> [connecting]
                                           │
                    ┌──(auth success)──────┴──(auth failure)──> [failed]
                    │                                              │
                    v                                              │
              [connected] <──────────────────(retry with new creds)┘
                    │
                    ├──(connection lost)──> [reconnecting]
                    │                             │
                    │    ┌──(reconnect success)───┘
                    │    v
                    │ [connected]
                    │
                    └──(disconnect)──> [disconnected]

[reconnecting] ──(max retries exceeded)──> [failed]
[failed] ──(clear credential)──> [disconnected]
```

**Reconnection Behavior**:
- Initial wait: 2000ms
- Exponential backoff with jitter
- Max attempts: unlimited (-1)
- On permanent failure: transition to `failed` state

---

### 3. Route

Represents a navigable page with access level.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | URL path (e.g., "/dashboard") |
| `component` | React.ComponentType | Yes | Page component |
| `accessLevel` | "public" \| "private" | Yes | Authentication requirement |
| `title` | string | Yes | Page title for display |

**Access Control Logic**:
```typescript
// Route access evaluation
function canAccessRoute(route: Route, connection: Connection): boolean {
  if (route.accessLevel === "public") {
    return true;
  }
  return connection.status === "connected";
}
```

**Defined Routes**:
| Path | Access Level | Component | Description |
|------|--------------|-----------|-------------|
| `/` | public | HomePage | Landing page with auth option |
| `/auth` | public | AuthPage | Credential upload page |
| `/dashboard` | private | DashboardPage | Protected content |

---

### 4. AuthState (React Context)

Combined authentication and connection state for React components.

**Fields**:
```typescript
interface AuthState {
  // Credential state
  credential: Credential | null;
  credentialStatus: "not_loaded" | "loading" | "loaded" | "invalid";

  // Connection state
  connection: Connection;

  // UI state
  isAuthenticated: boolean;  // Derived: connection.status === "connected"
  isLoading: boolean;        // Derived: credentialStatus === "loading" || connection.status === "connecting"

  // Sync state
  lastSyncTimestamp: number;
  tabId: string;
}
```

**Derived Properties**:
```typescript
const isAuthenticated = connection.status === "connected";
const isLoading =
  credentialStatus === "loading" ||
  connection.status === "connecting" ||
  connection.status === "reconnecting";
const canAccessPrivate = isAuthenticated;
```

---

### 5. TabSyncMessage

Message format for BroadcastChannel cross-tab synchronization.

**Fields**:
```typescript
interface TabSyncMessage {
  type: TabSyncEventType;
  payload: TabSyncPayload;
  sourceTabId: string;
  timestamp: number;
}

type TabSyncEventType =
  | "CREDENTIAL_LOADED"
  | "CREDENTIAL_CLEARED"
  | "CONNECTION_STATE_CHANGED"
  | "REQUEST_STATE";       // New tab requesting current state

interface TabSyncPayload {
  connectionStatus?: ConnectionStatus;
  hasCredential?: boolean;
  error?: ConnectionError;
}
```

---

## Relationships

```
┌─────────────┐         ┌─────────────┐
│  Credential │─────────│  Connection │
│             │ 1     1 │             │
│  - jwt      │         │  - status   │
│  - seed     │         │  - serverUrl│
│  - publicKey│         │  - error    │
└─────────────┘         └─────────────┘
       │                       │
       │                       │
       └───────────┬───────────┘
                   │
                   v
            ┌─────────────┐
            │  AuthState  │
            │             │
            │  (Context)  │
            └─────────────┘
                   │
                   │ synced via
                   │
            ┌─────────────┐
            │TabSyncMessage│
            │             │
            │(BroadcastChannel)│
            └─────────────┘
```

---

## Validation Rules Summary

### Credential File Validation

| Rule | Check | Error Code |
|------|-------|------------|
| File format | Contains JWT and seed sections | INVALID_CREDENTIAL |
| JWT format | Valid base64url encoding | INVALID_CREDENTIAL |
| Seed prefix | Starts with "SU" | INVALID_CREDENTIAL |
| Seed validity | Can be decoded by @nats-io/nkeys | INVALID_CREDENTIAL |
| File size | < 10KB (reasonable limit) | INVALID_CREDENTIAL |

### Connection Validation

| Rule | Check | Error Code |
|------|-------|------------|
| Server URL | Valid WSS URL format | CONNECTION_REFUSED |
| Server reachable | WebSocket connects | CONNECTION_TIMEOUT |
| Auth succeeds | NATS handshake completes | AUTH_FAILED |

---

## State Persistence

### What Gets Persisted (IndexedDB)

- Encrypted credential (for session persistence)
- Salt and encryption metadata
- Associated server URL

### What Stays in Memory Only

- Decrypted credential material
- Active connection instance
- React state

### What Gets Cleared on Logout

1. IndexedDB credential entry
2. In-memory credential
3. NATS connection closed
4. All tabs notified via BroadcastChannel

---

## Error User Messages

| Error Code | User Message |
|------------|--------------|
| INVALID_CREDENTIAL | "The credential file appears to be invalid. Please ensure you're uploading a valid NATS .creds file." |
| AUTH_FAILED | "Authentication failed. Your credentials may have expired or been revoked. Please contact your NATS administrator." |
| CONNECTION_REFUSED | "Unable to connect to the NATS server. Please check your network connection and try again." |
| CONNECTION_TIMEOUT | "Connection timed out. The server may be temporarily unavailable. Please try again." |
| PERMISSION_DENIED | "You don't have permission to perform this action. Please contact your administrator." |
| SERVER_ERROR | "The server encountered an error. Please try again later." |
| UNKNOWN | "An unexpected error occurred. Please try again or contact support." |

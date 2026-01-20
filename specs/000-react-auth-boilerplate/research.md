# Research: React NATS Authentication Boilerplate

**Date**: 2026-01-12 | **Branch**: `001-react-auth-boilerplate`

## Summary

This document consolidates research findings for implementing NATS credential-based authentication in a React browser application using WebSocket transport.

---

## 1. NATS JavaScript Client for Browser WebSocket

### Decision
Use `@nats-io/nats-core` with `wsconnect()` for browser WebSocket connections.

### Rationale
- The `nats.ws` package is **deprecated**
- The NATS.js ecosystem has been restructured as a monorepo
- `wsconnect()` is the current standard for browser WebSocket connections
- Full browser compatibility with modern evergreen browsers

### Alternatives Considered
| Option | Status | Notes |
|--------|--------|-------|
| `nats.ws` | Rejected | Deprecated, superseded by @nats-io/nats-core |
| Direct WebSocket | Rejected | No built-in reconnection, auth handling |
| `@nats-io/nats-core` + `wsconnect()` | **Selected** | Official, maintained, full feature support |

### Implementation Details

**Package Installation**:
```bash
npm install @nats-io/nats-core @nats-io/nkeys
```

**Basic Connection**:
```typescript
import { wsconnect, credsAuthenticator, Events } from "@nats-io/nats-core";

const nc = await wsconnect({
  servers: "wss://nats-server.example.com:9443",
  authenticator: credsAuthenticator(credBytes),
  reconnect: true,
  maxReconnectAttempts: -1,  // infinite
  reconnectTimeWait: 2000,
});
```

**Connection State Events**:
```typescript
for await (const status of nc.status()) {
  switch (status.type) {
    case Events.Disconnect:
      // Handle disconnect
      break;
    case Events.Reconnect:
      // Handle successful reconnection
      break;
    case Events.Reconnecting:
      // Handle reconnection attempt
      break;
    case Events.Error:
      // Handle error
      break;
  }
}
```

**Key Configuration Notes**:
- WebSocket port is typically **9443** (not 4222 which is TCP)
- Use `wss://` for secure connections in production
- Configure via `VITE_NATS_URL` environment variable

---

## 2. NATS Credential File (.creds) Parsing

### Decision
Use `credsAuthenticator()` from `@nats-io/nats-core` for credential parsing and authentication.

### Rationale
- Built-in parsing of .creds file format
- Handles JWT extraction and NKey signing automatically
- Supports callback functions for dynamic credential loading from browser storage
- Challenge-response authentication keeps private key local

### Alternatives Considered
| Option | Status | Notes |
|--------|--------|-------|
| Manual parsing + nkeyAuthenticator | Considered | More control but unnecessary complexity |
| credsAuthenticator with callbacks | **Selected** | Built-in, supports dynamic loading |
| Custom JWT handling | Rejected | Reinventing the wheel |

### Implementation Details

**.creds File Structure**:
```
-----BEGIN NATS USER JWT-----
eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5LWpzb24ifQ...
------END NATS USER JWT------

-----BEGIN USER NKEY SEED-----
SUAEL6GG2L2HIF7DUGZJGMRUFKXELGGYFMHF76UO2AYBG3K4YLWR3FKC2Q
------END USER NKEY SEED------
```

**Parsing Regex** (for validation):
```typescript
const CREDS = /\s*(?:(?:[-]{3,}[^\n]*[-]{3,}\n)(.+)(?:\n\s*[-]{3,}[^\n]*[-]{3,}\n))/ig;
```

**Using credsAuthenticator with File Upload**:
```typescript
async function handleCredsFile(file: File): Promise<void> {
  const credsData = await file.arrayBuffer();
  const credsBytes = new Uint8Array(credsData);

  const nc = await wsconnect({
    servers: import.meta.env.VITE_NATS_URL,
    authenticator: credsAuthenticator(credsBytes),
  });
}
```

**Using credsAuthenticator with Dynamic Loading**:
```typescript
const authenticator = credsAuthenticator(async () => {
  // Load from IndexedDB
  const storedCreds = await credentialStore.retrieve();
  return new TextEncoder().encode(storedCreds);
});
```

**Manual Validation** (before connection):
```typescript
import { fromSeed } from "@nats-io/nkeys";

function validateCreds(credsText: string): boolean {
  const CREDS = /\s*(?:(?:[-]{3,}[^\n]*[-]{3,}\n)(.+)(?:\n\s*[-]{3,}[^\n]*[-]{3,}\n))/ig;

  const jwtMatch = CREDS.exec(credsText);
  if (!jwtMatch) return false;

  const seedMatch = CREDS.exec(credsText);
  if (!seedMatch) return false;

  try {
    const seed = new TextEncoder().encode(seedMatch[1].trim());
    fromSeed(seed); // Validates seed format
    return true;
  } catch {
    return false;
  }
}
```

---

## 3. Secure Browser Credential Storage

### Decision
Use IndexedDB with Web Crypto API (AES-256-GCM encryption, PBKDF2 key derivation) for credential storage.

### Rationale
- No external library dependencies
- Browser-native APIs with strong security guarantees
- AES-GCM provides authenticated encryption
- PBKDF2 protects against brute-force attacks on the encryption key
- IndexedDB provides persistent storage across sessions

### Alternatives Considered
| Option | Status | Notes |
|--------|--------|-------|
| localStorage (plain) | Rejected | No encryption, accessible to any script |
| localStorage (encrypted) | Considered | Size limits, synchronous API |
| IndexedDB + Web Crypto | **Selected** | Secure, async, no size limits |
| Third-party encryption library | Rejected | Unnecessary dependency |

### Implementation Details

**Encryption Flow**:
1. Generate random salt (128 bits)
2. Derive AES-256 key from password using PBKDF2 (100,000 iterations)
3. Generate random IV (96 bits) for each encryption
4. Encrypt with AES-256-GCM
5. Store: salt + IV + ciphertext in IndexedDB

**Core Encryption**:
```typescript
async function encryptCredential(
  credential: string,
  password: string
): Promise<{ encrypted: string; salt: string }> {
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import password as key material
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive AES key
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  // Generate IV and encrypt
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(credential)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return {
    encrypted: btoa(String.fromCharCode(...combined)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}
```

**Browser Compatibility**:
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Web Crypto API | 37+ | 34+ | 11+ | 79+ |
| PBKDF2 | 60+ | 57+ | 11+ | 79+ |
| AES-GCM | 37+ | 34+ | 11+ | 79+ |
| IndexedDB | 24+ | 10+ | 10+ | 15+ |

**Note**: All modern evergreen browsers fully support these APIs.

---

## 4. Cross-Tab State Synchronization

### Decision
Use BroadcastChannel API for synchronizing connection state across browser tabs.

### Rationale
- Native browser API, no external dependencies
- Real-time event-based synchronization
- Simple API: `postMessage()` and `addEventListener()`
- Each tab maintains its own NATS connection while sharing state

### Alternatives Considered
| Option | Status | Notes |
|--------|--------|-------|
| SharedWorker | Considered | More complex, overkill for state sync |
| localStorage events | Considered | Polling-based fallback option |
| BroadcastChannel | **Selected** | Native, real-time, simple |

### Implementation Details

**Basic Pattern**:
```typescript
const channel = new BroadcastChannel("nats-auth");

// Send state change
channel.postMessage({
  type: "CONNECTION_STATE_CHANGED",
  payload: { state: "connected" },
  sourceTabId: tabId,
  timestamp: Date.now(),
});

// Listen for state changes
channel.addEventListener("message", (event) => {
  const { type, payload, sourceTabId } = event.data;

  // Ignore own messages
  if (sourceTabId === myTabId) return;

  // Handle remote state change
  dispatch({ type: "SYNC_STATE", payload });
});

// Cleanup
channel.close();
```

**Message Schema**:
```typescript
interface AuthBroadcastMessage {
  type: "CREDENTIAL_LOADED" | "CONNECTION_ESTABLISHED" | "CONNECTION_LOST" | "LOGOUT";
  payload: {
    connectionState: "disconnected" | "connecting" | "connected" | "reconnecting";
    error?: { code: string; userMessage: string };
  };
  sourceTabId: string;
  timestamp: number;
}
```

**Browser Compatibility**:
| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 54+ | Full Support |
| Firefox | 38+ | Full Support |
| Safari | 15.1+ | Full Support |
| Edge | 79+ | Full Support |

**Fallback Strategy**:
For Safari < 15.1, use localStorage polling:
```typescript
// Fallback for older Safari
window.addEventListener("storage", (e) => {
  if (e.key === "nats-auth-state") {
    const data = JSON.parse(e.newValue || "{}");
    handleStateChange(data);
  }
});
```

---

## 5. React Integration Patterns

### Decision
Use React Context with useReducer for state management, custom hooks for NATS operations.

### Rationale
- Per spec: React Context + useReducer (no external state libraries)
- Clean separation of concerns via custom hooks
- Services layer decoupled from React components

### Key Patterns

**Context Structure**:
```typescript
// AuthContext - handles credential state
// NatsContext - handles connection state
// Both contexts share state via BroadcastChannel
```

**Custom Hooks**:
- `useAuth()` - credential upload, validation, storage
- `useNatsConnection()` - connection lifecycle, status
- `useConnectionSync()` - cross-tab synchronization

**Service Layer**:
- `services/nats/connection.ts` - NATS connection management
- `services/credentials/parser.ts` - creds file validation
- `services/credentials/storage.ts` - IndexedDB operations
- `services/sync/tabSync.ts` - BroadcastChannel wrapper

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Which NATS package for browser? | `@nats-io/nats-core` with `wsconnect()` |
| How to store credentials securely? | IndexedDB + Web Crypto (AES-256-GCM, PBKDF2) |
| How to sync tabs? | BroadcastChannel API |
| How to handle reconnection? | Built-in with `maxReconnectAttempts: -1` and exponential backoff |
| Port for WebSocket? | Typically 9443 (configurable via VITE_NATS_URL) |

---

## Dependencies Summary

```json
{
  "dependencies": {
    "@nats-io/nats-core": "^3.x",
    "@nats-io/nkeys": "^2.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x"
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "@vitejs/plugin-react": "^4.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "tailwindcss": "^3.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@playwright/test": "^1.x"
  }
}
```

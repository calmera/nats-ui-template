# Research: Developer Documentation

**Feature**: 001-developer-docs
**Date**: 2026-01-20
**Status**: Complete

## Research Objectives

Document the existing NATS UI Template codebase to enable comprehensive developer documentation. All NEEDS CLARIFICATION items from planning have been resolved through codebase exploration.

---

## 1. Documentation Structure Best Practices

### Decision: Multi-file Markdown in `docs/` Directory

**Rationale**:
- Separate files per topic enable focused reading and editing
- Better version control diff visibility
- GitHub renders markdown with navigation
- AI agents can retrieve specific sections via file access

**Alternatives Considered**:
- Single large README.md - Rejected: Too large, poor navigation
- Docusaurus/VitePress - Rejected: Over-engineered for template scope
- JSDoc in code - Rejected: Doesn't cover architecture/concepts

### File Organization

```
docs/
├── README.md                    # Overview, what/why/who
├── architecture.md              # Component diagrams, data flow
├── concepts/
│   ├── nats-fundamentals.md     # NATS 101 for newcomers
│   ├── authentication.md        # Credential types, flow
│   └── state-management.md      # Event-driven patterns
├── getting-started.md           # Prerequisites → running app
├── project-structure.md         # File organization guide
├── best-practices/
│   ├── security.md              # Credential handling, CSP, WSS
│   ├── error-handling.md        # Connection errors, commands
│   ├── state-management.md      # Optimistic updates, offline
│   └── testing.md               # Testing strategies
├── quick-reference.md           # Hook/context/type cheat sheet
├── troubleshooting.md           # Common error solutions
└── migration-tips.md            # Adopting patterns incrementally
```

---

## 2. Existing Codebase Analysis

### 2.1 Custom Hooks (react/src/hooks/)

| Hook | Purpose | Key Exports |
|------|---------|-------------|
| `useAuth` | Authentication operations, credential lifecycle | `authenticateWithFile`, `authenticateWithCredential`, `disconnect`, `isAuthenticated` |
| `useNatsConnection` | Connection state monitoring | `status`, `getConnection`, `isConnected` |
| `useAppState` | Materialized application state | `user`, `sessions`, `notifications`, `refreshState` |
| `useCommand` | Execute commands with optimistic updates | `execute`, `isExecuting`, `error` |
| `useEventSubscription` | Subscribe to specific events | Single event handler |
| `useTheme` | Theme management | `theme`, `setTheme`, `isDark` |
| `useConnectionSync` | Cross-tab sync | `broadcastCredentialLoaded`, `broadcastState` |

### 2.2 React Contexts (react/src/contexts/)

| Context | Purpose | Key Values |
|---------|---------|------------|
| `AuthContext` | Central auth state | `credential`, `connectionStatus`, dispatch actions |
| `EventContext` | Event-driven state | `state`, `isLoading`, `refreshState` |
| `ThemeContext` | Theme management | `mode`, `resolvedTheme`, `setTheme` |

### 2.3 NATS Services (react/src/services/nats/)

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| `NatsService` | WebSocket connection | `connect`, `disconnect`, `onEvent` |
| `NatsEventService` | Event subscription | `subscribe`, `fetchInitialState` |
| `NatsCommandService` | Request/response | `updateProfile`, `dismissNotification` |

### 2.4 State Management (react/src/services/state/)

| Module | Purpose |
|--------|---------|
| `store.ts` | IndexedDB persistence with fallback |
| `reducer.ts` | Pure state reduction |
| `sync.ts` | Cross-tab BroadcastChannel sync |

### 2.5 Credential Management (react/src/services/credentials/)

| Module | Purpose |
|--------|---------|
| `storage.ts` | Encrypted storage (AES-256-GCM) |
| `parser.ts` | Credential file parsing/validation |

---

## 3. Type System Analysis (react/src/types/)

### Core Types to Document

```typescript
// Authentication
type AuthType = "credsfile" | "userpass"
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "failed"
interface Credential { id, authType, loadedAt, source }
interface CredsFileCredential { jwt, seed, publicKey }
interface UserPassCredential { username, password }
interface ConnectionError { code, message, userMessage, recoverable }

// Domain Entities
interface User { id, email, name, avatarUrl?, account?, server?, cluster? }
interface Session { id, userId, createdAt, expiresAt, lastActivityAt }
interface Notification { id, type, title, message, read, dismissed }

// Events
type AppEvent = UserUpdatedEvent | SessionCreatedEvent | ...
interface GetStateResponse { user, sessions, notifications, serverTime }

// Commands
type CommandType = "user.updateProfile" | "notification.dismiss" | ...
type CommandResult<T> = CommandResultSuccess<T> | CommandResultFailure

// State
type SyncStatus = "synced" | "syncing" | "stale" | "offline"
interface AppState { user, sessions, notifications, lastSyncedAt, syncStatus }
```

---

## 4. NATS Subject Patterns

### Event Subjects
- `{namespace}.events.>` - All domain events wildcard
- Processed event types:
  - `user.updated`
  - `session.created`
  - `session.expired`
  - `notification.received`
  - `notification.read`
  - `notification.dismissed`

### Command Subjects
- `{namespace}.cmd.user.updateProfile`
- `{namespace}.cmd.notification.dismiss`
- `{namespace}.cmd.notification.markRead`
- `{namespace}.cmd.notification.markAllRead`

### System Subjects
- `$SYS.REQ.USER.INFO` - Initial state fetch (user, server, cluster info)

---

## 5. Integration Patterns to Document

### Pattern 1: Authentication Flow
```tsx
const { authenticateWithFile, isLoading } = useAuth();
const success = await authenticateWithFile(file, serverUrl);
```

### Pattern 2: Reading State
```tsx
const { user, notifications, unreadNotificationCount } = useAppState();
```

### Pattern 3: Executing Commands
```tsx
const { execute, isExecuting } = useCommand();
const result = await execute('user.updateProfile', { name: 'New Name' });
```

### Pattern 4: Event Subscriptions
```tsx
useEventSubscription('notification.received', (event) => {
  toast.show(event.payload.title);
});
```

### Pattern 5: Direct NATS Access
```tsx
const { getConnection } = useNatsConnection();
const conn = getConnection();
if (conn) {
  const msg = await conn.request('subject', data);
}
```

---

## 6. Security Patterns to Document

### Credential Handling
- AES-256-GCM encryption via Web Crypto API
- PBKDF2 key derivation (100,000 iterations)
- Device-specific encryption keys
- Seeds/passwords never in logs or error messages

### Connection Security
- WSS required in production
- Connection timeout handling
- Reconnection with backoff

### Browser Security
- CSP headers configuration
- Input sanitization for NATS subjects
- No internal infrastructure exposure

---

## 7. Error Handling Patterns

### Connection Errors
- `AUTH_FAILED` - Invalid credentials
- `PARSE_ERROR` - Invalid credential file format
- `CONNECTION_TIMEOUT` - Server unreachable
- `CONNECTION_CLOSED` - Unexpected disconnection
- `INVALID_URL` - Malformed server URL

### Command Errors
- `INVALID_PAYLOAD` - Validation failed
- `NOT_FOUND` - Resource doesn't exist
- `PERMISSION_DENIED` - Unauthorized
- `CONFLICT` - Concurrent modification
- `INTERNAL_ERROR` - Server error

### User Messaging
- Each error has `message` (technical) and `userMessage` (UI-friendly)
- `recoverable` flag guides retry behavior

---

## 8. Testing Patterns to Document

### Test Structure
```
react/tests/
├── components/    # Component tests (React Testing Library)
├── services/      # Service unit tests
└── hooks/         # Hook tests with mocked contexts
```

### Testing Tools
- Vitest for test runner
- @testing-library/react for component tests
- jsdom for browser environment simulation

### Key Testing Patterns
- Mock NatsService for connection tests
- Test hooks with custom providers
- Snapshot tests for UI components
- Integration tests for full flows

---

## 9. Diagram Requirements

### Architecture Diagram (Mermaid)
Show: Browser → NATS WS → Event/Command subjects → State reducer → React components

### Authentication Flow Diagram
Show: Credential load → Parse → Connect → Challenge-response → Connected

### Event-Driven State Flow
Show: NATS events → Reducer → IndexedDB → React state → UI

### Cross-Tab Sync Diagram
Show: Tab A → BroadcastChannel → Tab B state invalidation

---

## 10. AI Agent Considerations

### Documentation Structure for RAG
- Clear section headers for retrieval
- Complete code examples (not snippets)
- Type definitions inline with usage
- Pattern names for searchability

### Explicit Patterns for Code Generation
- Full function signatures
- Required imports listed
- Error handling included
- TypeScript types for validation

---

## Resolved Clarifications

| Original Unknown | Resolution |
|-----------------|------------|
| Documentation location | `docs/` at project root |
| Diagram format | Mermaid (text-based, GitHub-native) |
| Node.js version | 20.x LTS minimum |
| Migration guidance | "Migration Tips" section included |
| Scope boundaries | Deployment/CI/CD out of scope; event patterns in scope |

---

## Next Steps

1. **Phase 1**: Create data-model.md defining documentation structure entities
2. **Phase 1**: Create quickstart.md for implementation guidance
3. **Phase 1**: No API contracts needed (documentation feature)
4. **Phase 2**: Generate tasks.md for documentation writing tasks

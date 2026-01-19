# Research: Event-Driven State Management

**Feature**: 002-event-driven-state
**Date**: 2026-01-19
**Status**: Complete

This document captures the research findings for implementing event-driven state management in the NATS UI template.

---

## 1. IndexedDB State Persistence

### Decision: Dexie.js for IndexedDB Abstraction

**Rationale**:
- Native IndexedDB has aggressive transaction auto-commit behavior (especially Safari)
- Dexie.js provides proper transaction management, type safety, and reactive queries
- `dexie-react-hooks` offers `useLiveQuery` for automatic re-renders on data changes
- Works seamlessly across browser tabs via built-in change detection

**Alternatives Considered**:
- Raw IndexedDB API: Rejected due to complex transaction management and lack of reactive queries
- idb (Jake Archibald's wrapper): Considered, but lacks React integration and live queries

### Decision: Normalized State Records (not monolithic)

**Rationale**:
- Storing entire state tree as single record blocks main thread unnecessarily
- Normalized records allow partial updates without rewriting entire state
- Better performance for large state trees

**Implementation Pattern**:
```typescript
// Normalized stores by entity type
db.version(1).stores({
  users: 'id, email',
  sessions: 'id, userId, createdAt',
  notifications: '++id, userId, read, timestamp'
});
```

### Decision: In-Memory Fallback for IndexedDB Unavailability

**Rationale**:
- Private browsing modes may restrict IndexedDB (Safari, older Firefox)
- Application must remain functional without persistent storage
- Warning indicator when running in fallback mode

**Implementation Pattern**:
```typescript
interface StateStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  isAvailable: boolean;
}
```

---

## 2. Cross-Tab State Synchronization

### Decision: BroadcastChannel for Notifications + IndexedDB as Source of Truth

**Rationale**:
- IndexedDB doesn't have built-in cross-tab change notifications
- BroadcastChannel provides instant, low-overhead messaging
- Large data should be read from IndexedDB, not sent via BroadcastChannel
- Pattern already established in 001-react-auth-boilerplate for credential sync

**Alternatives Considered**:
- localStorage events: Rejected due to limited payload size and synchronous API
- SharedWorker: Overkill for this use case, browser support concerns
- IndexedDB polling: Rejected due to performance overhead

**Implementation Pattern**:
```typescript
// Tab A writes to IndexedDB and broadcasts invalidation
await db.state.put(newState);
broadcastChannel.postMessage({ type: 'STATE_INVALIDATED', keys: ['users'] });

// Tab B receives invalidation and re-reads from IndexedDB
channel.onmessage = async (event) => {
  if (event.data.type === 'STATE_INVALIDATED') {
    const freshState = await db.state.get(event.data.keys);
    updateLocalState(freshState);
  }
};
```

### Decision: Independent NATS Connections per Tab

**Rationale**:
- Aligns with spec clarification: "Each tab has independent NATS connection, IndexedDB syncs state between tabs"
- Avoids complexity of SharedWorker for connection sharing
- Each tab receives events directly, ensuring real-time updates
- IndexedDB provides eventual consistency across tabs

---

## 3. NATS Event Subscription Patterns

### Decision: Wildcard Subscription with Event Type Discrimination

**Rationale**:
- Single subscription to `{namespace}.events.>` captures all domain events
- Event type in payload determines which reducer to apply
- Simpler than managing multiple subscriptions per domain

**Subject Pattern**:
- Events: `{namespace}.events.{domain}.{action}` (e.g., `app.events.user.updated`)
- Commands: `{namespace}.commands.{domain}.{action}` (e.g., `app.commands.notification.dismiss`)
- State requests: `{namespace}.state.get` for initial state fetch

### Decision: Full State Re-fetch on Reconnection (not event replay)

**Rationale**:
- Aligns with spec: "Full state re-fetch from backend (not event replay)"
- Simpler than tracking sequence numbers and requesting missed events
- Server is source of truth; client state is eventually consistent
- Avoids complexity of gap detection and buffering

**Implementation Pattern**:
```typescript
for await (const status of nc.status()) {
  if (status.type === Events.Reconnect) {
    await refreshStateFromServer();
  }
}
```

### Decision: Subscribe First, Then Fetch Initial State

**Rationale**:
- Prevents race condition where events arrive after fetch but before subscription
- Buffer events during initial fetch, apply after state is loaded
- Ensures no events are missed during initialization

---

## 4. Event-to-State Reduction

### Decision: Shared Reducer Pattern for React and Persistence

**Rationale**:
- Same reducer function used for React state updates and IndexedDB persistence
- Enables predictable state transitions
- Simplifies testing and debugging

**Implementation Pattern**:
```typescript
type AppEvent =
  | { type: 'user.updated'; payload: { id: string; changes: Partial<User> } }
  | { type: 'notification.received'; payload: Notification }
  | { type: 'session.expired'; payload: { sessionId: string } };

function appReducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'user.updated':
      return { ...state, users: { ...state.users, [event.payload.id]: { ...state.users[event.payload.id], ...event.payload.changes } } };
    // ... other cases
  }
}
```

### Decision: Optimistic Updates for Commands (with Rollback)

**Rationale**:
- Provides immediate UI feedback for user actions
- Command failure triggers state rollback or refresh
- Aligns with modern UX expectations

---

## 5. Command Execution Pattern

### Decision: Request-Reply with Correlation ID

**Rationale**:
- NATS request/reply provides built-in timeout handling
- Correlation ID in command payload tracks command through system
- Success/failure acknowledgment returned to caller

**Implementation Pattern**:
```typescript
interface Command<T> {
  id: string;           // UUID for correlation
  type: string;         // Command type
  payload: T;           // Command payload
  timestamp: number;    // Issued time
}

interface CommandResult<T> {
  commandId: string;    // Correlates to command.id
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}
```

### Decision: Commands Blocked When Offline

**Rationale**:
- Aligns with spec: "System MUST NOT allow command execution when offline"
- Prevents stale command queuing that could cause conflicts
- Clear user feedback that action cannot be performed

---

## 6. Theme Implementation

### Decision: Tailwind CSS 4.x Class Strategy with CSS Variables

**Rationale**:
- Tailwind v4 supports `@custom-variant dark` and `@theme` directive
- CSS variables enable smooth transitions between themes
- Class-based strategy (`dark` class on `<html>`) provides explicit control

**Implementation Pattern**:
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222 47% 11%);
}

@layer theme {
  :root {
    @variant dark {
      --color-background: hsl(222 47% 11%);
      --color-foreground: hsl(210 40% 98%);
    }
  }
}
```

### Decision: FOUC Prevention via Inline Script

**Rationale**:
- Theme must be applied before React hydrates to prevent flash
- Inline script in `<head>` reads localStorage and applies class immediately
- No visible flicker on page load

**Implementation Pattern**:
```html
<script>
  (function() {
    const stored = localStorage.getItem('theme');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (system ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  })();
</script>
```

### Decision: Three-State Theme (light | dark | system)

**Rationale**:
- User can explicitly choose light or dark
- "System" option respects OS preference and updates dynamically
- Preference hierarchy: user choice > system preference > default (light)

---

## 7. State Staleness Indication

### Decision: Visual Indicator for Stale/Offline State

**Rationale**:
- Users must know when viewing potentially outdated data
- Aligns with spec: "Display staleness indicator when showing cached/offline state"
- Non-intrusive banner or badge near data display

**Implementation Pattern**:
- Track `lastSyncTimestamp` in state
- Display indicator when timestamp > threshold (e.g., 30 seconds)
- Different indicator for offline (connection.status !== 'connected')

---

## 8. Error Handling Strategy

### Decision: Domain-Specific Error Codes with User-Friendly Messages

**Rationale**:
- Consistent with existing error handling in 001-react-auth-boilerplate
- Machine-readable codes for programmatic handling
- Human-readable messages for UI display

**Error Categories**:
- `COMMAND_TIMEOUT` - Command did not receive response in time
- `COMMAND_FAILED` - Command was rejected by backend
- `STATE_SYNC_FAILED` - Failed to fetch initial or refreshed state
- `EVENT_PROCESSING_ERROR` - Malformed event received (logged, not displayed)
- `STORAGE_UNAVAILABLE` - IndexedDB not available, using fallback

---

## Summary of Technology Choices

| Area | Decision | Rationale |
|------|----------|-----------|
| IndexedDB Wrapper | Dexie.js | Transaction management, type safety, reactive queries |
| React State Sync | `useLiveQuery` from dexie-react-hooks | Automatic re-render on DB changes |
| Cross-Tab Sync | BroadcastChannel + IndexedDB | Fast notification + persistent source of truth |
| NATS Subscriptions | Wildcard subscription (`{ns}.events.>`) | Single subscription for all events |
| Reconnection | Full state re-fetch | Simpler than event replay, server is source of truth |
| Theme System | Tailwind v4 + CSS variables + class strategy | Modern, performant, no FOUC |
| Commands | Request-reply with correlation ID | Built-in timeout, trackable commands |

---

## Dependencies to Add

```json
{
  "dexie": "^4.x",
  "dexie-react-hooks": "^1.x"
}
```

Note: These are the only new runtime dependencies required. The existing `@nats-io/nats-core` and `@nats-io/nkeys` packages already support all required NATS functionality.

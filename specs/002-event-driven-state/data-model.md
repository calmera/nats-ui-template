# Data Model: Event-Driven State Management

**Feature**: 002-event-driven-state
**Date**: 2026-01-19

---

## Domain Entities

### 1. User

Represents the current authenticated user profile.

```typescript
interface User {
  id: string;                  // Unique user identifier
  email: string;               // User email address
  name: string;                // Display name
  avatarUrl?: string;          // Optional avatar URL
  updatedAt: number;           // Last update timestamp (ms)
}
```

**Validation Rules**:
- `id`: Non-empty string, typically UUID format
- `email`: Valid email format
- `name`: Non-empty string, max 255 characters
- `updatedAt`: Positive integer (Unix timestamp in ms)

**Events**:
- `user.updated` - User profile was modified

---

### 2. Session

Represents an active user session.

```typescript
interface Session {
  id: string;                  // Unique session identifier
  userId: string;              // Associated user ID
  createdAt: number;           // Session creation timestamp (ms)
  expiresAt: number;           // Session expiration timestamp (ms)
  lastActivityAt: number;      // Last activity timestamp (ms)
  deviceInfo?: string;         // Optional device/browser info
}
```

**Validation Rules**:
- `id`: Non-empty string, typically UUID format
- `userId`: Must reference valid user
- `expiresAt`: Must be greater than `createdAt`

**Events**:
- `session.created` - New session was established
- `session.expired` - Session has expired or was terminated

**State Transitions**:
```
[none] → created → active → expired
                      ↓
                   active (on refresh)
```

---

### 3. Notification

Represents a notification for the user.

```typescript
interface Notification {
  id: string;                  // Unique notification identifier
  userId: string;              // Target user ID
  type: NotificationType;      // Notification category
  title: string;               // Notification title
  message: string;             // Notification body
  read: boolean;               // Read status
  dismissed: boolean;          // Dismissed status
  createdAt: number;           // Creation timestamp (ms)
  metadata?: Record<string, unknown>; // Optional additional data
}

type NotificationType = 'info' | 'success' | 'warning' | 'error';
```

**Validation Rules**:
- `id`: Non-empty string, typically UUID format
- `userId`: Must reference valid user
- `type`: One of defined NotificationType values
- `title`: Non-empty string, max 100 characters
- `message`: Non-empty string, max 500 characters

**Events**:
- `notification.received` - New notification arrived
- `notification.read` - Notification was marked as read
- `notification.dismissed` - Notification was dismissed

**State Transitions**:
```
received → read → dismissed
    ↓        ↓
dismissed dismissed
```

---

### 4. AppState (Materialized View)

The complete application state materialized from events.

```typescript
interface AppState {
  user: User | null;                           // Current user profile
  sessions: Record<string, Session>;           // Active sessions by ID
  notifications: Record<string, Notification>; // Notifications by ID
  lastSyncedAt: number;                        // Last successful sync timestamp
  syncStatus: SyncStatus;                      // Current sync state
}

type SyncStatus = 'synced' | 'syncing' | 'stale' | 'offline';
```

**Derived Values** (computed, not stored):
- `unreadNotificationCount`: Count of notifications where `read === false && dismissed === false`
- `activeSessionCount`: Count of sessions where `expiresAt > Date.now()`
- `isStale`: `syncStatus === 'stale'` or `Date.now() - lastSyncedAt > STALE_THRESHOLD`

---

### 5. ConnectionState

Extended connection state for event-driven functionality.

```typescript
interface ConnectionState {
  status: ConnectionStatus;
  serverUrl: string | null;
  error: ConnectionError | null;
  lastConnectedAt: number | null;
  subscriptionActive: boolean;     // Event subscription status
}

type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';
```

---

### 6. ThemePreference

User's theme preference.

```typescript
interface ThemePreference {
  mode: ThemeMode;                // User's explicit choice
  resolved: ResolvedTheme;        // Computed actual theme
}

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
```

**Storage**: localStorage (not IndexedDB - simple key-value, no encryption needed)

---

## Event Types

### Base Event Structure

```typescript
interface BaseEvent {
  type: string;                  // Event type identifier
  timestamp: number;             // When event occurred (server time, ms)
  correlationId?: string;        // Optional correlation to originating command
}
```

### User Events

```typescript
interface UserUpdatedEvent extends BaseEvent {
  type: 'user.updated';
  payload: {
    id: string;
    changes: Partial<Omit<User, 'id'>>;
  };
}
```

### Session Events

```typescript
interface SessionCreatedEvent extends BaseEvent {
  type: 'session.created';
  payload: Session;
}

interface SessionExpiredEvent extends BaseEvent {
  type: 'session.expired';
  payload: {
    sessionId: string;
    reason: 'timeout' | 'logout' | 'revoked';
  };
}
```

### Notification Events

```typescript
interface NotificationReceivedEvent extends BaseEvent {
  type: 'notification.received';
  payload: Notification;
}

interface NotificationReadEvent extends BaseEvent {
  type: 'notification.read';
  payload: {
    notificationId: string;
  };
}

interface NotificationDismissedEvent extends BaseEvent {
  type: 'notification.dismissed';
  payload: {
    notificationId: string;
  };
}
```

**Note**: `notification.read` and `notification.dismissed` events are emitted by the backend after successful command processing, confirming the state change to all connected clients.

### Union Type

```typescript
type AppEvent =
  | UserUpdatedEvent
  | SessionCreatedEvent
  | SessionExpiredEvent
  | NotificationReceivedEvent
  | NotificationReadEvent
  | NotificationDismissedEvent;
```

---

## Command Types

### Base Command Structure

```typescript
interface BaseCommand {
  id: string;                    // Unique command ID (UUID)
  type: string;                  // Command type identifier
  timestamp: number;             // When command was issued (client time, ms)
}
```

### User Commands

```typescript
interface UpdateProfileCommand extends BaseCommand {
  type: 'user.updateProfile';
  payload: {
    name?: string;
    avatarUrl?: string;
  };
}
```

### Notification Commands

```typescript
interface DismissNotificationCommand extends BaseCommand {
  type: 'notification.dismiss';
  payload: {
    notificationId: string;
  };
}

interface MarkNotificationReadCommand extends BaseCommand {
  type: 'notification.markRead';
  payload: {
    notificationId: string;
  };
}

interface MarkAllNotificationsReadCommand extends BaseCommand {
  type: 'notification.markAllRead';
  payload: Record<string, never>; // Empty payload
}
```

### Union Type

```typescript
type AppCommand =
  | UpdateProfileCommand
  | DismissNotificationCommand
  | MarkNotificationReadCommand
  | MarkAllNotificationsReadCommand;
```

---

## Command Result Types

```typescript
interface CommandResult<T = unknown> {
  commandId: string;             // Correlates to command.id
  success: boolean;
  data?: T;
  error?: CommandError;
  timestamp: number;             // When result was generated (server time)
}

interface CommandError {
  code: CommandErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

type CommandErrorCode =
  | 'INVALID_PAYLOAD'            // Command payload validation failed
  | 'NOT_FOUND'                  // Referenced entity not found
  | 'PERMISSION_DENIED'          // User lacks permission
  | 'CONFLICT'                   // Concurrent modification conflict
  | 'INTERNAL_ERROR';            // Server-side error
```

---

## IndexedDB Schema

Using Dexie.js for IndexedDB abstraction:

```typescript
import Dexie, { type Table } from 'dexie';

interface StoredUser extends User {
  _stored: boolean;              // Marker for stored records
}

interface StoredSession extends Session {
  _stored: boolean;
}

interface StoredNotification extends Notification {
  _stored: boolean;
}

interface StateMeta {
  key: string;                   // 'appState' for main state
  lastSyncedAt: number;
  version: number;               // For optimistic concurrency
}

class AppDatabase extends Dexie {
  users!: Table<StoredUser, string>;
  sessions!: Table<StoredSession, string>;
  notifications!: Table<StoredNotification, string>;
  meta!: Table<StateMeta, string>;

  constructor() {
    super('nats-ui-state');

    this.version(1).stores({
      users: 'id, email',
      sessions: 'id, userId, expiresAt',
      notifications: 'id, userId, read, dismissed, createdAt',
      meta: 'key'
    });
  }
}

export const db = new AppDatabase();
```

**Index Rationale**:
- `users.email`: For lookup by email if needed
- `sessions.userId`: Query sessions for specific user
- `sessions.expiresAt`: Query for active/expired sessions
- `notifications.userId`: Query notifications for specific user
- `notifications.read`: Filter unread notifications
- `notifications.dismissed`: Filter non-dismissed notifications
- `notifications.createdAt`: Sort by creation time

---

## State Reducer

```typescript
function appStateReducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'user.updated':
      if (!state.user || state.user.id !== event.payload.id) return state;
      return {
        ...state,
        user: { ...state.user, ...event.payload.changes },
      };

    case 'session.created':
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [event.payload.id]: event.payload,
        },
      };

    case 'session.expired':
      const { [event.payload.sessionId]: _, ...remainingSessions } = state.sessions;
      return {
        ...state,
        sessions: remainingSessions,
      };

    case 'notification.received':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [event.payload.id]: event.payload,
        },
      };

    case 'notification.read': {
      const notification = state.notifications[event.payload.notificationId];
      if (!notification) return state;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [event.payload.notificationId]: { ...notification, read: true },
        },
      };
    }

    case 'notification.dismissed': {
      const notification = state.notifications[event.payload.notificationId];
      if (!notification) return state;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [event.payload.notificationId]: { ...notification, dismissed: true },
        },
      };
    }

    default:
      return state;
  }
}
```

---

## Initial State

```typescript
const INITIAL_APP_STATE: AppState = {
  user: null,
  sessions: {},
  notifications: {},
  lastSyncedAt: 0,
  syncStatus: 'syncing',
};
```

---

## State Request/Response

### Get State Request

Subject: `{namespace}.state.get`

```typescript
interface GetStateRequest {
  // Empty request - returns full state for authenticated user
}

interface GetStateResponse {
  user: User;
  sessions: Session[];
  notifications: Notification[];
  serverTime: number;            // Current server time for clock sync
}
```

---

## Cross-Tab Sync Messages

```typescript
interface TabSyncMessage {
  type: TabSyncMessageType;
  tabId: string;                 // Originating tab
  timestamp: number;
  payload?: unknown;
}

type TabSyncMessageType =
  | 'STATE_INVALIDATED'          // State changed, re-read from IndexedDB
  | 'THEME_CHANGED'              // Theme preference changed
  | 'LOGOUT'                     // User logged out
  | 'CONNECTION_STATUS_CHANGED'; // Connection status changed
```

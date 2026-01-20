# Quick Reference

API reference for hooks, contexts, types, and NATS patterns. This document is optimized for AI code generation.

## Hooks

### useAuth

Authentication operations and credential lifecycle.

**Import:**
```typescript
import { useAuth } from '@/hooks/useAuth';
```

**Signature:**
```typescript
function useAuth(): {
  // State
  credential: Credential | null;
  credentialStatus: CredentialStatus;
  connectionStatus: ConnectionStatus;
  connectionError: ConnectionError | null;
  serverUrl: string;
  authCheckComplete: boolean;

  // Derived state
  isAuthenticated: boolean;
  isLoading: boolean;
  canAccessPrivate: boolean;

  // Actions
  authenticateWithFile: (file: File, serverUrl: string, persistCredential?: boolean) => Promise<boolean>;
  authenticateWithCredential: (credential: Credential, serverUrl: string, persistCredential?: boolean) => Promise<boolean>;
  authenticateWithStoredCredentials: () => Promise<boolean>;
  hasStoredCredentials: () => Promise<boolean>;
  disconnect: (clearStoredCredentials?: boolean) => Promise<void>;
  setAuthCheckComplete: () => void;
};
```

**Example:**
```tsx
import { useAuth } from '@/hooks/useAuth';

function LoginPage() {
  const {
    authenticateWithFile,
    isLoading,
    isAuthenticated,
    connectionError,
  } = useAuth();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const success = await authenticateWithFile(file, import.meta.env.VITE_NATS_URL);
    if (!success && connectionError) {
      alert(connectionError.userMessage);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <input
      type="file"
      accept=".creds"
      onChange={handleFileSelect}
      disabled={isLoading}
    />
  );
}
```

---

### useAppState

Access to materialized application state.

**Import:**
```typescript
import { useAppState } from '@/hooks/useAppState';
```

**Signature:**
```typescript
function useAppState(): {
  user: User | null;
  sessions: Record<string, Session>;
  notifications: Record<string, Notification>;
  syncStatus: SyncStatus;
  lastSyncedAt: number;
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  isStale: boolean;
  unreadNotificationCount: number;
  activeSessionCount: number;
  notificationList: Notification[];
  activeSessionList: Session[];
  refreshState: () => Promise<void>;
};
```

**Example:**
```tsx
import { useAppState } from '@/hooks/useAppState';

function Dashboard() {
  const {
    user,
    notificationList,
    unreadNotificationCount,
    isLoading,
    isStale,
    refreshState,
  } = useAppState();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {isStale && <StaleBanner onRefresh={refreshState} />}
      <h1>Welcome, {user?.name}</h1>
      <NotificationBadge count={unreadNotificationCount} />
      <NotificationList items={notificationList} />
    </div>
  );
}
```

---

### useCommand

Execute commands with optimistic updates and error handling.

**Import:**
```typescript
import { useCommand } from '@/hooks/useCommand';
```

**Signature:**
```typescript
function useCommand(): {
  execute: <T = unknown>(type: CommandType, payload: CommandPayload) => Promise<CommandResult<T>>;
  isExecuting: boolean;
  error: string | null;
  canExecute: boolean;
  clearError: () => void;
};

type CommandType =
  | "user.updateProfile"
  | "notification.dismiss"
  | "notification.markRead"
  | "notification.markAllRead";

type CommandPayload =
  | { name?: string; avatarUrl?: string }  // user.updateProfile
  | { notificationId: string }              // notification.dismiss, markRead
  | Record<string, never>;                  // notification.markAllRead
```

**Example:**
```tsx
import { useCommand } from '@/hooks/useCommand';

function ProfileEditor({ currentName }: { currentName: string }) {
  const { execute, isExecuting, error, canExecute, clearError } = useCommand();
  const [name, setName] = useState(currentName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await execute('user.updateProfile', { name });
    if (!result.success) {
      console.error('Update failed:', result.error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit" disabled={!canExecute || isExecuting}>
        {isExecuting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

---

### useNatsConnection

Connection state monitoring and raw connection access.

**Import:**
```typescript
import { useNatsConnection } from '@/hooks/useNatsConnection';
```

**Signature:**
```typescript
function useNatsConnection(): {
  status: ConnectionStatus;
  serverUrl: string;
  connectedAt: number | null;
  reconnectAttempt: number;
  error: ConnectionError | null;
  lastEvent: NatsEvent | null;
  getConnectionStatus: () => ConnectionStatus;
  isConnected: () => boolean;
  getConnection: () => NatsConnection | null;
};
```

**Example:**
```tsx
import { useNatsConnection } from '@/hooks/useNatsConnection';
import { StringCodec } from '@nats-io/nats-core';

function DirectPublish() {
  const { getConnection, isConnected } = useNatsConnection();
  const sc = StringCodec();

  const publish = () => {
    const conn = getConnection();
    if (!conn) return;

    conn.publish(
      'app.events.custom',
      sc.encode(JSON.stringify({ data: 'hello' }))
    );
  };

  return (
    <button onClick={publish} disabled={!isConnected()}>
      Publish
    </button>
  );
}
```

---

### useEventSubscription

Subscribe to specific event types.

**Import:**
```typescript
import { useEventSubscription, useEventSubscriptions } from '@/hooks/useEventSubscription';
```

**Signature:**
```typescript
function useEventSubscription<T extends AppEvent>(
  eventType: T["type"],
  handler: (event: T) => void
): void;

function useEventSubscriptions(
  handlers: Partial<Record<EventType, (event: AppEvent) => void>>
): void;
```

**Example:**
```tsx
import { useEventSubscription, useEventSubscriptions } from '@/hooks/useEventSubscription';

// Single event type
function NotificationToast() {
  useEventSubscription('notification.received', (event) => {
    toast.info(event.payload.title, {
      description: event.payload.message,
    });
  });

  return null;
}

// Multiple event types
function EventLogger() {
  useEventSubscriptions({
    'user.updated': (event) => console.log('User updated:', event),
    'notification.received': (event) => console.log('Notification:', event),
    'session.expired': (event) => console.log('Session expired:', event),
  });

  return null;
}
```

---

### useTheme

Theme management (light/dark/system).

**Import:**
```typescript
import { useTheme } from '@/hooks/useTheme';
```

**Signature:**
```typescript
function useTheme(): {
  theme: ThemeMode;           // "light" | "dark" | "system"
  resolvedTheme: ResolvedTheme; // "light" | "dark"
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isSystem: boolean;
};
```

**Example:**
```tsx
import { useTheme } from '@/hooks/useTheme';

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, toggleTheme, isDark } = useTheme();

  return (
    <div>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
      <button onClick={toggleTheme}>Toggle</button>
      <p>Current: {resolvedTheme} (setting: {theme})</p>
    </div>
  );
}
```

---

### useConnectionSync

Cross-tab synchronization.

**Import:**
```typescript
import { useConnectionSync } from '@/hooks/useConnectionSync';
```

**Signature:**
```typescript
function useConnectionSync(): {
  tabId: string;
  broadcastCredentialLoaded: () => void;
  broadcastCredentialCleared: () => void;
  broadcastState: (status: ConnectionStatus, hasCredential: boolean) => void;
};
```

**Example:**
```tsx
import { useConnectionSync } from '@/hooks/useConnectionSync';

function App() {
  // Include at app root for automatic cross-tab sync
  useConnectionSync();

  return <AppRoutes />;
}
```

---

## Contexts

### AuthContext

Central authentication state.

**Import:**
```typescript
import { AuthContextProvider, useAuthContext } from '@/contexts/AuthContext';
```

**Provider Props:**
```typescript
interface AuthContextProviderProps {
  children: React.ReactNode;
}
```

**Context Value:**
```typescript
interface AuthContextValue {
  state: AuthState;
  derived: DerivedAuthState;
  loadCredential: (credential: Credential) => void;
  loadCredentialError: (error: ConnectionError) => void;
  setConnecting: () => void;
  setConnected: (serverUrl: string) => void;
  setReconnecting: (attempt: number) => void;
  setDisconnected: () => void;
  setFailed: (error: ConnectionError) => void;
  setAuthCheckComplete: () => void;
  clearCredential: () => void;
  syncState: (state: Partial<AuthState>) => void;
}
```

---

### EventContext

Event-driven application state.

**Import:**
```typescript
import { EventContextProvider, useEventContext } from '@/contexts/EventContext';
```

**Context Value:**
```typescript
interface EventContextValue {
  state: AppState;
  isLoading: boolean;
  hasError: boolean;
  isStale: boolean;
  unreadNotificationCount: number;
  activeSessionCount: number;
  refreshState: () => Promise<void>;
}
```

---

### ThemeContext

Theme preferences.

**Import:**
```typescript
import { ThemeContextProvider, useThemeContext } from '@/contexts/ThemeContext';
```

**Context Value:**
```typescript
interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}
```

---

## Type Definitions

### Credentials

```typescript
type AuthType = "credsfile" | "userpass";
type CredentialStatus = "not_loaded" | "loading" | "loaded" | "invalid";

interface CredsFileCredential {
  authType: "credsfile";
  id: string;
  loadedAt: number;
  source: "file" | "storage";
  jwt: string;
  seed: Uint8Array;
  publicKey: string;
}

interface UserPassCredential {
  authType: "userpass";
  id: string;
  loadedAt: number;
  source: "form" | "storage";
  username: string;
  password: string;
}

type Credential = CredsFileCredential | UserPassCredential;
```

### Connection

```typescript
type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

type ConnectionErrorCode =
  | "INVALID_CREDENTIAL"
  | "AUTH_FAILED"
  | "CONNECTION_REFUSED"
  | "CONNECTION_TIMEOUT"
  | "PERMISSION_DENIED"
  | "SERVER_ERROR"
  | "UNKNOWN";

interface ConnectionError {
  code: ConnectionErrorCode;
  message: string;
  userMessage: string;
  timestamp: number;
  recoverable: boolean;
}
```

### Domain Entities

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  account?: string;
  server?: string;
  cluster?: string;
  jetstream?: boolean;
  updatedAt: number;
}

interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  deviceInfo?: string;
}

type NotificationType = "info" | "success" | "warning" | "error";

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  createdAt: number;
  metadata?: Record<string, unknown>;
}
```

### State

```typescript
type SyncStatus = "synced" | "syncing" | "stale" | "offline";

interface AppState {
  user: User | null;
  sessions: Record<string, Session>;
  notifications: Record<string, Notification>;
  lastSyncedAt: number;
  syncStatus: SyncStatus;
}

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";
```

---

## Event Types

| Event Type | Payload | Description |
|------------|---------|-------------|
| `user.updated` | `{ id: string, changes: Partial<User> }` | User profile changed |
| `session.created` | `Session` | New session started |
| `session.expired` | `{ sessionId: string, reason: "timeout" \| "logout" \| "revoked" }` | Session terminated |
| `notification.received` | `Notification` | New notification |
| `notification.read` | `{ notificationId: string }` | Notification marked read |
| `notification.dismissed` | `{ notificationId: string }` | Notification dismissed |

### Type Guards

```typescript
import {
  isUserUpdatedEvent,
  isSessionCreatedEvent,
  isSessionExpiredEvent,
  isNotificationReceivedEvent,
  isNotificationReadEvent,
  isNotificationDismissedEvent,
} from '@/types/events';

// Example usage
function handleEvent(event: AppEvent) {
  if (isUserUpdatedEvent(event)) {
    console.log('User changes:', event.payload.changes);
  }
}
```

---

## Command Types

| Command Type | Payload | Response |
|--------------|---------|----------|
| `user.updateProfile` | `{ name?: string, avatarUrl?: string }` | `CommandResult<User>` |
| `notification.dismiss` | `{ notificationId: string }` | `CommandResult<void>` |
| `notification.markRead` | `{ notificationId: string }` | `CommandResult<void>` |
| `notification.markAllRead` | `{}` | `CommandResult<{ count: number }>` |

### Command Result Types

```typescript
type CommandErrorCode =
  | "INVALID_PAYLOAD"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

interface CommandResultSuccess<T> {
  commandId: string;
  success: true;
  data: T;
  timestamp: number;
}

interface CommandResultFailure {
  commandId: string;
  success: false;
  error: { code: CommandErrorCode; message: string; details?: Record<string, unknown> };
  timestamp: number;
}

type CommandResult<T> = CommandResultSuccess<T> | CommandResultFailure;

// Type guards
import { isCommandSuccess, isCommandFailure } from '@/types/commands';
```

---

## NATS Subject Patterns

### Events

| Pattern | Example | Description |
|---------|---------|-------------|
| `{ns}.events.user.updated` | `app.events.user.updated` | User profile changed |
| `{ns}.events.session.created` | `app.events.session.created` | New session |
| `{ns}.events.session.expired` | `app.events.session.expired` | Session ended |
| `{ns}.events.notification.*` | `app.events.notification.received` | Notification events |

### Commands

| Pattern | Example | Description |
|---------|---------|-------------|
| `{ns}.cmd.user.updateProfile` | `app.cmd.user.updateProfile` | Update profile |
| `{ns}.cmd.notification.dismiss` | `app.cmd.notification.dismiss` | Dismiss notification |
| `{ns}.cmd.notification.markRead` | `app.cmd.notification.markRead` | Mark as read |
| `{ns}.cmd.notification.markAllRead` | `app.cmd.notification.markAllRead` | Mark all read |

### System

| Subject | Description |
|---------|-------------|
| `$SYS.REQ.USER.INFO` | Fetch user/server info on connection |

### Wildcards

| Wildcard | Meaning | Example |
|----------|---------|---------|
| `*` | One token | `app.events.*.updated` |
| `>` | One or more tokens | `app.events.>` |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_NATS_URL` | Yes | - | NATS WebSocket URL |
| `VITE_NATS_NAMESPACE` | No | `app` | Subject namespace prefix |
| `VITE_AUTH_TYPE` | No | `credsfile` | Default auth type |

**Example `.env`:**
```bash
VITE_NATS_URL=wss://nats.example.com:443
VITE_NATS_NAMESPACE=myapp
VITE_AUTH_TYPE=credsfile
```

---

## Integration Patterns

### Pattern 1: Complete Auth Flow

```tsx
import { useAuth } from '@/hooks/useAuth';
import { useAppState } from '@/hooks/useAppState';

function App() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: stateLoading, user } = useAppState();

  if (authLoading) return <AuthLoadingScreen />;
  if (!isAuthenticated) return <LoginPage />;
  if (stateLoading) return <LoadingScreen />;

  return <MainApp user={user!} />;
}
```

### Pattern 2: Protected Route

```tsx
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authCheckComplete } = useAuth();

  if (!authCheckComplete) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return <>{children}</>;
}
```

### Pattern 3: Command with Feedback

```tsx
import { useCommand } from '@/hooks/useCommand';
import { useState } from 'react';

function DismissButton({ notificationId }: { notificationId: string }) {
  const { execute, isExecuting } = useCommand();
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = async () => {
    const result = await execute('notification.dismiss', { notificationId });
    if (result.success) {
      setDismissed(true);
    }
  };

  if (dismissed) return null;

  return (
    <button onClick={handleDismiss} disabled={isExecuting}>
      {isExecuting ? 'Dismissing...' : 'Dismiss'}
    </button>
  );
}
```

### Pattern 4: Real-time Notification Handler

```tsx
import { useEventSubscription } from '@/hooks/useEventSubscription';
import { useAppState } from '@/hooks/useAppState';

function NotificationCenter() {
  const { notificationList, unreadNotificationCount } = useAppState();

  useEventSubscription('notification.received', (event) => {
    // Play sound, show toast, etc.
    new Audio('/notification.mp3').play();
    toast.info(event.payload.title);
  });

  return (
    <div>
      <Badge count={unreadNotificationCount} />
      <NotificationList items={notificationList} />
    </div>
  );
}
```

---

## Related Documentation

- [Architecture](./architecture.md) - System component overview
- [Concepts](./concepts/) - In-depth explanations
- [Best Practices](./best-practices/) - Recommended patterns
- [Troubleshooting](./troubleshooting.md) - Common issues

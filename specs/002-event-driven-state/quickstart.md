# Quickstart: Event-Driven State Management

**Feature**: 002-event-driven-state
**Date**: 2026-01-19

This guide provides a quick overview of how to use the event-driven state management system.

---

## Overview

The event-driven state management system transforms the browser into a materialized view of NATS events. Key concepts:

1. **Initial State**: Loaded via NATS request/response on app start
2. **Event Subscription**: Real-time updates via `{namespace}.events.>` subscription
3. **Commands**: User actions sent via NATS request/response
4. **Persistence**: State persisted in IndexedDB for offline access
5. **Cross-Tab Sync**: State synchronized across browser tabs

---

## Quick Setup

### 1. Configure the Namespace

```typescript
// In your app configuration
const NATS_NAMESPACE = import.meta.env.VITE_NATS_NAMESPACE || 'app';
```

### 2. Wrap Your App with Providers

```tsx
import { AuthProvider } from './contexts/AuthContext';
import { EventProvider } from './contexts/EventContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EventProvider namespace={NATS_NAMESPACE}>
          <Router>
            {/* Your routes */}
          </Router>
        </EventProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

---

## Using Application State

### Access State with `useAppState`

```tsx
import { useAppState } from './hooks/useAppState';

function Dashboard() {
  const { user, notifications, sessions, syncStatus, isStale } = useAppState();

  if (!user) return <LoadingSpinner />;

  return (
    <div>
      {isStale && <StalenessIndicator />}
      <h1>Welcome, {user.name}</h1>
      <NotificationList notifications={Object.values(notifications)} />
      <SessionList sessions={Object.values(sessions)} />
    </div>
  );
}
```

### Computed Values

```tsx
const { unreadCount, activeSessionCount } = useAppState();

// unreadCount: number of unread, non-dismissed notifications
// activeSessionCount: number of non-expired sessions
```

---

## Executing Commands

### Use the `useCommand` Hook

```tsx
import { useCommand } from './hooks/useCommand';

function ProfileEditor() {
  const { execute, isExecuting, error } = useCommand();

  const handleUpdateProfile = async (name: string) => {
    const result = await execute('user.updateProfile', { name });

    if (result.success) {
      // Success! State will update automatically via events
      console.log('Profile updated');
    } else {
      // Handle error
      console.error(result.error.message);
    }
  };

  return (
    <form onSubmit={/* ... */}>
      {error && <ErrorMessage error={error} />}
      <button disabled={isExecuting}>
        {isExecuting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Available Commands

```typescript
// Update user profile
execute('user.updateProfile', { name: 'New Name' });

// Dismiss a notification
execute('notification.dismiss', { notificationId: 'notif-123' });

// Mark notification as read
execute('notification.markRead', { notificationId: 'notif-123' });

// Mark all notifications as read
execute('notification.markAllRead', {});
```

---

## Theme Switching

### Use the `useTheme` Hook

```tsx
import { useTheme } from './hooks/useTheme';

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
      <p>Current: {resolvedTheme}</p>
    </div>
  );
}
```

### Theme Modes

- `'light'` - Always use light theme
- `'dark'` - Always use dark theme
- `'system'` - Follow OS preference

---

## Handling Connection State

### Monitor Connection with `useAuth`

```tsx
import { useAuth } from './hooks/useAuth';

function ConnectionIndicator() {
  const { connectionStatus, isAuthenticated } = useAuth();

  if (connectionStatus === 'reconnecting') {
    return <span>Reconnecting...</span>;
  }

  if (connectionStatus === 'failed') {
    return <span>Connection failed</span>;
  }

  return <span>{isAuthenticated ? 'Connected' : 'Disconnected'}</span>;
}
```

---

## Offline Behavior

### Viewing Cached State

When offline, the app displays the last synchronized state from IndexedDB:

```tsx
function OfflineIndicator() {
  const { syncStatus } = useAppState();

  if (syncStatus === 'offline') {
    return (
      <div className="bg-yellow-100 p-2">
        You are offline. Viewing cached data.
      </div>
    );
  }

  return null;
}
```

### Command Blocking

Commands are automatically blocked when offline:

```tsx
const { execute, canExecute } = useCommand();

// canExecute is false when offline
<button disabled={!canExecute}>Submit</button>
```

---

## Event Subscription Details

### Automatic Subscription

The `EventProvider` automatically:
1. Subscribes to `{namespace}.events.>` after authentication
2. Processes incoming events through the state reducer
3. Persists state changes to IndexedDB
4. Re-fetches full state on reconnection

### Manual Event Listening (Advanced)

```tsx
import { useEventSubscription } from './hooks/useEventSubscription';

function NotificationToast() {
  useEventSubscription('notification.received', (event) => {
    // Show toast notification
    toast.info(event.payload.title);
  });

  return null;
}
```

---

## Configuration

### Environment Variables

```bash
# .env.local
VITE_NATS_URL=wss://nats.example.com
VITE_NATS_NAMESPACE=myapp
```

### Timeout Configuration

```typescript
// Default timeouts (can be overridden)
const TIMEOUTS = {
  stateRequest: 10000,    // Initial state fetch
  commandDefault: 5000,   // Most commands
  commandLong: 10000,     // markAllRead, updateProfile
};
```

---

## Error Handling

### Connection Errors

```tsx
const { connectionError } = useAuth();

if (connectionError) {
  return (
    <div>
      <p>Error: {connectionError.message}</p>
      {connectionError.recoverable && (
        <button onClick={reconnect}>Retry</button>
      )}
    </div>
  );
}
```

### Command Errors

```tsx
const result = await execute('notification.dismiss', { notificationId });

if (!result.success) {
  switch (result.error.code) {
    case 'NOT_FOUND':
      console.log('Notification not found');
      break;
    case 'PERMISSION_DENIED':
      console.log('You cannot dismiss this notification');
      break;
    default:
      console.log('An error occurred:', result.error.message);
  }
}
```

---

## Testing

### Mock State for Testing

```tsx
import { TestEventProvider } from './test-utils';

function renderWithState(ui: React.ReactElement, initialState: Partial<AppState>) {
  return render(
    <TestEventProvider initialState={initialState}>
      {ui}
    </TestEventProvider>
  );
}

test('shows unread count', () => {
  renderWithState(<NotificationBadge />, {
    notifications: {
      'n1': { id: 'n1', read: false, dismissed: false, /* ... */ },
      'n2': { id: 'n2', read: true, dismissed: false, /* ... */ },
    },
  });

  expect(screen.getByText('1')).toBeInTheDocument();
});
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Tab                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   React     │    │   State     │    │   Theme     │         │
│  │ Components  │◄───│   Context   │    │   Context   │         │
│  └─────────────┘    └──────┬──────┘    └─────────────┘         │
│                            │                                     │
│                     ┌──────▼──────┐                             │
│                     │   Event     │                             │
│                     │   Reducer   │                             │
│                     └──────┬──────┘                             │
│                            │                                     │
│  ┌─────────────┐    ┌──────▼──────┐    ┌─────────────┐         │
│  │  IndexedDB  │◄───│   State     │    │ Broadcast   │         │
│  │   (Dexie)   │    │   Service   │───►│   Channel   │◄─────┐  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘      │  │
│                            │                                 │  │
│                     ┌──────▼──────┐                         │  │
│                     │    NATS     │                         │  │
│                     │   Service   │                         │  │
│                     └──────┬──────┘                         │  │
└────────────────────────────┼────────────────────────────────┼──┘
                             │                                │
                             │ WebSocket                      │
                             ▼                                │
                      ┌─────────────┐                         │
                      │    NATS     │                         │
                      │   Server    │                         │
                      └─────────────┘                         │
                                                              │
┌─────────────────────────────────────────────────────────────┼──┐
│                      Other Browser Tab                      │  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │  │
│  │   React     │◄───│   State     │◄───│ Broadcast   │◄────┘  │
│  │ Components  │    │   Context   │    │   Channel   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└───────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. Review the [Data Model](./data-model.md) for entity definitions
2. Review the [NATS Contracts](./contracts/nats-subjects.md) for message formats
3. Run the tests to verify everything works
4. Customize the sample events/commands for your domain

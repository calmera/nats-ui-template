# Migration Tips

This guide helps you adopt NATS patterns incrementally in existing applications.

## Incremental Adoption Strategy

Migrating to NATS-native architecture doesn't require a big-bang rewrite. Follow these phases:

### Phase 1: Add NATS Connection (Low Risk)

Start by adding NATS connectivity alongside your existing REST API:

```tsx
// 1. Add NATS providers to your app
import { AuthContextProvider } from '@/contexts/AuthContext';
import { EventContextProvider } from '@/contexts/EventContext';

function App() {
  return (
    <AuthContextProvider>
      <EventContextProvider>
        <ExistingApp /> {/* Your existing application */}
      </EventContextProvider>
    </AuthContextProvider>
  );
}
```

```tsx
// 2. Add authentication component (optional at first)
import { AutoConnect } from '@/components/AutoConnect';

function ExistingApp() {
  return (
    <>
      <AutoConnect /> {/* Attempts to connect if credentials stored */}
      <ExistingRoutes />
    </>
  );
}
```

At this point, your app works exactly as before but has NATS infrastructure ready.

### Phase 2: Subscribe to Events (Read-Only)

Add real-time updates without changing existing data fetching:

```tsx
import { useEventSubscription } from '@/hooks/useEventSubscription';
import { useExistingDataHook } from './existing/hooks';

function Dashboard() {
  // Keep existing data fetching
  const { data, refetch } = useExistingDataHook();

  // Add real-time refresh trigger
  useEventSubscription('data.updated', () => {
    // When NATS event arrives, refresh via existing mechanism
    refetch();
  });

  return <DashboardContent data={data} />;
}
```

This hybrid approach gives you real-time updates with minimal code changes.

### Phase 3: Convert One Endpoint at a Time

Pick a low-risk endpoint and convert it to NATS:

```tsx
// Before: REST call
async function updateProfile(name: string) {
  const response = await fetch('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  return response.json();
}

// After: NATS command
import { useCommand } from '@/hooks/useCommand';

function ProfileEditor() {
  const { execute } = useCommand();

  async function updateProfile(name: string) {
    const result = await execute('user.updateProfile', { name });
    return result.success ? result.data : null;
  }
}
```

### Phase 4: Add Event-Driven State

Replace REST data fetching with event-driven state:

```tsx
// Before: REST polling
function NotificationList() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications().then(setNotifications);
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return <List items={notifications} />;
}

// After: Event-driven
import { useAppState } from '@/hooks/useAppState';

function NotificationList() {
  const { notificationList } = useAppState();
  // Automatically updates when events arrive
  return <List items={notificationList} />;
}
```

### Phase 5: Full Migration

Once comfortable, migrate remaining endpoints and remove REST infrastructure.

## Adding NATS Connection to Existing App

### Minimal Setup

```tsx
// src/providers/NatsProvider.tsx
import { AuthContextProvider } from '@nats-template/contexts/AuthContext';
import { EventContextProvider } from '@nats-template/contexts/EventContext';

export function NatsProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContextProvider>
      <EventContextProvider>
        {children}
      </EventContextProvider>
    </AuthContextProvider>
  );
}

// src/App.tsx
import { NatsProvider } from './providers/NatsProvider';

function App() {
  return (
    <NatsProvider>
      <YourExistingApp />
    </NatsProvider>
  );
}
```

### Optional Authentication

If you're not ready for NATS authentication, use a service account:

```typescript
// Connect with a static service credential (for testing only)
const serviceCredential: UserPassCredential = {
  authType: 'userpass',
  id: 'service',
  loadedAt: Date.now(),
  source: 'form',
  username: process.env.NATS_SERVICE_USER!,
  password: process.env.NATS_SERVICE_PASS!,
};

// Auto-connect on app load
useEffect(() => {
  authenticateWithCredential(serviceCredential, natsUrl);
}, []);
```

## Converting REST to Event-Driven

### Pattern: Replace Polling with Subscriptions

```tsx
// Before: Polling every 30 seconds
function usePollingData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/data');
      setData(await response.json());
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return data;
}

// After: Event subscription
function useEventDrivenData() {
  const { data } = useAppState();

  // Data automatically updates when events arrive
  return data;
}
```

### Pattern: Replace POST with Command

```tsx
// Before: REST POST
async function createItem(item: Item) {
  const response = await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    throw new Error('Failed to create item');
  }

  return response.json();
}

// After: NATS command
async function createItem(item: Item) {
  const { execute } = useCommand();

  const result = await execute('items.create', item);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}
```

### Pattern: Replace Webhook with Subscription

```tsx
// Before: Webhook receiver (server-side)
app.post('/webhook/notifications', (req, res) => {
  const notification = req.body;
  // Store in database
  // Client must poll or use WebSocket to get updates
});

// After: Direct subscription (client-side)
useEventSubscription('notification.received', (event) => {
  // Handle notification immediately in the browser
  showToast(event.payload.title);
});
```

## Credential Migration

### From Session Cookies to NATS Credentials

```tsx
// Migration component
function CredentialMigration() {
  const { authenticateWithCredential } = useAuth();
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    async function migrateCredentials() {
      // Check if we have existing session
      const session = document.cookie
        .split('; ')
        .find(row => row.startsWith('session='));

      if (session) {
        setMigrating(true);

        // Exchange session for NATS credentials
        const response = await fetch('/api/auth/nats-credentials', {
          credentials: 'include',
        });

        if (response.ok) {
          const { username, password, serverUrl } = await response.json();

          await authenticateWithCredential(
            {
              authType: 'userpass',
              id: crypto.randomUUID(),
              loadedAt: Date.now(),
              source: 'form',
              username,
              password,
            },
            serverUrl
          );
        }

        setMigrating(false);
      }
    }

    migrateCredentials();
  }, []);

  if (migrating) {
    return <MigrationProgress />;
  }

  return null;
}
```

### From API Keys to Credential Files

If your existing app uses API keys, provide a migration path:

```tsx
function ApiKeyMigration() {
  const { authenticateWithCredential } = useAuth();
  const [apiKey, setApiKey] = useState('');

  const handleMigrate = async () => {
    // Exchange API key for NATS credentials via your backend
    const response = await fetch('/api/migrate-api-key', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
    });

    if (response.ok) {
      const credential = await response.json();
      await authenticateWithCredential(credential, natsUrl);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleMigrate(); }}>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Enter your API key"
      />
      <button type="submit">Migrate to NATS</button>
    </form>
  );
}
```

## State Management Migration

### From Redux to Event-Driven

```tsx
// Before: Redux store
const store = createStore(
  combineReducers({
    user: userReducer,
    notifications: notificationReducer,
  })
);

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

// After: Event-driven state
function App() {
  return (
    <AuthContextProvider>
      <EventContextProvider>
        <AppContent />
      </EventContextProvider>
    </AuthContextProvider>
  );
}

// Component changes:
// Before
const user = useSelector((state) => state.user);

// After
const { user } = useAppState();
```

### From React Query to Event-Driven

```tsx
// Before: React Query
function UserProfile() {
  const { data: user, refetch } = useQuery('user', fetchUser);

  return <Profile user={user} onRefresh={refetch} />;
}

// After: Event-driven (with fallback)
function UserProfile() {
  const { user, refreshState } = useAppState();

  // If user hasn't loaded yet via events, could still use React Query as fallback
  const { data: fallbackUser } = useQuery('user', fetchUser, {
    enabled: !user,
  });

  return <Profile user={user || fallbackUser} onRefresh={refreshState} />;
}
```

## Common Gotchas

### 1. Subject Naming Collisions

If you have existing NATS subjects, ensure no collisions:

```typescript
// Use a unique namespace for UI events
VITE_NATS_NAMESPACE=ui-app

// Your subjects will be: ui-app.events.*, ui-app.cmd.*
// Won't conflict with: backend.events.*, services.events.*
```

### 2. Authentication Order

Ensure NATS authentication happens before accessing state:

```tsx
// DON'T DO THIS
function Dashboard() {
  const { user } = useAppState(); // May fail if not connected
  return <UserCard user={user} />;
}

// DO THIS
function Dashboard() {
  const { isAuthenticated } = useAuth();
  const { user, isLoading } = useAppState();

  if (!isAuthenticated) return <Redirect to="/login" />;
  if (isLoading) return <Loading />;

  return <UserCard user={user} />;
}
```

### 3. Type Mismatches

When migrating, ensure your existing types align with NATS event types:

```typescript
// Your existing type
interface User {
  userId: string;  // Note: different field name
  displayName: string;
}

// NATS template type
interface User {
  id: string;      // Standard field name
  name: string;
}

// Create an adapter
function adaptUser(existing: ExistingUser): User {
  return {
    id: existing.userId,
    name: existing.displayName,
    email: existing.email,
    updatedAt: Date.now(),
  };
}
```

### 4. Error Handling Differences

REST and NATS handle errors differently:

```typescript
// REST: HTTP status codes
if (response.status === 404) {
  // Handle not found
}

// NATS: Command result errors
if (!result.success && result.error.code === 'NOT_FOUND') {
  // Handle not found
}
```

### 5. Offline Behavior

Your existing app might not handle offline gracefully:

```tsx
// Add offline awareness
function SaveButton({ onSave }: { onSave: () => void }) {
  const { canExecute } = useCommand();

  return (
    <button onClick={onSave} disabled={!canExecute}>
      {canExecute ? 'Save' : 'Offline'}
    </button>
  );
}
```

### 6. Browser Support

Ensure target browsers support required APIs:

| API | Chrome | Firefox | Safari | Edge |
|-----|--------|---------|--------|------|
| WebSocket | Yes | Yes | Yes | Yes |
| IndexedDB | Yes | Yes | Yes | Yes |
| BroadcastChannel | 54+ | 38+ | 15.4+ | 79+ |
| Web Crypto | Yes | Yes | Yes | Yes |

## Migration Checklist

- [ ] Add NATS context providers
- [ ] Implement authentication flow
- [ ] Test basic connectivity
- [ ] Add event subscriptions for real-time updates
- [ ] Convert first REST endpoint to NATS command
- [ ] Verify optimistic updates work
- [ ] Test offline behavior
- [ ] Convert remaining endpoints
- [ ] Remove REST infrastructure
- [ ] Update error handling patterns
- [ ] Add cross-tab synchronization
- [ ] Update tests

## Related Documentation

- [Getting Started](./getting-started.md) - Initial setup
- [NATS Fundamentals](./concepts/nats-fundamentals.md) - Messaging concepts
- [Authentication](./concepts/authentication.md) - Credential handling
- [State Management](./concepts/state-management.md) - Event-driven patterns

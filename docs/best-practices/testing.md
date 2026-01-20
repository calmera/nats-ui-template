# Testing Best Practices

This guide covers testing strategies for NATS-native React applications, including unit tests, component tests, and integration tests.

## Testing Strategy

### Test Pyramid

```
        /\
       /  \  Integration Tests
      /----\  (Few, slow, high confidence)
     /      \
    /--------\  Component Tests
   /          \  (Some, medium speed)
  /------------\  Unit Tests
 /              \  (Many, fast, isolated)
```

| Layer | Tools | Focus |
|-------|-------|-------|
| Unit | Vitest | Services, reducers, utilities |
| Component | Testing Library | UI components, hooks |
| Integration | Vitest + Testing Library | Full flows with mocked NATS |

### Test File Organization

```
react/
├── src/
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── services/
│   │   └── state/
│   │       └── reducer.ts
│   └── components/
│       └── ConnectionStatus.tsx
└── tests/
    ├── hooks/
    │   └── useAuth.test.ts
    ├── services/
    │   └── state/
    │       └── reducer.test.ts
    └── components/
        └── ConnectionStatus.test.tsx
```

## Unit Tests

### Testing the Reducer

The state reducer is a pure function, perfect for unit testing:

```typescript
// tests/services/state/reducer.test.ts
import { describe, it, expect } from 'vitest';
import { appStateReducer } from '@/services/state/reducer';
import { INITIAL_APP_STATE } from '@/types/state';
import type { UserUpdatedEvent, NotificationReceivedEvent } from '@/types/events';

describe('appStateReducer', () => {
  describe('user.updated', () => {
    it('should update user name', () => {
      const initialState = {
        ...INITIAL_APP_STATE,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Old Name',
          updatedAt: 1000,
        },
      };

      const event: UserUpdatedEvent = {
        type: 'user.updated',
        timestamp: 2000,
        payload: {
          id: 'user-1',
          changes: { name: 'New Name' },
        },
      };

      const newState = appStateReducer(initialState, event);

      expect(newState.user?.name).toBe('New Name');
      expect(newState.user?.updatedAt).toBe(2000);
      expect(newState.lastSyncedAt).toBe(2000);
    });

    it('should preserve other user fields', () => {
      const initialState = {
        ...INITIAL_APP_STATE,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.png',
          updatedAt: 1000,
        },
      };

      const event: UserUpdatedEvent = {
        type: 'user.updated',
        timestamp: 2000,
        payload: {
          id: 'user-1',
          changes: { name: 'New Name' },
        },
      };

      const newState = appStateReducer(initialState, event);

      expect(newState.user?.email).toBe('test@example.com');
      expect(newState.user?.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should not update if user is null', () => {
      const initialState = { ...INITIAL_APP_STATE, user: null };

      const event: UserUpdatedEvent = {
        type: 'user.updated',
        timestamp: 2000,
        payload: { id: 'user-1', changes: { name: 'New Name' } },
      };

      const newState = appStateReducer(initialState, event);

      expect(newState.user).toBeNull();
    });
  });

  describe('notification.received', () => {
    it('should add new notification', () => {
      const event: NotificationReceivedEvent = {
        type: 'notification.received',
        timestamp: 1000,
        payload: {
          id: 'notif-1',
          userId: 'user-1',
          type: 'info',
          title: 'Test',
          message: 'Test message',
          read: false,
          dismissed: false,
          createdAt: 1000,
        },
      };

      const newState = appStateReducer(INITIAL_APP_STATE, event);

      expect(newState.notifications['notif-1']).toBeDefined();
      expect(newState.notifications['notif-1'].title).toBe('Test');
    });
  });
});
```

### Testing Utilities

```typescript
// tests/utils/subjects.test.ts
import { describe, it, expect } from 'vitest';
import { buildSubject, parseSubject } from '@/utils/subjects';

describe('subject utilities', () => {
  describe('buildSubject', () => {
    it('should build event subject', () => {
      const subject = buildSubject('app', 'events', 'user', 'updated');
      expect(subject).toBe('app.events.user.updated');
    });

    it('should build command subject', () => {
      const subject = buildSubject('app', 'cmd', 'user', 'updateProfile');
      expect(subject).toBe('app.cmd.user.updateProfile');
    });
  });

  describe('parseSubject', () => {
    it('should parse event subject', () => {
      const parsed = parseSubject('app.events.user.updated');
      expect(parsed).toEqual({
        namespace: 'app',
        category: 'events',
        entity: 'user',
        action: 'updated',
      });
    });
  });
});
```

## Component Tests

### Testing with React Testing Library

```tsx
// tests/components/ConnectionStatus.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '@/components/ConnectionStatus';

describe('ConnectionStatus', () => {
  it('should show "Connected" when status is connected', () => {
    render(<ConnectionStatus status="connected" />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show "Connecting..." when status is connecting', () => {
    render(<ConnectionStatus status="connecting" />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should show reconnection attempt count', () => {
    render(
      <ConnectionStatus
        status="reconnecting"
        reconnectAttempt={3}
      />
    );

    expect(screen.getByText(/Reconnecting.*3/)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ConnectionStatus status="connected" className="custom-class" />);

    const element = screen.getByText('Connected').closest('div');
    expect(element).toHaveClass('custom-class');
  });
});
```

### Testing Interactive Components

```tsx
// tests/components/CredentialUpload.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CredentialUpload } from '@/components/CredentialUpload';

describe('CredentialUpload', () => {
  it('should call onCredentialLoaded when valid file is selected', async () => {
    const mockOnLoaded = vi.fn();
    const mockOnError = vi.fn();

    render(
      <CredentialUpload
        onCredentialLoaded={mockOnLoaded}
        onError={mockOnError}
      />
    );

    const file = new File(['test content'], 'test.creds', {
      type: 'text/plain',
    });

    const input = screen.getByRole('textbox', { hidden: true }) ||
                  screen.getByLabelText(/credential/i);

    fireEvent.change(input, { target: { files: [file] } });

    // Note: Actual parsing would be mocked
  });

  it('should disable input when disabled prop is true', () => {
    render(
      <CredentialUpload
        onCredentialLoaded={vi.fn()}
        onError={vi.fn()}
        disabled
      />
    );

    const input = screen.getByRole('button') || screen.getByLabelText(/credential/i);
    expect(input).toBeDisabled();
  });
});
```

## Hook Tests

### Setting Up Test Providers

Create a wrapper for hooks that need context:

```tsx
// tests/helpers/testProviders.tsx
import { ReactNode } from 'react';
import { AuthContextProvider } from '@/contexts/AuthContext';
import { EventContextProvider } from '@/contexts/EventContext';
import { ThemeContextProvider } from '@/contexts/ThemeContext';

export function AllProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeContextProvider>
      <AuthContextProvider>
        <EventContextProvider>
          {children}
        </EventContextProvider>
      </AuthContextProvider>
    </ThemeContextProvider>
  );
}

export function renderWithProviders(ui: ReactNode) {
  return render(ui, { wrapper: AllProviders });
}
```

### Testing useAuth Hook

```tsx
// tests/hooks/useAuth.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { AllProviders } from '../helpers/testProviders';

// Mock the NATS service
vi.mock('@/services/nats/connection', () => ({
  getNatsService: () => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(false),
  }),
}));

// Mock credential storage
vi.mock('@/services/credentials/storage', () => ({
  getCredentialStorage: () => ({
    storeCredential: vi.fn().mockResolvedValue(undefined),
    retrieveCredential: vi.fn().mockResolvedValue(null),
    hasStoredCredential: vi.fn().mockResolvedValue(false),
    clearCredential: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllProviders,
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.credential).toBeNull();
    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('should set isLoading during authentication', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllProviders,
    });

    const mockFile = new File(['content'], 'test.creds');

    // Start authentication (don't await yet)
    act(() => {
      result.current.authenticateWithFile(mockFile, 'ws://localhost:4222');
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);
  });

  it('should disconnect and clear credentials', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllProviders,
    });

    await act(async () => {
      await result.current.disconnect(true);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.credential).toBeNull();
  });
});
```

### Testing useCommand Hook

```tsx
// tests/hooks/useCommand.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCommand } from '@/hooks/useCommand';
import { AllProviders } from '../helpers/testProviders';

// Mock command service
const mockUpdateProfile = vi.fn();
vi.mock('@/services/nats/commands', () => ({
  getCommandService: () => ({
    updateProfile: mockUpdateProfile,
    isOnline: vi.fn().mockReturnValue(true),
  }),
  validateUpdateProfilePayload: vi.fn().mockReturnValue({ valid: true }),
  validateNotificationId: vi.fn().mockReturnValue({ valid: true }),
}));

describe('useCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({
      commandId: 'cmd-1',
      success: true,
      data: { id: 'user-1', name: 'New Name' },
      timestamp: Date.now(),
    });
  });

  it('should execute command and return success', async () => {
    const { result } = renderHook(() => useCommand(), {
      wrapper: AllProviders,
    });

    let commandResult;
    await act(async () => {
      commandResult = await result.current.execute('user.updateProfile', { name: 'New Name' });
    });

    expect(commandResult.success).toBe(true);
    expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'New Name' });
  });

  it('should set isExecuting during execution', async () => {
    const { result } = renderHook(() => useCommand(), {
      wrapper: AllProviders,
    });

    // Delay the mock to observe isExecuting
    mockUpdateProfile.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    act(() => {
      result.current.execute('user.updateProfile', { name: 'Test' });
    });

    expect(result.current.isExecuting).toBe(true);

    await waitFor(() => {
      expect(result.current.isExecuting).toBe(false);
    });
  });

  it('should set error on command failure', async () => {
    mockUpdateProfile.mockResolvedValue({
      commandId: 'cmd-1',
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'Name too short' },
      timestamp: Date.now(),
    });

    const { result } = renderHook(() => useCommand(), {
      wrapper: AllProviders,
    });

    await act(async () => {
      await result.current.execute('user.updateProfile', { name: '' });
    });

    expect(result.current.error).toBe('Name too short');
  });

  it('should clear error with clearError', async () => {
    mockUpdateProfile.mockResolvedValue({
      commandId: 'cmd-1',
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'Error' },
      timestamp: Date.now(),
    });

    const { result } = renderHook(() => useCommand(), {
      wrapper: AllProviders,
    });

    await act(async () => {
      await result.current.execute('user.updateProfile', { name: '' });
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
```

## Integration Tests

### Testing Full Authentication Flow

```tsx
// tests/integration/auth-flow.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { App } from '@/App';

// Mock NATS at a higher level for integration tests
vi.mock('@/services/nats/connection', () => {
  let connected = false;

  return {
    getNatsService: () => ({
      connect: vi.fn().mockImplementation(async () => {
        connected = true;
      }),
      disconnect: vi.fn().mockImplementation(async () => {
        connected = false;
      }),
      isConnected: vi.fn().mockImplementation(() => connected),
      status: connected ? 'connected' : 'disconnected',
      onEvent: vi.fn().mockReturnValue(() => {}),
      connection: null,
    }),
  };
});

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect to dashboard after successful login', async () => {
    render(
      <MemoryRouter initialEntries={['/auth']}>
        <App />
      </MemoryRouter>
    );

    // Should show login page
    expect(screen.getByText(/login/i)).toBeInTheDocument();

    // Simulate file selection and login
    // (implementation depends on your component structure)

    // After successful auth, should redirect
    await waitFor(() => {
      expect(screen.queryByText(/login/i)).not.toBeInTheDocument();
    });
  });

  it('should redirect to login when accessing protected route unauthenticated', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Should redirect to login
    await waitFor(() => {
      expect(screen.getByText(/login/i)).toBeInTheDocument();
    });
  });
});
```

### Mocking NatsService

Create a comprehensive mock for integration tests:

```typescript
// tests/mocks/natsService.ts
import { vi } from 'vitest';
import type { ConnectionStatus } from '@/types';

export function createMockNatsService() {
  let status: ConnectionStatus = 'disconnected';
  const eventHandlers: Array<(event: unknown) => void> = [];

  return {
    connect: vi.fn().mockImplementation(async () => {
      status = 'connected';
      eventHandlers.forEach(h => h({ type: 'connected' }));
    }),

    disconnect: vi.fn().mockImplementation(async () => {
      status = 'disconnected';
      eventHandlers.forEach(h => h({ type: 'disconnected' }));
    }),

    isConnected: vi.fn().mockImplementation(() => status === 'connected'),

    get status() {
      return status;
    },

    onEvent: vi.fn().mockImplementation((handler) => {
      eventHandlers.push(handler);
      return () => {
        const index = eventHandlers.indexOf(handler);
        if (index > -1) eventHandlers.splice(index, 1);
      };
    }),

    // Simulate events for tests
    simulateEvent: (event: unknown) => {
      eventHandlers.forEach(h => h(event));
    },

    simulateDisconnect: () => {
      status = 'reconnecting';
      eventHandlers.forEach(h => h({ type: 'reconnecting', reconnectAttempt: 1 }));
    },
  };
}
```

## Test Utilities

### Custom Matchers

```typescript
// tests/helpers/matchers.ts
import { expect } from 'vitest';

expect.extend({
  toBeValidCredential(received) {
    const pass =
      received &&
      typeof received.id === 'string' &&
      typeof received.authType === 'string' &&
      typeof received.loadedAt === 'number';

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid credential`
          : `Expected ${received} to be a valid credential`,
    };
  },
});

// Usage
expect(credential).toBeValidCredential();
```

### Test Data Factories

```typescript
// tests/helpers/factories.ts
import type { User, Session, Notification } from '@/types/events';

export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'user-' + Math.random().toString(36).slice(2),
    email: 'test@example.com',
    name: 'Test User',
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createTestNotification(overrides?: Partial<Notification>): Notification {
  return {
    id: 'notif-' + Math.random().toString(36).slice(2),
    userId: 'user-1',
    type: 'info',
    title: 'Test Notification',
    message: 'This is a test',
    read: false,
    dismissed: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

export function createTestSession(overrides?: Partial<Session>): Session {
  const now = Date.now();
  return {
    id: 'session-' + Math.random().toString(36).slice(2),
    userId: 'user-1',
    createdAt: now,
    expiresAt: now + 3600000, // 1 hour
    lastActivityAt: now,
    ...overrides,
  };
}
```

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- tests/hooks/useAuth.test.tsx

# Run tests matching pattern
npm run test -- --grep "useAuth"
```

## Test Coverage Goals

| Category | Target | Priority |
|----------|--------|----------|
| Reducer | 100% | High |
| Utilities | 90%+ | High |
| Hooks | 80%+ | Medium |
| Components | 70%+ | Medium |
| Integration | Key flows | High |

## Related Documentation

- [Project Structure](../project-structure.md) - Test file organization
- [Quick Reference](../quick-reference.md) - API documentation
- [Error Handling](./error-handling.md) - Testing error scenarios

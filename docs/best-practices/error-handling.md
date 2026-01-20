# Error Handling Best Practices

This guide covers error handling patterns for NATS-native web applications.

## Connection Errors

### Error Codes

The template defines these connection error codes:

| Code | Description | Recoverable |
|------|-------------|-------------|
| `INVALID_CREDENTIAL` | Credential file format error | No |
| `AUTH_FAILED` | Server rejected authentication | No |
| `CONNECTION_REFUSED` | Server unreachable | Maybe |
| `CONNECTION_TIMEOUT` | Connection timed out | Yes |
| `PERMISSION_DENIED` | User lacks permissions | No |
| `SERVER_ERROR` | NATS server error | Maybe |
| `UNKNOWN` | Unexpected error | Unknown |

### Handling Connection Errors

```tsx
import { useAuth } from '@/hooks/useAuth';

function LoginPage() {
  const { authenticateWithFile, connectionError, isLoading } = useAuth();

  const handleLogin = async (file: File) => {
    const success = await authenticateWithFile(file, serverUrl);

    if (!success && connectionError) {
      switch (connectionError.code) {
        case 'INVALID_CREDENTIAL':
          showError('Invalid credential file. Please check the file format.');
          break;
        case 'AUTH_FAILED':
          showError('Authentication failed. Please check your credentials.');
          break;
        case 'CONNECTION_REFUSED':
          showError('Cannot connect to server. Please try again later.');
          break;
        case 'CONNECTION_TIMEOUT':
          showError('Connection timed out. Please check your network.');
          break;
        case 'PERMISSION_DENIED':
          showError('Access denied. Contact your administrator.');
          break;
        default:
          showError(connectionError.userMessage);
      }
    }
  };

  return (
    <form>
      {connectionError && (
        <Alert variant="error">
          {connectionError.userMessage}
        </Alert>
      )}
      <FileInput onChange={(f) => handleLogin(f)} disabled={isLoading} />
    </form>
  );
}
```

### Auto-Recovery for Recoverable Errors

```tsx
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

function ConnectionMonitor() {
  const { connectionStatus, connectionError, authenticateWithStoredCredentials } = useAuth();

  useEffect(() => {
    // Attempt reconnection for recoverable errors
    if (connectionError?.recoverable && connectionStatus === 'failed') {
      const timeout = setTimeout(async () => {
        await authenticateWithStoredCredentials();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [connectionError, connectionStatus]);

  return null;
}
```

## Command Errors

### Error Codes

Command errors use these codes:

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_PAYLOAD` | Request data validation failed | Fix input |
| `NOT_FOUND` | Resource doesn't exist | Show message |
| `PERMISSION_DENIED` | Not authorized | Show message |
| `CONFLICT` | Concurrent modification | Refresh & retry |
| `INTERNAL_ERROR` | Server error | Retry later |

### Handling Command Errors

```tsx
import { useCommand } from '@/hooks/useCommand';

function ProfileEditor() {
  const { execute, error, clearError, isExecuting } = useCommand();

  const handleSave = async (data: { name: string }) => {
    const result = await execute('user.updateProfile', data);

    if (!result.success) {
      switch (result.error.code) {
        case 'INVALID_PAYLOAD':
          // Highlight invalid fields
          setFieldError('name', result.error.message);
          break;
        case 'CONFLICT':
          // State was modified elsewhere
          await refreshState();
          showInfo('Data was updated. Please review and try again.');
          break;
        case 'PERMISSION_DENIED':
          showError('You do not have permission to update your profile.');
          break;
        default:
          showError('Failed to save. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(formData); }}>
      {error && (
        <Alert variant="error" onDismiss={clearError}>
          {error}
        </Alert>
      )}
      <input name="name" />
      <button disabled={isExecuting}>
        {isExecuting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Command Result Type Checking

```typescript
import { isCommandSuccess, isCommandFailure } from '@/types/commands';

async function executeWithHandling() {
  const result = await execute('user.updateProfile', { name: 'New Name' });

  if (isCommandSuccess(result)) {
    // TypeScript knows result.data exists
    console.log('Updated at:', result.timestamp);
    return result.data;
  }

  if (isCommandFailure(result)) {
    // TypeScript knows result.error exists
    console.error('Error:', result.error.code, result.error.message);
    throw new Error(result.error.message);
  }
}
```

## User Feedback Patterns

### Toast Notifications

For transient feedback that doesn't block the UI:

```tsx
import { useCommand } from '@/hooks/useCommand';
import { toast } from 'your-toast-library';

function NotificationActions({ notificationId }: { notificationId: string }) {
  const { execute } = useCommand();

  const handleDismiss = async () => {
    const result = await execute('notification.dismiss', { notificationId });

    if (result.success) {
      toast.success('Notification dismissed');
    } else {
      toast.error('Failed to dismiss notification');
    }
  };

  return <button onClick={handleDismiss}>Dismiss</button>;
}
```

### Inline Errors

For errors related to specific form fields:

```tsx
import { useState } from 'react';
import { useCommand } from '@/hooks/useCommand';

function ProfileForm() {
  const { execute, isExecuting } = useCommand();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    const result = await execute('user.updateProfile', { name });

    if (!result.success) {
      if (result.error.code === 'INVALID_PAYLOAD' && result.error.details) {
        // Server returned field-specific errors
        setFieldErrors(result.error.details as Record<string, string>);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input name="name" />
        {fieldErrors.name && (
          <span className="text-red-500">{fieldErrors.name}</span>
        )}
      </div>
      <button disabled={isExecuting}>Save</button>
    </form>
  );
}
```

### Modal Dialogs

For critical errors requiring acknowledgment:

```tsx
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

function App() {
  const { connectionError } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Show modal for non-recoverable errors
  const showModal = connectionError &&
    !connectionError.recoverable &&
    !dismissed;

  return (
    <>
      <MainContent />
      {showModal && (
        <Modal onClose={() => setDismissed(true)}>
          <h2>Connection Error</h2>
          <p>{connectionError.userMessage}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </Modal>
      )}
    </>
  );
}
```

## Retry Strategies

### Recoverable vs Non-Recoverable

| Category | Examples | Strategy |
|----------|----------|----------|
| **Recoverable** | Timeout, network hiccup | Auto-retry with backoff |
| **Non-recoverable** | Invalid credentials, permission denied | User action required |

### Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-recoverable errors
      if (!isRecoverableError(error)) {
        throw error;
      }

      // Wait with exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

function isRecoverableError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'recoverable' in error) {
    return (error as { recoverable: boolean }).recoverable;
  }
  return false;
}
```

### Retry Button Pattern

```tsx
import { useState } from 'react';

function DataLoader() {
  const { refreshState } = useAppState();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setError(null);

    try {
      await refreshState();
    } catch (e) {
      setError('Failed to load data. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button onClick={handleRetry} disabled={retrying}>
          {retrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  return <DataDisplay />;
}
```

## Logging Best Practices

### Safe Logging

Log errors for debugging without exposing sensitive data:

```typescript
function logError(context: string, error: unknown) {
  // Structured logging
  const logEntry = {
    context,
    timestamp: new Date().toISOString(),
    error: sanitizeError(error),
  };

  console.error('[Error]', logEntry);

  // Send to error tracking service (if configured)
  if (import.meta.env.PROD) {
    errorTracker.capture(logEntry);
  }
}

function sanitizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Don't include stack in production
      ...(import.meta.env.DEV && { stack: error.stack }),
    };
  }

  if (typeof error === 'object' && error !== null) {
    const { seed, password, jwt, ...safe } = error as Record<string, unknown>;
    return safe;
  }

  return { value: String(error) };
}
```

### Error Boundaries

Catch React rendering errors:

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError('ErrorBoundary', { error, componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <MainContent />
    </ErrorBoundary>
  );
}
```

## Connection State UI

### Status Indicators

```tsx
import { useNatsConnection } from '@/hooks/useNatsConnection';

function ConnectionStatus() {
  const { status, error, reconnectAttempt } = useNatsConnection();

  switch (status) {
    case 'connected':
      return <Badge color="green">Connected</Badge>;
    case 'connecting':
      return <Badge color="yellow">Connecting...</Badge>;
    case 'reconnecting':
      return (
        <Badge color="yellow">
          Reconnecting (attempt {reconnectAttempt})...
        </Badge>
      );
    case 'failed':
      return (
        <Badge color="red" title={error?.message}>
          Connection Failed
        </Badge>
      );
    case 'disconnected':
    default:
      return <Badge color="gray">Disconnected</Badge>;
  }
}
```

### Offline Banner

```tsx
import { useAppState } from '@/hooks/useAppState';

function OfflineBanner() {
  const { syncStatus, isStale, refreshState } = useAppState();

  if (syncStatus === 'offline') {
    return (
      <Banner variant="warning">
        You're offline. Some features may be unavailable.
      </Banner>
    );
  }

  if (isStale) {
    return (
      <Banner variant="info">
        Data may be outdated.
        <button onClick={refreshState}>Refresh</button>
      </Banner>
    );
  }

  return null;
}
```

## Error Handling Checklist

- [ ] All async operations wrapped in try/catch
- [ ] Connection errors displayed with user-friendly messages
- [ ] Command errors handled per error code
- [ ] Recoverable errors trigger automatic retry
- [ ] Non-recoverable errors require user action
- [ ] Error boundaries catch React errors
- [ ] Sensitive data not logged
- [ ] Offline state handled gracefully
- [ ] Stale data indicated to users

## Related Documentation

- [Security](./security.md) - Error message safety
- [State Management](./state-management.md) - Handling offline state
- [Troubleshooting](../troubleshooting.md) - Common errors
- [Quick Reference](../quick-reference.md) - Error types

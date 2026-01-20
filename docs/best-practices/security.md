# Security Best Practices

This guide covers security considerations when building NATS-native web applications.

## Credential Handling

### Never Log Credentials

NKey seeds and passwords are sensitive. Never log them, even in development:

```typescript
// DON'T DO THIS
console.log('Credential:', credential);
console.log('Seed:', credential.seed);
console.log('Password:', credential.password);

// DO THIS INSTEAD
console.log('Credential loaded:', credential.id, credential.authType);
console.log('Auth type:', credential.authType);
```

### Secure Storage

The template encrypts credentials in IndexedDB:

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2 (100,000 iterations) |
| Salt | Random per credential |
| IV | Random per encryption |

**Never store credentials in:**
- localStorage (no encryption, synchronous access)
- sessionStorage (same issues)
- Cookies (sent with every request)
- Global variables (accessible via console)

### Clear on Logout

Always clear credentials when users log out:

```typescript
const { disconnect } = useAuth();

const handleLogout = async () => {
  // true = clear stored credentials
  await disconnect(true);
};
```

### Memory Handling

For highly sensitive applications, consider clearing credential data after use:

```typescript
// After authentication is complete
if (credential.authType === 'credsfile') {
  // Zero out the seed array
  credential.seed.fill(0);
}
```

## Encrypted Connections

### Always Use WSS in Production

WebSocket connections must use TLS (`wss://`) in production:

```bash
# Development (local only)
VITE_NATS_URL=ws://localhost:4222

# Production (REQUIRED)
VITE_NATS_URL=wss://nats.example.com:443
```

**Why?**
- `ws://` transmits data in plaintext
- Authentication tokens and user data are exposed
- MITM attacks can intercept/modify messages

### Verify Connection URL

Before connecting, validate the URL uses the correct protocol:

```typescript
function validateServerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // In production, enforce wss://
    if (import.meta.env.PROD && parsed.protocol !== 'wss:') {
      console.warn('WSS required in production');
      return false;
    }

    // In development, allow ws:// for localhost only
    if (parsed.protocol === 'ws:' && parsed.hostname !== 'localhost') {
      console.warn('WS only allowed for localhost');
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

## Content Security Policy

Configure CSP headers to prevent XSS attacks:

### Recommended CSP

```
Content-Security-Policy:
  default-src 'self';
  connect-src 'self' wss://nats.example.com;
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
```

**Key Directives:**

| Directive | Purpose | Recommendation |
|-----------|---------|----------------|
| `default-src` | Fallback for other directives | `'self'` |
| `connect-src` | WebSocket, fetch, XHR | `'self' wss://your-nats-server` |
| `script-src` | JavaScript sources | `'self'` (avoid `'unsafe-inline'`) |
| `style-src` | CSS sources | `'self'` (Tailwind may need `'unsafe-inline'`) |

### Vite Configuration

Add CSP via server config for development:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' ws://localhost:4222;",
    },
  },
});
```

For production, configure CSP in your web server (nginx, Apache) or CDN.

## Input Sanitization

### NATS Subjects

Sanitize user input used in NATS subjects to prevent injection:

```typescript
function sanitizeSubjectToken(input: string): string {
  // Remove characters that have special meaning in NATS subjects
  // Allowed: alphanumeric, hyphen, underscore
  return input.replace(/[^a-zA-Z0-9_-]/g, '');
}

// Usage
const userInput = 'my-topic.*.>';  // Potentially malicious
const safe = sanitizeSubjectToken(userInput);  // 'my-topic'

const subject = `app.user.${safe}.events`;  // Safe to use
```

**Dangerous Characters:**
- `.` - Subject delimiter (can change hierarchy)
- `*` - Single-token wildcard
- `>` - Multi-token wildcard
- Whitespace - Invalid in subjects

### Validate Before Publishing

```typescript
function validatePayload<T>(payload: T, schema: ZodSchema<T>): Result<T> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result.data };
}

// Example with Zod
const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
});

const handleUpdate = async (input: unknown) => {
  const validation = validatePayload(input, UpdateProfileSchema);
  if (!validation.ok) {
    throw new Error('Invalid payload');
  }
  await execute('user.updateProfile', validation.data);
};
```

## Error Message Safety

### Avoid Leaking Sensitive Information

Error messages shown to users should not expose:
- Internal server details
- Infrastructure information
- Credential data
- Stack traces

```typescript
// DON'T DO THIS
catch (error) {
  setError(`Auth failed: ${error.message}`);
  // Might expose: "Invalid JWT signature for account A123..."
}

// DO THIS INSTEAD
catch (error) {
  // Log detailed error for debugging
  console.error('Auth error:', error);

  // Show user-friendly message
  setError(getConnectionError(error).userMessage);
}
```

### Use Error Codes

The template provides structured errors with user-safe messages:

```typescript
interface ConnectionError {
  code: ConnectionErrorCode;      // Machine-readable
  message: string;                // Technical (for logs)
  userMessage: string;            // Safe for UI
  recoverable: boolean;
}

// Usage
if (connectionError) {
  // For UI
  showAlert(connectionError.userMessage);

  // For logging (not shown to user)
  logger.error({
    code: connectionError.code,
    message: connectionError.message,
  });
}
```

## Authentication Security

### Rate Limiting

Implement rate limiting for authentication attempts:

```typescript
const AUTH_ATTEMPTS_KEY = 'auth_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(): boolean {
  const data = localStorage.getItem(AUTH_ATTEMPTS_KEY);
  if (!data) return true;

  const { attempts, lockedUntil } = JSON.parse(data);

  if (lockedUntil && Date.now() < lockedUntil) {
    return false; // Still locked out
  }

  if (attempts >= MAX_ATTEMPTS) {
    // Set lockout
    localStorage.setItem(AUTH_ATTEMPTS_KEY, JSON.stringify({
      attempts: 0,
      lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
    }));
    return false;
  }

  return true;
}

function recordAuthAttempt(success: boolean) {
  if (success) {
    localStorage.removeItem(AUTH_ATTEMPTS_KEY);
    return;
  }

  const data = localStorage.getItem(AUTH_ATTEMPTS_KEY);
  const current = data ? JSON.parse(data) : { attempts: 0 };

  localStorage.setItem(AUTH_ATTEMPTS_KEY, JSON.stringify({
    ...current,
    attempts: current.attempts + 1,
  }));
}
```

### Session Timeout

Monitor for session expiration:

```typescript
import { useEventSubscription } from '@/hooks/useEventSubscription';
import { useAuth } from '@/hooks/useAuth';

function SessionMonitor() {
  const { disconnect } = useAuth();

  useEventSubscription('session.expired', async (event) => {
    if (event.payload.reason === 'revoked') {
      // Admin-initiated logout
      await disconnect(true);
      showAlert('Your session was terminated');
    }
  });

  return null;
}
```

## Network Security

### Timeout Configuration

Set reasonable timeouts to prevent hanging:

```typescript
const NATS_DEFAULTS = {
  COMMAND_TIMEOUT_MS: 3000,      // 3 seconds for commands
  STATE_FETCH_TIMEOUT_MS: 5000,  // 5 seconds for initial load
  RECONNECT_TIMEOUT_MS: 10000,   // 10 seconds before showing error
};
```

### Reconnection Limits

Limit reconnection attempts to prevent infinite loops:

```typescript
const connectionOptions = {
  reconnect: true,
  maxReconnectAttempts: 10,
  reconnectTimeWait: 2000,  // Start with 2 seconds
  // Increases with exponential backoff
};
```

## Cross-Tab Security

### Same-Origin Only

BroadcastChannel only works same-origin, but verify intent:

```typescript
function handleSyncMessage(message: TabSyncMessage) {
  // Validate message structure
  if (!isValidSyncMessage(message)) {
    console.warn('Invalid sync message received');
    return;
  }

  // Process message
  switch (message.type) {
    case 'CREDENTIAL_CLEARED':
      // User logged out in another tab
      clearCredential();
      break;
    // ...
  }
}
```

## Security Checklist

Before deploying to production:

- [ ] Using `wss://` for NATS connection
- [ ] CSP headers configured
- [ ] No credentials logged anywhere
- [ ] Error messages don't leak sensitive data
- [ ] User input sanitized before use in subjects
- [ ] Rate limiting on authentication
- [ ] Session timeout handling
- [ ] Reconnection limits configured
- [ ] IndexedDB encryption verified

## Related Documentation

- [Authentication](../concepts/authentication.md) - How credentials work
- [Error Handling](./error-handling.md) - Handling errors safely
- [Troubleshooting](../troubleshooting.md) - Common security issues

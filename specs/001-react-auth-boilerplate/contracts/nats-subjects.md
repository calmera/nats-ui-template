# NATS Subject Patterns

**Date**: 2026-01-12 | **Branch**: `001-react-auth-boilerplate`

## Overview

This document defines NATS subject naming conventions and patterns for the React authentication boilerplate. Since authentication happens at the NATS connection level (not via subject messaging), this primarily documents patterns for extending the boilerplate.

---

## Connection-Level Authentication

Authentication in this boilerplate is handled at the **NATS connection level**, not via subject messaging:

```typescript
// Authentication flow
const nc = await wsconnect({
  servers: serverUrl,
  authenticator: credsAuthenticator(credentialBytes),
});
```

The NATS server validates credentials during the WebSocket handshake using:
1. **JWT validation** - Server verifies the user JWT
2. **Nonce signing** - Client signs server nonce with NKey seed
3. **Signature verification** - Server verifies signature matches JWT public key

No custom subjects are used for authentication.

---

## Subject Naming Conventions

For extending the boilerplate with application-specific features, follow these conventions:

### Pattern Structure

```
<domain>.<entity>.<action>
<domain>.<entity>.<id>.<action>
```

### Reserved Prefixes

| Prefix | Purpose | Example |
|--------|---------|---------|
| `$SYS` | NATS system subjects | `$SYS.SERVER.PING` |
| `_INBOX` | Reply subjects | `_INBOX.abc123` |

### Application Prefixes

| Prefix | Purpose | Example |
|--------|---------|---------|
| `app` | Application-specific | `app.users.list` |
| `events` | Event notifications | `events.user.connected` |
| `status` | Status updates | `status.connection.changed` |

---

## Example Subject Patterns

### User Presence (Optional Feature)

```
# Announce user connection
events.user.connected
  Payload: { userId: string, timestamp: number }

# Announce user disconnection
events.user.disconnected
  Payload: { userId: string, timestamp: number }

# Request current connected users
app.users.list
  Request: {}
  Response: { users: string[] }
```

### Real-Time Updates (Optional Feature)

```
# Subscribe to updates for a specific resource
app.resource.<resourceId>.updates
  Payload: { type: "created" | "updated" | "deleted", data: any }

# Broadcast update to all subscribers
events.resource.changed
  Payload: { resourceId: string, changeType: string }
```

### Request-Reply Pattern

```
# Ping/health check
app.health.ping
  Request: {}
  Response: { status: "ok", timestamp: number }

# Get server info
app.info.get
  Request: {}
  Response: { version: string, features: string[] }
```

---

## Boilerplate Default Subjects

The authentication boilerplate does not define any mandatory subjects. All communication happens via:

1. **Connection events** - Handled by `@nats-io/nats-core` status iterator
2. **Browser tab sync** - Handled by BroadcastChannel API (not NATS)

### Optional Demo Subjects

For demonstration purposes, the boilerplate may include:

```typescript
// Example: Publish connection status (optional)
const publishConnectionStatus = async (nc: NatsConnection, status: string) => {
  const data = JSON.stringify({
    status,
    timestamp: Date.now(),
    tabId: tabId,
  });
  nc.publish("demo.connection.status", new TextEncoder().encode(data));
};

// Example: Subscribe to demo messages (optional)
const subscription = nc.subscribe("demo.messages.>");
for await (const msg of subscription) {
  console.log("Received:", new TextDecoder().decode(msg.data));
}
```

---

## Permission Considerations

When extending the boilerplate, consider NATS permissions in the credential JWT:

```json
{
  "pub": {
    "allow": ["app.>", "events.>"],
    "deny": ["$SYS.>"]
  },
  "sub": {
    "allow": ["app.>", "events.>", "_INBOX.>"],
    "deny": ["$SYS.>"]
  }
}
```

The boilerplate handles permission errors gracefully:
- `PERMISSION_DENIED` errors displayed with user-friendly message
- Failed publishes/subscribes logged but don't crash the app

---

## Error Handling Subjects

The boilerplate does not use error-specific subjects. Errors are:

1. **Connection errors** - Caught via try/catch on `wsconnect()`
2. **Runtime errors** - Caught via `nc.status()` event iterator
3. **Permission errors** - Caught and mapped to user-friendly messages

```typescript
// Error handling pattern
try {
  await nc.publish(subject, data);
} catch (err) {
  if (err.code === ErrorCode.PermissionViolation) {
    // Handle permission error
    displayError({
      code: "PERMISSION_DENIED",
      userMessage: "You don't have permission for this action.",
    });
  }
}
```

---

## Subject Security Guidelines

1. **Never include credentials in subjects** - Subject names are visible in logs
2. **Use hierarchical subjects** - Enables wildcard subscriptions for monitoring
3. **Validate payloads** - Never trust message content from subscriptions
4. **Rate limit publishes** - Prevent flooding from compromised clients
5. **Use request-reply timeouts** - Always set timeouts for request patterns

---

## Extending the Boilerplate

When adding application-specific NATS communication:

1. Define subjects in a central constants file
2. Create typed message interfaces
3. Use codec helpers for encoding/decoding
4. Handle errors at the service layer
5. Document all subjects in this file

```typescript
// Example: Subject constants
export const SUBJECTS = {
  DEMO: {
    MESSAGES: "demo.messages",
    STATUS: "demo.connection.status",
  },
  APP: {
    HEALTH: "app.health.ping",
  },
} as const;

// Example: Typed message
interface DemoMessage {
  content: string;
  sender: string;
  timestamp: number;
}
```

# NATS Subject Contracts

**Feature**: 002-event-driven-state
**Date**: 2026-01-19

This document defines the NATS subject naming conventions and message contracts for the event-driven state management system.

---

## Subject Naming Convention

All subjects follow the pattern: `{namespace}.{category}.{domain}.{action}`

- **namespace**: Configurable prefix (default: `app`), allows multiple UI instances on same NATS server
- **category**: Either `events`, `commands`, or `state`
- **domain**: Entity domain (e.g., `user`, `session`, `notification`)
- **action**: Specific action (e.g., `updated`, `created`, `get`)

---

## Configuration

```typescript
interface NatsSubjectConfig {
  namespace: string;  // Default: 'app'
}

// Subject builders
const subjects = {
  events: {
    all: (ns: string) => `${ns}.events.>`,
    user: {
      updated: (ns: string) => `${ns}.events.user.updated`,
    },
    session: {
      created: (ns: string) => `${ns}.events.session.created`,
      expired: (ns: string) => `${ns}.events.session.expired`,
    },
    notification: {
      received: (ns: string) => `${ns}.events.notification.received`,
    },
  },
  commands: {
    user: {
      updateProfile: (ns: string) => `${ns}.commands.user.updateProfile`,
    },
    notification: {
      dismiss: (ns: string) => `${ns}.commands.notification.dismiss`,
      markRead: (ns: string) => `${ns}.commands.notification.markRead`,
      markAllRead: (ns: string) => `${ns}.commands.notification.markAllRead`,
    },
  },
  state: {
    get: (ns: string) => `${ns}.state.get`,
  },
};
```

---

## Event Subjects

### `{namespace}.events.>`

**Purpose**: Wildcard subscription for all events
**Direction**: Server → Client (pub/sub)
**Usage**: Client subscribes once after authentication to receive all domain events

---

### `{namespace}.events.user.updated`

**Purpose**: Notify that user profile was modified
**Direction**: Server → Client (pub/sub)

**Payload**:
```typescript
interface UserUpdatedEvent {
  type: 'user.updated';
  timestamp: number;
  correlationId?: string;
  payload: {
    id: string;
    changes: {
      name?: string;
      email?: string;
      avatarUrl?: string;
      updatedAt: number;
    };
  };
}
```

**Example**:
```json
{
  "type": "user.updated",
  "timestamp": 1737331200000,
  "correlationId": "cmd-123e4567-e89b-12d3",
  "payload": {
    "id": "usr-456",
    "changes": {
      "name": "Jane Doe",
      "updatedAt": 1737331200000
    }
  }
}
```

---

### `{namespace}.events.session.created`

**Purpose**: Notify that a new session was established
**Direction**: Server → Client (pub/sub)

**Payload**:
```typescript
interface SessionCreatedEvent {
  type: 'session.created';
  timestamp: number;
  payload: {
    id: string;
    userId: string;
    createdAt: number;
    expiresAt: number;
    lastActivityAt: number;
    deviceInfo?: string;
  };
}
```

**Example**:
```json
{
  "type": "session.created",
  "timestamp": 1737331200000,
  "payload": {
    "id": "sess-789",
    "userId": "usr-456",
    "createdAt": 1737331200000,
    "expiresAt": 1737417600000,
    "lastActivityAt": 1737331200000,
    "deviceInfo": "Chrome 120 on macOS"
  }
}
```

---

### `{namespace}.events.session.expired`

**Purpose**: Notify that a session has expired or was terminated
**Direction**: Server → Client (pub/sub)

**Payload**:
```typescript
interface SessionExpiredEvent {
  type: 'session.expired';
  timestamp: number;
  payload: {
    sessionId: string;
    reason: 'timeout' | 'logout' | 'revoked';
  };
}
```

**Example**:
```json
{
  "type": "session.expired",
  "timestamp": 1737331200000,
  "payload": {
    "sessionId": "sess-789",
    "reason": "timeout"
  }
}
```

---

### `{namespace}.events.notification.received`

**Purpose**: Notify that a new notification was created
**Direction**: Server → Client (pub/sub)

**Payload**:
```typescript
interface NotificationReceivedEvent {
  type: 'notification.received';
  timestamp: number;
  payload: {
    id: string;
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    dismissed: boolean;
    createdAt: number;
    metadata?: Record<string, unknown>;
  };
}
```

**Example**:
```json
{
  "type": "notification.received",
  "timestamp": 1737331200000,
  "payload": {
    "id": "notif-abc",
    "userId": "usr-456",
    "type": "info",
    "title": "Welcome",
    "message": "Welcome to the application!",
    "read": false,
    "dismissed": false,
    "createdAt": 1737331200000
  }
}
```

---

## Command Subjects

All commands use NATS request/reply pattern with a timeout.

### `{namespace}.commands.user.updateProfile`

**Purpose**: Update the current user's profile
**Direction**: Client → Server (request/reply)
**Timeout**: 10 seconds

**Request**:
```typescript
interface UpdateProfileCommand {
  id: string;        // Command correlation ID
  type: 'user.updateProfile';
  timestamp: number;
  payload: {
    name?: string;
    avatarUrl?: string;
  };
}
```

**Success Response**:
```typescript
interface UpdateProfileResult {
  commandId: string;
  success: true;
  data: {
    user: User;
  };
  timestamp: number;
}
```

**Error Response**:
```typescript
interface UpdateProfileError {
  commandId: string;
  success: false;
  error: {
    code: 'INVALID_PAYLOAD' | 'PERMISSION_DENIED' | 'INTERNAL_ERROR';
    message: string;
  };
  timestamp: number;
}
```

---

### `{namespace}.commands.notification.dismiss`

**Purpose**: Dismiss a notification
**Direction**: Client → Server (request/reply)
**Timeout**: 5 seconds

**Request**:
```typescript
interface DismissNotificationCommand {
  id: string;
  type: 'notification.dismiss';
  timestamp: number;
  payload: {
    notificationId: string;
  };
}
```

**Success Response**:
```typescript
interface DismissNotificationResult {
  commandId: string;
  success: true;
  data: {};
  timestamp: number;
}
```

**Error Response**:
```typescript
interface DismissNotificationError {
  commandId: string;
  success: false;
  error: {
    code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'INTERNAL_ERROR';
    message: string;
  };
  timestamp: number;
}
```

---

### `{namespace}.commands.notification.markRead`

**Purpose**: Mark a notification as read
**Direction**: Client → Server (request/reply)
**Timeout**: 5 seconds

**Request**:
```typescript
interface MarkReadCommand {
  id: string;
  type: 'notification.markRead';
  timestamp: number;
  payload: {
    notificationId: string;
  };
}
```

**Success Response**:
```typescript
interface MarkReadResult {
  commandId: string;
  success: true;
  data: {};
  timestamp: number;
}
```

---

### `{namespace}.commands.notification.markAllRead`

**Purpose**: Mark all notifications as read
**Direction**: Client → Server (request/reply)
**Timeout**: 10 seconds

**Request**:
```typescript
interface MarkAllReadCommand {
  id: string;
  type: 'notification.markAllRead';
  timestamp: number;
  payload: {};
}
```

**Success Response**:
```typescript
interface MarkAllReadResult {
  commandId: string;
  success: true;
  data: {
    count: number;  // Number of notifications marked as read
  };
  timestamp: number;
}
```

---

## State Subjects

### `{namespace}.state.get`

**Purpose**: Retrieve current state snapshot for the authenticated user
**Direction**: Client → Server (request/reply)
**Timeout**: 10 seconds
**Usage**: Called on initial load and after reconnection

**Request**:
```typescript
interface GetStateRequest {
  // Empty object - authentication determines user
}
```

**Success Response**:
```typescript
interface GetStateResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    updatedAt: number;
  };
  sessions: Array<{
    id: string;
    userId: string;
    createdAt: number;
    expiresAt: number;
    lastActivityAt: number;
    deviceInfo?: string;
  }>;
  notifications: Array<{
    id: string;
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    dismissed: boolean;
    createdAt: number;
    metadata?: Record<string, unknown>;
  }>;
  serverTime: number;
}
```

**Error Response**:
```typescript
interface GetStateError {
  error: {
    code: 'AUTH_REQUIRED' | 'INTERNAL_ERROR';
    message: string;
  };
}
```

**Example Success Response**:
```json
{
  "user": {
    "id": "usr-456",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "updatedAt": 1737331200000
  },
  "sessions": [
    {
      "id": "sess-789",
      "userId": "usr-456",
      "createdAt": 1737331200000,
      "expiresAt": 1737417600000,
      "lastActivityAt": 1737331200000,
      "deviceInfo": "Chrome 120 on macOS"
    }
  ],
  "notifications": [
    {
      "id": "notif-abc",
      "userId": "usr-456",
      "type": "info",
      "title": "Welcome",
      "message": "Welcome to the application!",
      "read": false,
      "dismissed": false,
      "createdAt": 1737331200000
    }
  ],
  "serverTime": 1737331200000
}
```

---

## Message Encoding

All messages are JSON-encoded using UTF-8. The NATS client handles encoding/decoding:

```typescript
import { JSONCodec } from '@nats-io/nats-core';

const codec = JSONCodec();

// Encoding
const bytes = codec.encode({ type: 'user.updated', ... });

// Decoding
const event = codec.decode(msg.data);

// Or use built-in json() method on messages
const event = msg.json<UserUpdatedEvent>();
```

---

## Error Handling

### NATS-Level Errors

| Status | Meaning |
|--------|---------|
| 503 | No responders - service unavailable |
| 408 | Request timeout |
| 403 | Permission denied - NATS authorization failure |

### Application-Level Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_PAYLOAD` | Request payload failed validation |
| `NOT_FOUND` | Referenced entity does not exist |
| `PERMISSION_DENIED` | User lacks permission for this action |
| `CONFLICT` | Concurrent modification conflict |
| `AUTH_REQUIRED` | Authentication required |
| `INTERNAL_ERROR` | Server-side error |

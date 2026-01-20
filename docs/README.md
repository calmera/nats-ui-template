# NATS UI Template

A production-ready React template for building real-time web applications that communicate exclusively through NATS messaging.

## What is this template?

This template provides a complete foundation for building browser-based applications that use NATS as their sole communication layer. Unlike traditional REST or GraphQL approaches, this template embraces an event-driven architecture where all data flows through NATS publish/subscribe and request/reply patterns.

**Why NATS-native?** By eliminating HTTP APIs in favor of direct NATS connectivity, your application gains true real-time reactivity. State changes propagate instantly to all connected clients without polling or manual refresh. The same messaging patterns work whether you're communicating between browser tabs, microservices, or edge devices.

**What you get:**
- A React application pre-configured for NATS WebSocket connectivity
- Secure credential handling with encrypted browser storage
- Event-driven state management with offline support
- Type-safe patterns for commands and events
- Cross-tab synchronization out of the box

## Key Features

- **Direct NATS WebSocket connectivity** - Connect to any NATS server via WebSocket without intermediate HTTP layers
- **Secure credential handling** - Encrypted IndexedDB storage using AES-256-GCM with device-specific keys
- **Event-driven state management** - State automatically updates in response to NATS events via a reducer pattern
- **Offline support** - Materialized state persisted in IndexedDB, available when disconnected
- **Cross-tab synchronization** - State changes broadcast to all tabs via BroadcastChannel API
- **Type-safe commands and events** - Full TypeScript definitions for all NATS interactions
- **Multiple authentication methods** - Support for credential files (.creds) and username/password

## Target Audience

- **Developers building NATS-native web applications** - Use this template as a starting point for real-time dashboards, monitoring tools, or collaborative applications
- **Teams migrating from REST to event-driven architecture** - Learn patterns for replacing HTTP endpoints with NATS subjects
- **AI agents generating code for NATS-based UIs** - Documentation is structured for AI consumption with complete, runnable examples

## Prerequisites

Before getting started, ensure you have:

- Node.js 20.x or later
- npm 10.x or later
- Git
- Access to a NATS server with WebSocket support

See [Getting Started](./getting-started.md) for detailed setup instructions.

## Documentation Structure

| Document | Description |
|----------|-------------|
| [Getting Started](./getting-started.md) | Prerequisites, installation, and first run |
| [Architecture](./architecture.md) | System components, data flow, and design decisions |
| [Project Structure](./project-structure.md) | Directory layout and file organization |
| [Quick Reference](./quick-reference.md) | API reference for hooks, contexts, and types |
| **Concepts** | |
| [NATS Fundamentals](./concepts/nats-fundamentals.md) | Introduction to NATS messaging patterns |
| [Authentication](./concepts/authentication.md) | Credential types and authentication flows |
| [State Management](./concepts/state-management.md) | Event-driven state and offline support |
| **Best Practices** | |
| [Security](./best-practices/security.md) | Secure credential handling and CSP |
| [Error Handling](./best-practices/error-handling.md) | Connection and command error patterns |
| [State Management](./best-practices/state-management.md) | Optimistic updates and cross-tab sync |
| [Testing](./best-practices/testing.md) | Testing strategies and examples |
| **Guides** | |
| [Troubleshooting](./troubleshooting.md) | Common issues and solutions |
| [Migration Tips](./migration-tips.md) | Adopting NATS patterns incrementally |

## Quick Example

Here's how to authenticate and display user information:

```tsx
import { useAuth } from './hooks/useAuth';
import { useAppState } from './hooks/useAppState';

function App() {
  const { isAuthenticated, authenticateWithFile } = useAuth();
  const { user, isLoading } = useAppState();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await authenticateWithFile(file, import.meta.env.VITE_NATS_URL);
    }
  };

  if (!isAuthenticated) {
    return (
      <div>
        <h1>Login</h1>
        <input type="file" accept=".creds" onChange={handleFileSelect} />
      </div>
    );
  }

  if (isLoading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Connected to: {user.server}</p>
    </div>
  );
}
```

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 19.2.0 |
| Language | TypeScript | 5.9.3 |
| NATS Client | @nats-io/nats-core | 3.3.0 |
| Routing | react-router-dom | 7.12.0 |
| Styling | Tailwind CSS | 4.1.18 |
| Storage | Dexie (IndexedDB) | 4.2.1 |
| Build Tool | Vite | 7.2.4 |
| Testing | Vitest | 4.0.17 |

## License

MIT

# Project Structure

This document describes the directory layout and file organization of the NATS UI Template.

## Directory Overview

```
nats-ui-template/
├── docs/                    # Documentation (you are here)
│   ├── concepts/            # Core concept explanations
│   └── best-practices/      # Best practice guides
├── react/                   # React application
│   ├── src/                 # Source code
│   │   ├── components/      # Reusable UI components
│   │   ├── config/          # Configuration modules
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Route-level page components
│   │   ├── services/        # Service layer
│   │   │   ├── credentials/ # Credential handling
│   │   │   ├── nats/        # NATS connection & messaging
│   │   │   ├── state/       # State persistence
│   │   │   └── sync/        # Cross-tab synchronization
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── tests/               # Test files
│   └── public/              # Static assets
├── specs/                   # Feature specifications
└── .specify/                # Specification tooling
```

## Source Code Layout

### Components (`react/src/components/`)

Reusable UI components organized by function.

| Component | Purpose |
|-----------|---------|
| `AutoConnect.tsx` | Attempts automatic authentication with stored credentials |
| `ConnectionStatus.tsx` | Displays current NATS connection state |
| `CredentialUpload.tsx` | File input for .creds file upload |
| `LoadingSpinner.tsx` | Loading indicator component |
| `Navigation.tsx` | Main navigation menu |
| `NotificationActions.tsx` | Notification dismiss/read actions |
| `OfflineIndicator.tsx` | Shows when disconnected from NATS |
| `ProfileEditor.tsx` | User profile editing form |
| `ProtectedRoute.tsx` | Route guard for authenticated routes |
| `StateIndicator.tsx` | Shows sync status (synced/syncing/stale) |
| `ThemeToggle.tsx` | Light/dark/system theme selector |
| `UserPassLogin.tsx` | Username/password login form |

### Configuration (`react/src/config/`)

Application configuration modules.

| File | Purpose |
|------|---------|
| `auth.ts` | Authentication configuration (auth type, defaults) |

### Contexts (`react/src/contexts/`)

React contexts for global state management.

| Context | Purpose | Key Values |
|---------|---------|------------|
| `AuthContext.tsx` | Authentication state | `credential`, `connectionStatus`, dispatch actions |
| `EventContext.tsx` | Event-driven application state | `state`, `isLoading`, `syncStatus`, `refreshState` |
| `ThemeContext.tsx` | Theme preferences | `mode`, `resolvedTheme`, `setTheme` |

### Hooks (`react/src/hooks/`)

Custom React hooks for accessing state and services.

| Hook | Purpose | Key Returns |
|------|---------|-------------|
| `useAuth.ts` | Authentication operations | `authenticateWithFile`, `disconnect`, `isAuthenticated` |
| `useAppState.ts` | Materialized application state | `user`, `notifications`, `sessions`, `refreshState` |
| `useCommand.ts` | Command execution | `execute`, `isExecuting`, `error`, `canExecute` |
| `useNatsConnection.ts` | Connection monitoring | `status`, `getConnection`, `isConnected` |
| `useEventSubscription.ts` | Event subscriptions | Subscribes to specific event types |
| `useTheme.ts` | Theme management | `theme`, `setTheme`, `isDark`, `toggleTheme` |
| `useConnectionSync.ts` | Cross-tab sync | `broadcastCredentialLoaded`, `broadcastState` |

### Pages (`react/src/pages/`)

Route-level page components.

| Page | Route | Purpose |
|------|-------|---------|
| `AuthPage.tsx` | `/auth` | Login page with credential upload |
| `DashboardPage.tsx` | `/dashboard` | Main authenticated view |
| `HomePage.tsx` | `/` | Landing page |
| `SettingsPage.tsx` | `/settings` | User settings |

### Services (`react/src/services/`)

Service layer for external integrations and data management.

#### Credentials (`services/credentials/`)

| File | Purpose |
|------|---------|
| `parser.ts` | Parse and validate .creds files |
| `storage.ts` | Encrypted credential storage in IndexedDB |

#### NATS (`services/nats/`)

| File | Purpose |
|------|---------|
| `connection.ts` | WebSocket connection management |
| `events.ts` | Event subscription service |
| `commands.ts` | Command execution service (request/reply) |
| `types.ts` | NATS-specific type definitions |

#### State (`services/state/`)

| File | Purpose |
|------|---------|
| `database.ts` | Dexie database schema |
| `store.ts` | State storage operations |
| `reducer.ts` | Pure state reducer for events |
| `sync.ts` | State synchronization utilities |

#### Sync (`services/sync/`)

| File | Purpose |
|------|---------|
| `tabSync.ts` | BroadcastChannel cross-tab communication |

### Types (`react/src/types/`)

TypeScript type definitions organized by domain.

| File | Contents |
|------|----------|
| `index.ts` | Core types (Credential, Connection, Auth, Route, Tab Sync) |
| `events.ts` | Event types (User, Session, Notification, AppEvent) |
| `commands.ts` | Command types (AppCommand, CommandResult) |
| `state.ts` | State types (AppState, SyncStatus, Theme) |

### Utils (`react/src/utils/`)

Utility functions.

| File | Purpose |
|------|---------|
| `errors.ts` | Error handling utilities |
| `subjects.ts` | NATS subject pattern helpers |
| `theme.ts` | Theme detection and management |

## Configuration Files

### Root Level

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `vite.config.ts` | Vite build configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `eslint.config.js` | ESLint rules |

### Environment

| File | Purpose |
|------|---------|
| `.env.example` | Environment variable template |
| `.env` | Local environment variables (not committed) |

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_NATS_URL` | Yes | NATS WebSocket URL (e.g., `wss://nats.example.com:9443`) |
| `VITE_NATS_NAMESPACE` | No | Subject namespace prefix (default: `app`) |
| `VITE_AUTH_TYPE` | No | Default auth type: `credsfile` or `userpass` |

## Naming Conventions

### Files

- **Components**: PascalCase (e.g., `ConnectionStatus.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Services**: camelCase (e.g., `connection.ts`)
- **Types**: camelCase (e.g., `events.ts`)
- **Utils**: camelCase (e.g., `errors.ts`)

### Types

- **Interfaces**: PascalCase (e.g., `User`, `ConnectionError`)
- **Type aliases**: PascalCase (e.g., `ConnectionStatus`, `AuthType`)
- **Enums**: PascalCase with PascalCase members

### NATS Subjects

- **Events**: `{namespace}.events.{entity}.{action}` (e.g., `app.events.user.updated`)
- **Commands**: `{namespace}.cmd.{entity}.{action}` (e.g., `app.cmd.user.updateProfile`)

## Import Aliases

The template uses path aliases for cleaner imports:

```typescript
// Instead of relative paths:
import { useAuth } from '../../../hooks/useAuth';

// Use aliases:
import { useAuth } from '@/hooks/useAuth';
```

**Configured aliases:**

| Alias | Path |
|-------|------|
| `@/` | `./src/` |

## Adding New Features

### Adding a New Component

1. Create component file in `src/components/`
2. Export from component (default or named)
3. Import where needed

### Adding a New Hook

1. Create hook file in `src/hooks/` with `use` prefix
2. Import required contexts/services
3. Return object with state and actions

### Adding a New Event Type

1. Add interface to `src/types/events.ts`
2. Add to `AppEvent` union type
3. Add type guard function
4. Update reducer in `src/services/state/reducer.ts`

### Adding a New Command Type

1. Add interface to `src/types/commands.ts`
2. Add to `AppCommand` union type
3. Add method to `src/services/nats/commands.ts`
4. Update `useCommand` hook if needed

## Related Documentation

- [Architecture](./architecture.md) - System architecture and component relationships
- [Quick Reference](./quick-reference.md) - API reference for all hooks and types
- [State Management](./concepts/state-management.md) - Event-driven state patterns

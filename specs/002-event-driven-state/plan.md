# Implementation Plan: Event-Driven State Management

**Branch**: `002-event-driven-state` | **Date**: 2026-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-event-driven-state/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement an event-driven state management system where the browser becomes a materialized view of NATS events. The system will:
- Load initial state via NATS request/response on application start
- Subscribe to event streams for real-time state updates
- Persist materialized state in IndexedDB for offline access
- Execute commands via NATS request/response with acknowledgment
- Support dark/light theme switching with system preference detection

## Technical Context

**Language/Version**: TypeScript 5.9.3 with React 19.2.0
**Primary Dependencies**: @nats-io/nats-core ^3.3.0, @nats-io/nkeys ^2.0.3, react-router-dom ^7.12.0, Tailwind CSS 4.1.18
**Storage**: IndexedDB for materialized state and credential storage (with Web Crypto API encryption)
**Testing**: Vitest + React Testing Library + Playwright (infrastructure ready)
**Target Platform**: Modern evergreen browsers with WebSocket, Web Crypto API, and IndexedDB support
**Project Type**: Web application (React SPA)
**Performance Goals**:
- State updates reflected in UI within 2 seconds of event receipt
- Initial state load within 5 seconds
- Command acknowledgment within 3 seconds
- Reconnection and resync within 10 seconds
**Constraints**:
- Offline-capable with read-only access to cached state
- <1 second event-to-UI update latency
- Zero data loss for processed events
**Scale/Scope**:
- Multiple browser tabs with independent NATS connections
- Sample event types: user.updated, session.created, session.expired, notification.received
- Sample commands: user.updateProfile, notification.dismiss, notification.markRead

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: NATS-Only Communication ✅
- **Compliant**: All communication flows through NATS subjects
- Initial state loaded via NATS request/response (not REST)
- Events received via NATS subscriptions (not WebSocket push alternatives)
- Commands sent via NATS request/response (not REST)
- No HTTP/REST/GraphQL fallbacks

### Principle II: Secure Credential Handling ✅
- **Compliant**: Reuses existing credential handling from 001-react-auth-boilerplate
- Credentials stored in IndexedDB with AES-256-GCM encryption
- Authentication via creds file signing nonces
- No plaintext credential transmission

### Principle III: NATS Protocol Compliance ✅
- **Compliant**: Follows NATS subject naming conventions
- Event subjects: `{namespace}.events.{domain}.{action}`
- Command subjects: `{namespace}.commands.{domain}.{action}`
- Request-reply with configurable timeout
- Proper error handling for NATS protocol errors

### Principle IV: Browser Security Standards ✅
- **Compliant**: Builds on existing security measures
- IndexedDB encryption for sensitive data
- WSS transport required in production
- Input sanitization for NATS subjects and message content

### Principle V: Template Reusability ✅
- **Compliant**: Designed as extensible template
- Configurable namespace prefix for multi-UI environments
- Modular event handling architecture
- Clear extension points for domain-specific events

### Technical Constraints ✅
- Uses `@nats-io/nats-core` (correct client library)
- WebSocket-only transport
- IndexedDB for state persistence
- TypeScript with ES2020+ features

## Project Structure

### Documentation (this feature)

```text
specs/002-event-driven-state/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
react/
├── src/
│   ├── components/         # UI components (existing + new theme, state display)
│   │   ├── ConnectionStatus.tsx
│   │   ├── CredentialUpload.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Navigation.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── ThemeToggle.tsx          # NEW: Theme switcher component
│   │   └── StateIndicator.tsx       # NEW: Staleness/offline indicator
│   ├── contexts/           # React Context providers
│   │   ├── AuthContext.tsx          # Existing auth state
│   │   ├── EventContext.tsx         # NEW: Event subscription management
│   │   └── ThemeContext.tsx         # NEW: Theme preference management
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts               # Existing auth hook
│   │   ├── useNatsConnection.ts     # Existing connection hook
│   │   ├── useEventSubscription.ts  # NEW: Subscribe to event streams
│   │   ├── useCommand.ts            # NEW: Execute commands with feedback
│   │   ├── useAppState.ts           # NEW: Access materialized state
│   │   └── useTheme.ts              # NEW: Theme preference hook
│   ├── pages/              # Route components
│   │   ├── AuthPage.tsx
│   │   ├── DashboardPage.tsx        # Updated with event-driven state
│   │   └── SettingsPage.tsx         # NEW or updated: Theme settings
│   ├── services/           # Business logic layer
│   │   ├── nats/
│   │   │   ├── connection.ts        # Existing connection service
│   │   │   ├── events.ts            # NEW: Event subscription service
│   │   │   └── commands.ts          # NEW: Command execution service
│   │   ├── state/                   # NEW: State management services
│   │   │   ├── store.ts             # IndexedDB state store
│   │   │   ├── reducer.ts           # Event-to-state reducers
│   │   │   └── sync.ts              # Cross-tab state sync
│   │   ├── credentials/
│   │   │   ├── parser.ts
│   │   │   └── storage.ts
│   │   └── sync/
│   │       └── broadcastChannel.ts
│   ├── utils/
│   │   ├── errors.ts
│   │   └── theme.ts                 # NEW: Theme detection utilities
│   └── types/
│       ├── index.ts                 # Existing types
│       ├── events.ts                # NEW: Event type definitions
│       ├── commands.ts              # NEW: Command type definitions
│       └── state.ts                 # NEW: State type definitions
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── state/
│   │   │   │   ├── store.test.ts
│   │   │   │   └── reducer.test.ts
│   │   │   └── nats/
│   │   │       ├── events.test.ts
│   │   │       └── commands.test.ts
│   │   └── hooks/
│   │       ├── useEventSubscription.test.ts
│   │       └── useCommand.test.ts
│   ├── integration/
│   │   └── state-sync.test.ts
│   └── e2e/
│       └── event-flow.spec.ts
└── package.json

```

**Structure Decision**: Follows existing React SPA structure from 001-react-auth-boilerplate. New functionality organized into:
- `services/state/` - IndexedDB state persistence and event-to-state reduction
- `services/nats/events.ts` and `commands.ts` - NATS messaging for events and commands
- `contexts/` - New contexts for event subscriptions and theme
- `hooks/` - Composable hooks for state access and command execution

## Complexity Tracking

> **No constitution violations requiring justification**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

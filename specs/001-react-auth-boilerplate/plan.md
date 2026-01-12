# Implementation Plan: React NATS Authentication Boilerplate

**Branch**: `001-react-auth-boilerplate` | **Date**: 2026-01-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-react-auth-boilerplate/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a React boilerplate application that provides NATS credential-based authentication with public and private pages. The application connects directly to NATS servers via WebSocket using `@nats-io/nats-core` (the nats.js library), authenticates users via `.creds` files (NKey-based), and manages connection state across browser tabs. The project is structured in a `react/` folder to support future framework flavors.

## Technical Context

**Language/Version**: TypeScript 5.x with React 18.x
**Primary Dependencies**:
- `@nats-io/nats-core` - NATS JavaScript client for WebSocket connections
- `@nats-io/nkeys` - NKey cryptographic operations for credential parsing
- `react-router-dom` v6+ - Client-side routing with protected routes
- `tailwindcss` - Utility-first CSS styling

**Storage**: Browser IndexedDB with Web Crypto API for secure credential storage
**Testing**: Vitest + React Testing Library + Playwright for E2E
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge) with WebSocket and Web Crypto support
**Project Type**: web (React SPA in `react/` folder)
**Performance Goals**:
- Auth flow < 30 seconds
- Returning user connection < 5 seconds
- Private page load < 2 seconds after connection
- Connection status updates < 1 second
- Auto-reconnect < 30 seconds

**Constraints**:
- NATS-only communication (no REST/GraphQL)
- Credentials never transmitted in plain form
- Must work offline-capable for credential storage
- ES2020+ build target

**Scale/Scope**: Boilerplate template for NATS-native web UIs, supporting single user per browser session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. NATS-Only Communication** | Browser connects via `@nats-io/nats.js` WebSocket | ✅ PASS | Spec requires NATS WebSocket connection via `@nats-io/nats-core` |
| **I. NATS-Only Communication** | All communication via NATS subjects | ✅ PASS | No REST/GraphQL endpoints in design |
| **I. NATS-Only Communication** | Graceful connection state handling | ✅ PASS | FR-009, FR-012 require connection status and auto-reconnect |
| **II. Secure Credential Handling** | Credentials stored in browser secure storage | ✅ PASS | FR-004 requires IndexedDB with encryption or Web Crypto API |
| **II. Secure Credential Handling** | Sign nonces locally, never transmit credentials | ✅ PASS | FR-013 requires local signing, credentials never transmitted plain |
| **II. Secure Credential Handling** | Creds file authentication supported | ✅ PASS | Primary auth method is .creds file upload |
| **II. Secure Credential Handling** | Credential clearable on demand | ✅ PASS | FR-006 requires disconnect function that clears credentials |
| **III. NATS Protocol Compliance** | Follow NATS subject naming conventions | ✅ PASS | Boilerplate will demonstrate proper patterns |
| **III. NATS Protocol Compliance** | Proper timeout/error handling | ✅ PASS | FR-010 requires user-friendly errors, FR-012 handles reconnection |
| **IV. Browser Security Standards** | CSP headers configured | ⚠️ DEFER | Implementation detail for quickstart/deployment docs |
| **IV. Browser Security Standards** | User inputs sanitized | ✅ PASS | Credential file is only user input, validated per FR-002 |
| **IV. Browser Security Standards** | WSS in production | ✅ PASS | Environment-configurable via VITE_NATS_URL |
| **V. Template Reusability** | Configuration externalized | ✅ PASS | VITE_NATS_URL environment variable |
| **V. Template Reusability** | Auth flows modular | ✅ PASS | React Context pattern allows extension |
| **V. Template Reusability** | UI decoupled from NATS logic | ✅ PASS | Services layer separates concerns |
| **V. Template Reusability** | Documentation for customization | ⚠️ DEFER | Part of quickstart.md deliverable |

**Pre-Design Gate Status**: ✅ PASS - All mandatory principles satisfied.

### Post-Design Check (Phase 1)

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. NATS-Only Communication** | Browser connects via `@nats-io/nats-core` WebSocket | ✅ PASS | research.md: `wsconnect()` from `@nats-io/nats-core` |
| **I. NATS-Only Communication** | All communication via NATS subjects | ✅ PASS | contracts/nats-subjects.md: Auth at connection level, no REST |
| **I. NATS-Only Communication** | Graceful connection state handling | ✅ PASS | data-model.md: Connection state machine with 5 states |
| **II. Secure Credential Handling** | Credentials stored in browser secure storage | ✅ PASS | research.md: AES-256-GCM + PBKDF2 in IndexedDB |
| **II. Secure Credential Handling** | Sign nonces locally, never transmit credentials | ✅ PASS | research.md: `credsAuthenticator()` handles signing |
| **II. Secure Credential Handling** | Creds file authentication supported | ✅ PASS | data-model.md: Credential entity with validation rules |
| **II. Secure Credential Handling** | Credential clearable on demand | ✅ PASS | data-model.md: Clear on logout with secure wipe |
| **III. NATS Protocol Compliance** | Follow NATS subject naming conventions | ✅ PASS | contracts/nats-subjects.md: Subject patterns documented |
| **III. NATS Protocol Compliance** | Proper timeout/error handling | ✅ PASS | data-model.md: Error codes with user messages |
| **IV. Browser Security Standards** | CSP headers configured | ✅ PASS | quickstart.md: CSP header recommendations included |
| **IV. Browser Security Standards** | User inputs sanitized | ✅ PASS | data-model.md: Credential validation rules |
| **IV. Browser Security Standards** | WSS in production | ✅ PASS | quickstart.md: Security checklist included |
| **V. Template Reusability** | Configuration externalized | ✅ PASS | quickstart.md: Environment variable documentation |
| **V. Template Reusability** | Auth flows modular | ✅ PASS | plan.md: Context + hooks + services architecture |
| **V. Template Reusability** | UI decoupled from NATS logic | ✅ PASS | contracts/types.ts: Clean interface definitions |
| **V. Template Reusability** | Documentation for customization | ✅ PASS | quickstart.md: Customization points documented |

**Post-Design Gate Status**: ✅ PASS - All principles verified in design artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/001-react-auth-boilerplate/
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
├── public/
│   └── index.html
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ConnectionStatus.tsx
│   │   ├── CredentialUpload.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/             # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── NatsContext.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useNatsConnection.ts
│   │   └── useConnectionSync.ts
│   ├── pages/                # Route components
│   │   ├── HomePage.tsx
│   │   ├── AuthPage.tsx
│   │   └── DashboardPage.tsx
│   ├── services/             # NATS and credential services
│   │   ├── nats/
│   │   │   ├── connection.ts
│   │   │   └── types.ts
│   │   ├── credentials/
│   │   │   ├── parser.ts
│   │   │   ├── storage.ts
│   │   │   └── types.ts
│   │   └── sync/
│   │       └── tabSync.ts
│   ├── utils/                # Utility functions
│   │   └── errors.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/
│   ├── unit/                 # Unit tests for services and hooks
│   ├── integration/          # Component integration tests
│   └── e2e/                  # Playwright E2E tests
├── .env.example
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

**Structure Decision**: React SPA in `react/` folder at repository root, following standard Vite + React + TypeScript conventions. Services are separated by domain (nats, credentials, sync) for modularity and testability. The `react/` folder structure allows sibling folders for future Vue/Svelte/etc. flavors as specified in FR-011.

## Complexity Tracking

> **No constitution violations requiring justification.**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |

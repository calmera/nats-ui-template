<!--
  Sync Impact Report
  ====================
  Version change: 1.0.0 → 1.1.0

  Modified principles:
    - Principle I: WebSocket-First Architecture → NATS-Only Communication
      (Expanded to emphasize NATS is the sole communication channel)
    - Principle II: Secure Credential Handling
      (Added explicit reference to "authenticating with NATS over WebSocket")

  Added sections: None

  Removed sections: None

  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ (no changes needed - generic)
    - .specify/templates/spec-template.md ✅ (no changes needed - generic)
    - .specify/templates/tasks-template.md ✅ (no changes needed - generic)

  Follow-up TODOs: None
-->

# NATS Web UI Template Constitution

## Core Principles

### I. NATS-Only Communication

NATS-native web UIs communicate **exclusively** through NATS. There is no separate REST API,
GraphQL layer, or other backend communication channel. The browser connects directly to NATS
servers using WebSocket transport via the `@nats-io/nats.js` library.

- Browser clients MUST use `@nats-io/nats.js` for WebSocket connections (NOT the deprecated `nats.ws`)
- All application communication MUST flow through NATS subjects—no alternative HTTP/REST endpoints
- Direct TCP connections are not available in browsers; WebSocket is the only transport
- The UI MUST gracefully handle connection state changes (connecting, connected, reconnecting, closed)
- Connection options MUST be configurable per deployment environment
- Backend services (if any) MUST also communicate via NATS, enabling true end-to-end NATS messaging

**Rationale**: A NATS-native UI derives its power from direct NATS connectivity. Using NATS as
the sole communication layer provides consistent pub/sub semantics, eliminates protocol
translation overhead, and enables real-time reactivity that traditional REST architectures
cannot match.

### II. Secure Credential Handling

Authenticating means authenticating with NATS over WebSocket. Credentials MUST never be
transmitted over the network in plain form. Authentication uses cryptographic challenge-response
mechanisms where the browser signs server-provided nonces.

- Credentials MUST be stored in the browser's secure storage (IndexedDB with encryption or
  Web Crypto API-backed storage) when available
- The browser MUST use ConnectionOption callbacks to sign authentication nonces locally
- Supported credential types:
  - **Creds file**: NKey-based credentials with seed for signing
  - **Username/Password**: For basic auth configurations
  - **Token**: Bearer token authentication
- Credential material (seeds, passwords) MUST NOT appear in application logs or error messages
- Session credentials MUST be clearable by the user on demand
- There is no separate authentication service—authentication is handled entirely by NATS

**Rationale**: Browser-based applications face unique security challenges. Signing nonces
locally ensures credentials never leave the client, protecting against network interception
and server-side credential leakage. By authenticating directly with NATS, we eliminate
additional attack surfaces that traditional auth proxies would introduce.

### III. NATS Protocol Compliance

All NATS interactions MUST follow official NATS protocol specifications and best practices.

- Subscription patterns MUST follow NATS subject naming conventions
- Message payloads MUST use documented encoding (JSON, Protobuf, or raw bytes as appropriate)
- Request-reply patterns MUST implement proper timeout handling
- JetStream interactions (if used) MUST follow stream and consumer best practices
- Error handling MUST distinguish between NATS protocol errors and application errors

**Rationale**: Adhering to NATS conventions ensures interoperability with other NATS clients
and services in the broader ecosystem.

### IV. Browser Security Standards

The template MUST implement defense-in-depth security appropriate for browser applications.

- Content Security Policy (CSP) headers MUST be configured to prevent XSS attacks
- All user inputs MUST be sanitized before use in NATS subjects or message content
- WebSocket connections MUST use secure transport (WSS) in production environments
- The application MUST NOT expose internal NATS infrastructure details to end users
- CORS policies MUST be explicitly configured for WebSocket endpoints

**Rationale**: Web applications are exposed to a hostile environment. Multiple security
layers protect both users and the NATS infrastructure.

### V. Template Reusability

This project serves as a foundation template. All patterns MUST be designed for easy
adaptation to specific use cases.

- Configuration MUST be externalized and environment-aware
- Authentication flows MUST be modular to support additional credential types
- UI components MUST be decoupled from NATS-specific logic
- Documentation MUST explain customization points and extension patterns
- Example implementations MUST demonstrate common NATS UI patterns (pub/sub, request/reply,
  stream consumers)

**Rationale**: A template's value lies in accelerating new projects. Clear extension points
and documentation maximize this value.

## Technical Constraints

These constraints define the technology boundaries for implementations based on this template.

- **NATS Client**: `@nats-io/nats.js` (current official JavaScript client)
- **Transport**: WebSocket only (browser limitation)
- **Communication**: NATS subjects exclusively—no REST/GraphQL fallbacks
- **Credential Storage**: Browser secure storage APIs (IndexedDB, Web Crypto API)
- **Minimum Browser Support**: Modern evergreen browsers with WebSocket and Web Crypto support
- **Build Target**: ES2020+ for async/await and modern JavaScript features

Implementations MAY choose their own:
- Frontend framework (React, Vue, Svelte, vanilla JS, etc.)
- State management approach
- Styling solution
- Build tooling

## Development Standards

All contributions and implementations MUST adhere to these development practices.

- **Testing**: Unit tests for credential handling and NATS interaction logic are REQUIRED
- **Type Safety**: TypeScript is RECOMMENDED for improved maintainability
- **Linting**: Code MUST pass configured linting rules before commit
- **Documentation**: Public APIs and configuration options MUST be documented
- **Error Messages**: User-facing errors MUST be actionable; internal errors MUST be logged
  with sufficient context for debugging

## Governance

This constitution defines the non-negotiable principles for the NATS Web UI Template.
All features, pull requests, and architectural decisions MUST comply with these principles.

- **Amendment Process**: Changes to this constitution require documented justification,
  review of impact on existing implementations, and explicit approval
- **Versioning**: Constitution follows semantic versioning:
  - MAJOR: Principle removal or backward-incompatible redefinition
  - MINOR: New principle added or material guidance expansion
  - PATCH: Clarifications, wording improvements, non-semantic refinements
- **Compliance Review**: All PRs MUST verify alignment with applicable principles
- **Exceptions**: Violations MUST be documented in a Complexity Tracking table with
  justification and explanation of why simpler alternatives were rejected

**Version**: 1.1.0 | **Ratified**: 2026-01-12 | **Last Amended**: 2026-01-12

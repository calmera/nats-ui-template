# Feature Specification: React NATS Authentication Boilerplate

**Feature Branch**: `001-react-auth-boilerplate`
**Created**: 2026-01-12
**Status**: Draft
**Input**: User description: "Create a boilerplate project based on react that provides authentication, public and private pages. Put it in a react folder since we might want to create several different flavors of this starter." Updated: "NATS-first approach with credential files for authentication."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Time Credential Authentication (Priority: P1)

A new user visits the application and authenticates by providing their NATS credential file. They load their `.creds` file (obtained from their NATS administrator or Synadia Cloud), which establishes a secure connection and grants access to private areas of the application.

**Why this priority**: Credential-based authentication is the entry point for all authenticated functionality. Without this, users cannot establish a NATS connection or access any private features, making it the highest priority for a usable MVP.

**Independent Test**: Can be fully tested by navigating to the authentication page, uploading a valid credential file, and verifying the NATS connection is established and the user is redirected to a private page. Delivers value by enabling secure NATS-authenticated access.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user on the authentication page, **When** they upload a valid NATS credential file, **Then** a NATS connection is established and they are redirected to a private page
2. **Given** an unauthenticated user on the authentication page, **When** they upload an invalid or expired credential file, **Then** they see a clear error message indicating the credential is invalid without exposing internal NATS details
3. **Given** an unauthenticated user on the authentication page, **When** they upload a credential file that cannot connect to the configured NATS server, **Then** they see a connection error with guidance on troubleshooting

---

### User Story 2 - Returning User Quick Authentication (Priority: P1)

A returning user who previously authenticated can quickly reconnect using credentials stored securely in the browser, without needing to re-upload their credential file.

**Why this priority**: Session persistence is equally critical to initial authentication for usability. Both are P1 because a new user must initially authenticate, but returning users expect to remain authenticated—neither works without the other for a functional experience.

**Independent Test**: Can be fully tested by authenticating once, closing and reopening the browser, and verifying the application reconnects automatically without credential re-upload. Delivers value by reducing friction for returning users.

**Acceptance Scenarios**:

1. **Given** a user with stored credentials, **When** they open the application, **Then** a NATS connection is automatically established and they are directed to a private page
2. **Given** a user with stored credentials that have become invalid, **When** they open the application, **Then** they see a message explaining the credentials are no longer valid and are prompted to re-authenticate
3. **Given** a user with stored credentials, **When** the NATS server is temporarily unavailable, **Then** they see connection status and automatic reconnection attempts

---

### User Story 3 - Accessing Public Pages (Priority: P2)

Any visitor (authenticated or not) can browse public pages of the application without authenticating. This includes the home page and any informational content about connecting to NATS.

**Why this priority**: Public pages establish the application's presence and provide context before authentication. While important for user experience, they don't require a NATS connection to function.

**Independent Test**: Can be fully tested by accessing public URLs without providing credentials and verifying content displays correctly. Delivers value by providing an entry point and information to all visitors.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they visit the home page, **Then** they see public content and an option to authenticate with their credential file
2. **Given** an authenticated user, **When** they visit the home page, **Then** they see public content and navigation options appropriate for connected users (including connection status)
3. **Given** any visitor, **When** they navigate between public pages, **Then** the pages load without requiring NATS authentication

---

### User Story 4 - Accessing Private Pages (Priority: P2)

Authenticated users with an active NATS connection can access private/protected pages that leverage the NATS connection for real-time data.

**Why this priority**: Private pages demonstrate the value of NATS authentication. This is P2 because while essential to prove auth works, it depends on P1 credential authentication to function.

**Independent Test**: Can be fully tested by authenticating and navigating to a protected route, then disconnecting and attempting the same route. Delivers value by providing NATS-connected functionality to authenticated users.

**Acceptance Scenarios**:

1. **Given** an authenticated user with active NATS connection, **When** they navigate to a private page, **Then** they see the protected content with real-time NATS connectivity
2. **Given** an unauthenticated user, **When** they attempt to access a private page directly, **Then** they are redirected to the authentication page
3. **Given** a user whose NATS connection drops, **When** they attempt to access a private page, **Then** they see connection status with reconnection in progress or a prompt to re-authenticate

---

### User Story 5 - User Disconnect (Logout) (Priority: P2)

A connected user can securely disconnect from NATS, clearing their session credentials and returning them to a public state.

**Why this priority**: Disconnect is essential for security and shared device scenarios, but is secondary to the ability to connect and access content.

**Independent Test**: Can be fully tested by authenticating, clicking disconnect, and verifying the NATS connection is closed, credentials are cleared, and private pages are no longer accessible. Delivers value by enabling secure session termination.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they click the disconnect button, **Then** the NATS connection is closed, stored credentials are cleared, and they are redirected to a public page
2. **Given** a user who just disconnected, **When** they use the browser back button, **Then** they cannot access previously viewed private content
3. **Given** a user who just disconnected, **When** they attempt to access a private page, **Then** they are redirected to the authentication page

---

### User Story 6 - Connection State Visibility (Priority: P3)

A connected user can see the current state of their NATS connection and receives visual feedback during connection events (connecting, connected, reconnecting, disconnected).

**Why this priority**: Connection visibility improves user experience significantly but is not strictly required for an MVP. Users could function without explicit status indicators initially.

**Independent Test**: Can be fully tested by monitoring UI state during various connection scenarios (initial connect, server restart, network interruption). Delivers value by providing transparency into NATS connection health.

**Acceptance Scenarios**:

1. **Given** an authenticated user with active connection, **When** they view any page, **Then** they see a visual indicator showing "Connected" status
2. **Given** an authenticated user, **When** the NATS connection is temporarily lost, **Then** they see a "Reconnecting" status and the system automatically attempts to restore the connection
3. **Given** an authenticated user with multiple tabs, **When** the connection state changes in one tab, **Then** all tabs reflect the updated connection state

---

### Edge Cases

- What happens when a user's NATS connection drops while they are viewing a private page?
  - The user should see a "Reconnecting" status; the page remains visible but indicates data may be stale. On their next action requiring NATS, they receive appropriate feedback.
- How does the system handle invalid or corrupted credential files?
  - The credential parser validates the file format before attempting connection and provides specific error messages for common issues (wrong format, missing sections, invalid encoding).
- What happens if browser storage is cleared while connected?
  - The current connection remains active until page refresh. On refresh, user is treated as unauthenticated and must re-authenticate with their credential file.
- How does the application behave with JavaScript disabled?
  - A graceful message should indicate the app requires JavaScript for NATS WebSocket connectivity.
- What happens when the NATS server requires reconnection during active use?
  - The application should show connection status, queue messages during brief outages, and resume normal operation upon reconnection without user intervention.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an authentication flow allowing users to authenticate by uploading their NATS credential file (.creds format)
- **FR-002**: System MUST validate credential file format before attempting NATS connection
- **FR-003**: System MUST establish NATS WebSocket connection using credentials from the uploaded file
- **FR-004**: System MUST securely store credentials in browser secure storage (IndexedDB with encryption or Web Crypto API-backed storage) for session persistence
- **FR-005**: System MUST provide route protection that redirects unauthenticated users (no NATS connection) to the authentication page
- **FR-006**: System MUST provide a disconnect function that closes the NATS connection and clears all stored credentials
- **FR-007**: System MUST distinguish between public routes (accessible without NATS connection) and private routes (require active NATS connection)
- **FR-008**: System MUST persist authentication state across page refreshes and browser tabs using stored credentials
- **FR-009**: System MUST display connection status (connecting, connected, reconnecting, disconnected) to authenticated users
- **FR-010**: System MUST provide user-friendly error messages for connection failures without exposing internal NATS server details or credential information
- **FR-011**: System MUST be structured within a `react` folder to allow for additional framework flavors in the future
- **FR-012**: System MUST handle NATS reconnection automatically with exponential backoff on connection loss
- **FR-013**: System MUST sign authentication nonces locally using the credential file (credentials never transmitted in plain form)
- **FR-014**: System MUST synchronize connection state across browser tabs using the BroadcastChannel API

### Key Entities

- **Credential**: Represents a NATS credential file containing NKey-based authentication material. Contains: seed for signing, user JWT, and server connection info. States: not loaded, loading, loaded, invalid
- **Connection**: Represents the NATS WebSocket connection to the server. States: disconnected, connecting, connected, reconnecting, failed
- **Route**: Represents a navigable page with an access level (public or private) that determines whether an active NATS connection is required

### Integration & External Dependencies

- **Synadia Cloud / NATS Server**: The React app connects to a NATS server (Synadia Cloud or self-hosted) via WebSocket transport using the `@nats-io/nats-core` package. Server URL is configured via environment variable (`VITE_NATS_URL`) at build/runtime.
- **Credential Source**: Users obtain their `.creds` file from their NATS administrator or Synadia Cloud dashboard (outside scope of this application)
- **Failure Modes**: If NATS connection fails, display connection error and retry with exponential backoff; differentiate between credential errors (prompt re-authentication) and server availability errors (show retry status)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete authentication (credential upload to connected state) in under 30 seconds from landing on the authentication page
- **SC-002**: Returning users with stored credentials see a connected state within 5 seconds of page load
- **SC-003**: Private pages load within 2 seconds after NATS connection is established
- **SC-004**: 100% of authentication/connection failures display user-actionable error messages
- **SC-005**: Session state correctly persists across page refreshes with automatic reconnection
- **SC-006**: Unauthenticated access attempts to private routes redirect to authentication within 500ms
- **SC-007**: The boilerplate project can be scaffolded and run locally with no more than 3 terminal commands
- **SC-008**: All authentication flows work correctly in modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- **SC-009**: Connection status updates are reflected in the UI within 1 second of state change
- **SC-010**: Automatic reconnection succeeds within 30 seconds of temporary connection loss (when server is available)

## Clarifications

### Session 2026-01-12

- Q: How should this boilerplate handle authentication data? → A: Connect to Synadia Cloud using NATS credential files (.creds)
- Q: How should the NATS server URL be configured? → A: Environment variable at build/runtime (e.g., `VITE_NATS_URL`)
- Q: What React state management approach for connection/auth state? → A: React Context + useReducer hooks (built-in, no external dependencies)
- Q: How should connection state sync across browser tabs? → A: BroadcastChannel API (each tab has own connection, state synced via messages)
- Q: What routing library for public/private route management? → A: React Router v6+ (industry standard)
- Q: What styling approach for UI components? → A: Tailwind CSS (utility-first)

## Assumptions

- UI styling is handled via Tailwind CSS (utility-first approach)
- Routing is handled via React Router v6+ with protected route patterns for private pages
- NATS connection and authentication state is managed via React Context with useReducer hooks (no external state management dependencies)
- NATS credential file (.creds) authentication is the primary and only authentication method for this boilerplate
- Users obtain their credential files from their NATS administrator or Synadia Cloud dashboard (credential provisioning is outside scope)
- The boilerplate connects to a NATS server configured to accept credential-based authentication via WebSocket
- Session validity is tied to credential validity (managed by the NATS infrastructure, not this application)
- The project structure supports future addition of other frontend framework flavors (Vue, Svelte, etc.) in sibling folders
- Credential files contain all necessary information for connection (server URL, user JWT, NKey seed)

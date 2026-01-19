# Feature Specification: Event-Driven State Management

**Feature Branch**: `002-event-driven-state`
**Created**: 2026-01-19
**Status**: Draft
**Input**: User description: "We want to allow both dark and light versions of the UI but more importantly, we want to make the communication over NATS asynchronous. In essence, the browser should just be a materialized view of the events that are flowing over NATS (or websocket in this case). Commands would still go through request/response, but we want to make this template the ideal starting point for event-driven applications on top of NATS. We can use IndexedDB in the browser for keeping the materialized state. When the application loads, the initial state should be retrieved from NATS through request/response. but once that is done, we need to receive updates of the state through messages on the websocket (== NATS). Does that make sense? We need to check this out so think hard about this."

## Clarifications

### Session 2026-01-19

- Q: What is the primary domain this event-driven UI will manage? → A: Generic template with sample events (user/session/notification)
- Q: How should the client resynchronize state after a connection interruption? → A: Full state re-fetch (request current snapshot from backend)
- Q: How should the NATS WebSocket connection authenticate? → A: User-provided creds file signs nonce during WebSocket connection (existing auth system)
- Q: How should multiple browser tabs synchronize state? → A: Each tab has independent NATS connection, IndexedDB syncs state between tabs
- Q: What subject naming convention for events and commands? → A: `{namespace}.events.{domain}.{action}` for events, `{namespace}.commands.{domain}.{action}` for commands, with configurable namespace prefix for multi-UI environments

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time State Synchronization (Priority: P1)

As a user of an event-driven application, I want the UI to automatically reflect changes happening in the system so that I always see the current state without manually refreshing.

**Why this priority**: This is the core value proposition - the browser becomes a live materialized view of backend events. Without this, the application is just a traditional request/response app.

**Independent Test**: Can be fully tested by having two browser windows open - when state changes from one source (or backend), all connected browsers reflect the change within seconds. Delivers the fundamental real-time experience.

**Acceptance Scenarios**:

1. **Given** I am connected to the application, **When** an event occurs that changes application state, **Then** my UI updates automatically without any user action
2. **Given** I am connected to the application, **When** I disconnect temporarily and reconnect, **Then** my UI synchronizes to the current state automatically
3. **Given** I have multiple browser tabs open, **When** state changes occur, **Then** all tabs reflect the same current state

---

### User Story 2 - Initial State Loading (Priority: P1)

As a user opening the application, I want to see the current state immediately so that I can start working without waiting for events to build up the view.

**Why this priority**: Users cannot use the application without seeing initial state. This is critical for first-load experience and returning users.

**Independent Test**: Can be fully tested by opening a new browser window and verifying that the current application state loads correctly within an acceptable time. Delivers immediate usability on app launch.

**Acceptance Scenarios**:

1. **Given** I open the application for the first time, **When** I authenticate successfully, **Then** I see the current state of the application loaded from the backend
2. **Given** I have previously used the application, **When** I return and the backend is unavailable, **Then** I see my last known state from local storage with a clear indication it may be stale
3. **Given** I am loading initial state, **When** the request takes longer than expected, **Then** I see a loading indicator with progress feedback

---

### User Story 3 - Command Execution with Feedback (Priority: P1)

As a user, I want to perform actions (commands) and receive immediate confirmation so that I know my action was processed successfully.

**Why this priority**: Users must be able to interact with the system and know their actions succeeded. Commands are the write-side of the event-driven pattern.

**Independent Test**: Can be fully tested by executing a command and verifying both the acknowledgment and the subsequent state update. Delivers the interactive capability of the application.

**Acceptance Scenarios**:

1. **Given** I want to perform an action, **When** I execute a command, **Then** I receive acknowledgment of success or failure within a reasonable time
2. **Given** I execute a command, **When** it succeeds, **Then** I see the resulting state change reflected in my UI through the event subscription
3. **Given** I execute a command, **When** the backend is temporarily unavailable, **Then** I see clear feedback about the failure and can retry
4. **Given** I execute a command, **When** it fails validation, **Then** I see a clear error message explaining what went wrong

---

### User Story 4 - Offline State Persistence (Priority: P2)

As a user, I want the application to remember my last seen state when I'm offline so that I can still reference information even without connectivity.

**Why this priority**: Enhances user experience by providing resilience, but the core functionality (real-time sync) must work first.

**Independent Test**: Can be fully tested by loading the app with state, going offline, closing and reopening the browser, and verifying the last state is still visible. Delivers offline reference capability.

**Acceptance Scenarios**:

1. **Given** I have used the application online, **When** I go offline, **Then** I can still see my last synchronized state
2. **Given** I am viewing offline state, **When** connectivity is restored, **Then** the application automatically synchronizes to the current state
3. **Given** I am offline, **When** I attempt to execute a command, **Then** I see a clear indication that the action cannot be performed offline

---

### User Story 5 - Theme Selection (Priority: P3)

As a user, I want to choose between dark and light themes so that I can use the application comfortably in different lighting conditions.

**Why this priority**: Quality-of-life feature that improves user comfort but doesn't affect core functionality.

**Independent Test**: Can be fully tested by switching themes and verifying all UI elements render correctly in both modes. Delivers personalized visual experience.

**Acceptance Scenarios**:

1. **Given** I am using the application, **When** I select dark theme, **Then** all UI elements switch to dark color scheme
2. **Given** I am using the application, **When** I select light theme, **Then** all UI elements switch to light color scheme
3. **Given** I have selected a theme preference, **When** I return to the application later, **Then** my theme preference is remembered
4. **Given** I have not set a preference, **When** I open the application, **Then** it respects my operating system's theme preference

---

### Edge Cases

- What happens when the connection drops mid-event-stream? The application reconnects automatically and performs a full state re-fetch from the backend, replacing local state with the fresh snapshot.
- How does the system handle conflicting updates when operating offline then reconnecting? Last-write-wins based on server authority, with user notification of any conflicts.
- What happens if IndexedDB storage is full or unavailable? The application falls back to in-memory state with appropriate user warning.
- How does the system handle malformed events from the backend? Invalid events are logged and skipped without crashing the application.
- What happens if initial state load times out? User sees timeout error with retry option; can view stale local state if available.

## Requirements *(mandatory)*

### Functional Requirements

#### Event-Driven Architecture

- **FR-001**: System MUST subscribe to event streams using pattern `{namespace}.events.>` upon successful authentication, where namespace is configurable
- **FR-002**: System MUST update local state in response to received events within 1 second of receipt
- **FR-003**: System MUST persist state changes to IndexedDB after each event is processed
- **FR-004**: System MUST maintain event ordering to ensure consistent state materialization
- **FR-005**: System MUST handle connection interruptions with automatic reconnection and full state re-fetch from backend (not event replay)
- **FR-005a**: System MUST support configurable namespace prefix for NATS subjects to enable multiple UI instances on the same NATS server

#### Command Processing

- **FR-006**: System MUST send commands to `{namespace}.commands.{domain}.{action}` via request/response pattern with configurable timeout (default: 3000ms per SC-003)
- **FR-007**: System MUST provide command acknowledgment (success/failure) to the user
- **FR-008**: System MUST NOT allow command execution when offline
- **FR-009**: System MUST validate commands locally before sending where possible

#### State Management

- **FR-010**: System MUST load initial state from backend via request/response on application start
- **FR-011**: System MUST store materialized state in IndexedDB for offline access
- **FR-012**: System MUST display staleness indicator when showing cached/offline state
- **FR-013**: System MUST synchronize state across browser tabs via shared IndexedDB (each tab maintains independent NATS connection)
- **FR-014**: System MUST handle IndexedDB unavailability gracefully with in-memory fallback

#### Theme Support

- **FR-015**: System MUST support dark and light theme variants
- **FR-016**: System MUST persist theme preference in local storage
- **FR-017**: System MUST respect operating system theme preference when no user preference is set
- **FR-018**: System MUST apply theme changes immediately without page reload

### Key Entities

- **Event**: A notification of state change from the backend, containing event type, payload, timestamp, and sequence number. Sample event types for the template include: `user.updated`, `session.created`, `session.expired`, `notification.received`
- **Command**: A user-initiated action request containing command type, payload, and correlation ID for tracking. Sample commands include: `user.updateProfile`, `notification.dismiss`, `notification.markRead`
- **Materialized State**: The current application state derived from processing all events, stored in IndexedDB
- **Connection State**: Tracks WebSocket connection status (connected, reconnecting, disconnected) and subscription health
- **Theme Preference**: User's selected theme (dark/light/system) stored locally

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see state updates reflected in the UI within 2 seconds of the event occurring in the backend
- **SC-002**: Initial state loads completely within 5 seconds on standard network conditions
- **SC-003**: Command acknowledgment is received within 3 seconds of user action
- **SC-004**: Application reconnects and resynchronizes state within 10 seconds after connection loss
- **SC-005**: 100% of UI elements correctly render in both dark and light themes
- **SC-006**: Application remains functional with read-only access when offline (viewing cached state)
- **SC-007**: State remains consistent across multiple browser tabs viewing the same data
- **SC-008**: Zero data loss during normal operation - all processed events are persisted to IndexedDB

## Assumptions

- The NATS backend will provide a well-defined event schema and subjects for subscription
- The backend supports request/response pattern for initial state loading and command processing
- Users have modern browsers with IndexedDB and WebSocket support (Chrome, Firefox, Safari, Edge latest versions)
- Events from the backend are idempotent or include sequence numbers for deduplication
- The backend is the source of truth - client state is always eventually consistent with server state
- Authentication system from 001-react-auth-boilerplate is already implemented; user provides creds file which signs the server nonce during NATS WebSocket connection

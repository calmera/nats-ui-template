# Tasks: Event-Driven State Management

**Input**: Design documents from `/specs/002-event-driven-state/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure: `react/src/` for source, `react/tests/` for tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and shared type definitions

- [ ] T001 Add dexie and dexie-react-hooks dependencies to react/package.json
- [ ] T002 [P] Copy type definitions from contracts/typescript-types.ts to react/src/types/events.ts
- [ ] T003 [P] Create command type definitions in react/src/types/commands.ts
- [ ] T004 [P] Create state type definitions in react/src/types/state.ts
- [ ] T005 [P] Create NATS subject builder utility in react/src/utils/subjects.ts
- [ ] T006 Configure Tailwind CSS 4.x dark mode with CSS variables in react/src/index.css

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create IndexedDB database schema using Dexie in react/src/services/state/database.ts
- [ ] T008 [P] Implement state storage abstraction with in-memory fallback in react/src/services/state/store.ts
- [ ] T009 [P] Implement state reducer for event processing in react/src/services/state/reducer.ts
- [ ] T010 Implement NATS event subscription service in react/src/services/nats/events.ts
- [ ] T011 [P] Implement NATS command execution service in react/src/services/nats/commands.ts
- [ ] T012 Implement BroadcastChannel cross-tab sync service in react/src/services/state/sync.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 & 2 - Real-Time State Synchronization + Initial State Loading (Priority: P1)

**Goal**: Browser becomes a live materialized view of backend events with proper initial state loading

**Independent Test**: Open two browser windows - when state changes from one source (or backend), all connected browsers reflect the change within seconds. New browser window loads current state immediately upon authentication.

**Note**: US1 and US2 are combined because they share the same infrastructure (EventContext, useAppState) and cannot be tested independently - initial state loading is required before real-time sync can be observed.

### Implementation for User Story 1 & 2

- [ ] T013 [US1/2] Create EventContext provider for state and subscription management in react/src/contexts/EventContext.tsx
- [ ] T014 [US1/2] Implement useAppState hook for accessing materialized state in react/src/hooks/useAppState.ts
- [ ] T015 [US1/2] Implement useEventSubscription hook for custom event listeners in react/src/hooks/useEventSubscription.ts
- [ ] T016 [US1/2] Create StateIndicator component for staleness/offline display in react/src/components/StateIndicator.tsx
- [ ] T017 [US1/2] Create LoadingSpinner component with progress feedback in react/src/components/LoadingSpinner.tsx
- [ ] T018 [US1/2] Update DashboardPage to display materialized state in react/src/pages/DashboardPage.tsx
- [ ] T019 [US1/2] Add reconnection handling with full state re-fetch in react/src/services/nats/events.ts
- [ ] T020 [US1/2] Integrate EventProvider into App component wrapping authenticated routes in react/src/App.tsx

**Checkpoint**: At this point, User Stories 1 & 2 should be fully functional - users see initial state on load and receive real-time updates

---

## Phase 4: User Story 3 - Command Execution with Feedback (Priority: P1)

**Goal**: Users can perform actions and receive immediate confirmation of success/failure

**Independent Test**: Execute a command and verify both the acknowledgment and the subsequent state update

### Implementation for User Story 3

- [ ] T021 [US3] Implement useCommand hook with execute/isExecuting/error in react/src/hooks/useCommand.ts
- [ ] T022 [US3] Create sample ProfileEditor component demonstrating command usage in react/src/components/ProfileEditor.tsx
- [ ] T023 [US3] Create NotificationActions component for dismiss/markRead commands in react/src/components/NotificationActions.tsx
- [ ] T024 [US3] Add command validation before sending in react/src/services/nats/commands.ts
- [ ] T025 [US3] Add optimistic updates with rollback on failure in react/src/hooks/useCommand.ts
- [ ] T026 [US3] Integrate command components into DashboardPage in react/src/pages/DashboardPage.tsx

**Checkpoint**: At this point, User Story 3 should be fully functional - users can execute commands with feedback

---

## Phase 5: User Story 4 - Offline State Persistence (Priority: P2)

**Goal**: Application remembers last seen state when offline for reference

**Independent Test**: Load app with state, go offline, close and reopen browser, verify last state is still visible

### Implementation for User Story 4

- [ ] T027 [US4] Implement IndexedDB persistence on every state change in react/src/services/state/store.ts
- [ ] T028 [US4] Implement offline state loading from IndexedDB on app start in react/src/contexts/EventContext.tsx
- [ ] T029 [US4] Update useCommand to block execution when offline in react/src/hooks/useCommand.ts
- [ ] T030 [US4] Create OfflineIndicator component in react/src/components/OfflineIndicator.tsx
- [ ] T031 [US4] Add automatic state resync when connectivity is restored in react/src/services/nats/events.ts
- [ ] T032 [US4] Update StateIndicator to show offline status in react/src/components/StateIndicator.tsx

**Checkpoint**: At this point, User Story 4 should be fully functional - app works offline with cached state

---

## Phase 6: User Story 5 - Theme Selection (Priority: P3)

**Goal**: Users can choose between dark and light themes with system preference detection

**Independent Test**: Switch themes and verify all UI elements render correctly in both modes

### Implementation for User Story 5

- [ ] T033 [US5] Create ThemeContext provider in react/src/contexts/ThemeContext.tsx
- [ ] T034 [US5] Implement useTheme hook for theme access and switching in react/src/hooks/useTheme.ts
- [ ] T035 [US5] Create theme detection utilities (system preference) in react/src/utils/theme.ts
- [ ] T036 [US5] Create ThemeToggle component with light/dark/system options in react/src/components/ThemeToggle.tsx
- [ ] T037 [US5] Add FOUC prevention inline script to index.html in react/index.html
- [ ] T038 [US5] Configure Tailwind dark mode theme variables in react/src/index.css
- [ ] T039 [US5] Update existing components with dark mode classes in react/src/components/
- [ ] T040 [US5] Create or update SettingsPage with theme selection in react/src/pages/SettingsPage.tsx
- [ ] T041 [US5] Integrate ThemeProvider into App component in react/src/App.tsx
- [ ] T042 [US5] Add theme cross-tab sync via BroadcastChannel in react/src/services/state/sync.ts

**Checkpoint**: At this point, User Story 5 should be fully functional - theme switching works across the app

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T043 Add error handling for malformed events in react/src/services/state/reducer.ts
- [ ] T044 Add connection error recovery UI in react/src/components/ConnectionStatus.tsx
- [ ] T045 [P] Add environment variable configuration for NATS_NAMESPACE in react/.env.example
- [ ] T046 [P] Update Navigation component with notification badge in react/src/components/Navigation.tsx
- [ ] T047 Verify all components render correctly in both themes
- [ ] T048 Run quickstart.md validation scenarios including timing verification:
  - Verify event-to-UI latency < 2s (SC-001)
  - Verify initial state load < 5s (SC-002)
  - Verify command acknowledgment < 3s (SC-003)
  - Verify reconnection resync < 10s (SC-004)
- [ ] T049 Run linting and formatting checks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories 1 & 2 (Phase 3)**: Depends on Foundational phase completion - MVP
- **User Story 3 (Phase 4)**: Depends on Phase 3 (needs state context to show command results)
- **User Story 4 (Phase 5)**: Depends on Phase 3 (needs state management infrastructure)
- **User Story 5 (Phase 6)**: Can start after Phase 2 (independent of state management)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Stories 1 & 2 (P1)**: Combined - initial state + real-time sync are inseparable for testing
- **User Story 3 (P1)**: Depends on US1/2 (commands trigger events that update state)
- **User Story 4 (P2)**: Depends on US1/2 (offline persistence builds on state management)
- **User Story 5 (P3)**: Independent - can be implemented in parallel with US4 after US1/2

### Within Each User Story

- Services before contexts
- Contexts before hooks
- Hooks before components
- Components before page integration
- Core implementation before integration

### Parallel Opportunities

**Phase 1 (Setup)**:
```bash
# Launch in parallel:
Task T002: Copy type definitions to events.ts
Task T003: Create command type definitions
Task T004: Create state type definitions
Task T005: Create NATS subject builder utility
```

**Phase 2 (Foundational)**:
```bash
# Launch in parallel (after T007):
Task T008: State storage abstraction
Task T009: State reducer
Task T011: NATS command service
```

**Phase 3 (US1/2)**:
```bash
# Launch in parallel (after T013):
Task T015: useEventSubscription hook
Task T016: StateIndicator component
Task T017: LoadingSpinner component
```

**Phase 6 (US5)**:
```bash
# Launch in parallel:
Task T035: Theme detection utilities
Task T036: ThemeToggle component
Task T037: FOUC prevention script
Task T038: Tailwind dark mode config
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Stories 1 & 2
4. **STOP and VALIDATE**: Test initial state loading + real-time updates
5. Deploy/demo if ready - this is the core event-driven experience

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1/2 (Initial State + Real-Time Sync) → Test → Deploy/Demo (MVP!)
3. Add US3 (Command Execution) → Test → Deploy/Demo
4. Add US4 (Offline Persistence) → Test → Deploy/Demo
5. Add US5 (Theme Selection) → Test → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers after Foundational phase:

- Developer A: User Stories 1, 2, 3 (core event flow)
- Developer B: User Story 5 (theme - independent)
- After A completes US1/2, can start US4 (offline) while B continues themes

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 49 |
| **Setup Tasks** | 6 |
| **Foundational Tasks** | 6 |
| **US1/2 Tasks** | 8 |
| **US3 Tasks** | 6 |
| **US4 Tasks** | 6 |
| **US5 Tasks** | 10 |
| **Polish Tasks** | 7 |
| **Parallelizable Tasks** | 17 |

**MVP Scope**: Setup (6) + Foundational (6) + US1/2 (8) = **20 tasks** to deliver core event-driven experience

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US1 and US2 are combined because initial state loading is required to observe real-time updates

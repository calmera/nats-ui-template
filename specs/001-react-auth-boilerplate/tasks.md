# Tasks: React NATS Authentication Boilerplate

**Input**: Design documents from `/specs/001-react-auth-boilerplate/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in specification - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **Source**: `react/src/`
- **Tests**: `react/tests/`
- **Config**: `react/` root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create `react/` folder structure per plan.md layout
- [x] T002 Initialize Vite + React + TypeScript project with `npm create vite@latest` in react/
- [x] T003 [P] Install production dependencies: @nats-io/nats-core, @nats-io/nkeys, react-router-dom in react/package.json
- [x] T004 [P] Install dev dependencies: tailwindcss, postcss, autoprefixer, vitest, @testing-library/react in react/package.json
- [x] T005 [P] Configure TypeScript with strict mode in react/tsconfig.json
- [x] T006 [P] Configure Tailwind CSS (using Tailwind v4 with @import)
- [x] T007 [P] Configure PostCSS in react/postcss.config.js
- [x] T008 [P] Configure Vite build settings in react/vite.config.ts
- [x] T009 Create environment configuration with .env.example containing VITE_NATS_URL in react/.env.example
- [x] T010 [P] Configure ESLint and Prettier for code quality in react/

**Checkpoint**: Project scaffolding complete - can run `npm run dev` without errors ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 [P] Create TypeScript types from contracts in react/src/types/index.ts (copy from contracts/types.ts)
- [x] T012 [P] Create error utilities with user-friendly messages in react/src/utils/errors.ts
- [x] T013 [P] Create credential parser service using @nats-io/nkeys in react/src/services/credentials/parser.ts
- [x] T014 Create NATS connection service with wsconnect() in react/src/services/nats/connection.ts
- [x] T015 [P] Create NATS service types in react/src/services/nats/types.ts
- [x] T016 Create AuthContext with useReducer for state management in react/src/contexts/AuthContext.tsx
- [x] T017 Create base App component with React Router setup in react/src/App.tsx
- [x] T018 Create application entry point in react/src/main.tsx
- [x] T019 [P] Create base Tailwind styles in react/src/index.css
- [x] T020 [P] Create index.html with noscript fallback message for JavaScript-disabled browsers in react/index.html

**Checkpoint**: Foundation ready - `npm run dev` shows blank page with router working ✅

---

## Phase 3: User Story 1 - First-Time Credential Authentication (Priority: P1) 🎯 MVP

**Goal**: New users can authenticate by uploading their NATS .creds file and establish a secure connection

**Independent Test**: Navigate to /auth, upload valid .creds file, verify NATS connection established and redirected to /dashboard

### Implementation for User Story 1

- [x] T021 [US1] Implement credential file validation logic in react/src/services/credentials/parser.ts
- [x] T022 [US1] Create CredentialUpload component with file drop zone in react/src/components/CredentialUpload.tsx
- [x] T023 [US1] Create AuthPage with credential upload UI in react/src/pages/AuthPage.tsx
- [x] T024 [US1] Add LOAD_CREDENTIAL actions to AuthContext reducer in react/src/contexts/AuthContext.tsx
- [x] T025 [US1] Implement connect() function in NATS connection service in react/src/services/nats/connection.ts
- [x] T026 [US1] Create useAuth hook for credential operations in react/src/hooks/useAuth.ts
- [x] T027 [US1] Implement error display for invalid credentials in react/src/components/CredentialUpload.tsx
- [x] T028 [US1] Implement error display for connection failures in react/src/pages/AuthPage.tsx
- [x] T029 [US1] Add redirect to /dashboard on successful connection in react/src/pages/AuthPage.tsx

**Checkpoint**: User Story 1 functional - can authenticate with .creds file and reach dashboard ✅

---

## Phase 4: User Story 2 - Returning User Quick Authentication (Priority: P1)

**Goal**: Returning users with stored credentials reconnect automatically without re-uploading

**Independent Test**: Authenticate once, close browser, reopen app, verify auto-reconnection within 5 seconds

**Depends on**: US1 (credential parsing, connection service)

### Implementation for User Story 2

- [x] T030 [US2] Create IndexedDB storage service with Web Crypto encryption in react/src/services/credentials/storage.ts
- [x] T031 [US2] Implement storeCredential() with AES-256-GCM encryption in react/src/services/credentials/storage.ts
- [x] T032 [US2] Implement retrieveCredential() with decryption in react/src/services/credentials/storage.ts
- [x] T033 [US2] Implement hasStoredCredential() check in react/src/services/credentials/storage.ts
- [x] T034 [US2] Implement clearCredential() for secure deletion in react/src/services/credentials/storage.ts
- [x] T035 [US2] Add credential persistence after successful auth in react/src/hooks/useAuth.ts
- [x] T036 [US2] Create useNatsConnection hook for connection lifecycle in react/src/hooks/useNatsConnection.ts
- [x] T037 [US2] Add auto-connect on app load from stored credentials in react/src/components/AutoConnect.tsx
- [x] T038 [US2] Handle invalid stored credentials with re-auth prompt in react/src/hooks/useAuth.ts
- [x] T039 [US2] Implement reconnection with exponential backoff in react/src/services/nats/connection.ts (built into NATS client)

**Checkpoint**: User Stories 1 AND 2 functional - new and returning users can authenticate ✅

---

## Phase 5: User Story 3 - Accessing Public Pages (Priority: P2)

**Goal**: Any visitor can browse public pages without authenticating

**Independent Test**: Access / and /auth without credentials, verify content displays correctly

### Implementation for User Story 3

- [x] T040 [P] [US3] Create HomePage component with public content in react/src/pages/HomePage.tsx
- [x] T041 [P] [US3] Create navigation component for public/private links in react/src/components/Navigation.tsx
- [x] T042 [US3] Add public routes (/, /auth) to App router in react/src/App.tsx
- [x] T043 [US3] Style HomePage with Tailwind CSS in react/src/pages/HomePage.tsx
- [x] T044 [US3] Add "Connect with NATS" CTA on HomePage in react/src/pages/HomePage.tsx

**Checkpoint**: Public pages accessible without authentication ✅

---

## Phase 6: User Story 4 - Accessing Private Pages (Priority: P2)

**Goal**: Authenticated users can access protected pages; unauthenticated users are redirected

**Independent Test**: Access /dashboard without auth (redirected), with auth (content shown)

**Depends on**: US1 (authentication flow)

### Implementation for User Story 4

- [x] T045 [US4] Create ProtectedRoute component with auth check in react/src/components/ProtectedRoute.tsx
- [x] T046 [US4] Create DashboardPage with protected content in react/src/pages/DashboardPage.tsx
- [x] T047 [US4] Add private routes with ProtectedRoute wrapper in react/src/App.tsx
- [x] T048 [US4] Implement redirect to /auth for unauthenticated access in react/src/components/ProtectedRoute.tsx
- [x] T049 [US4] Handle connection drop on private page (show reconnecting state) in react/src/components/ProtectedRoute.tsx
- [x] T050 [US4] Style DashboardPage with Tailwind CSS in react/src/pages/DashboardPage.tsx

**Checkpoint**: Route protection working - private pages require active NATS connection ✅

---

## Phase 7: User Story 5 - User Disconnect (Logout) (Priority: P2)

**Goal**: Users can disconnect, clearing credentials and returning to public state

**Independent Test**: Authenticate, click disconnect, verify connection closed, credentials cleared, redirected to public page

**Depends on**: US1, US2 (credential storage)

### Implementation for User Story 5

- [x] T051 [US5] Add disconnect() function to NATS connection service in react/src/services/nats/connection.ts
- [x] T052 [US5] Add CLEAR_CREDENTIAL action to AuthContext reducer in react/src/contexts/AuthContext.tsx
- [x] T053 [US5] Create disconnect handler in useAuth hook in react/src/hooks/useAuth.ts
- [x] T054 [US5] Add disconnect button to Navigation component in react/src/components/Navigation.tsx
- [x] T055 [US5] Clear IndexedDB credentials on disconnect in react/src/hooks/useAuth.ts
- [x] T056 [US5] Redirect to home page after disconnect in react/src/components/Navigation.tsx
- [x] T057 [US5] Prevent back-button access to private pages after disconnect in react/src/components/ProtectedRoute.tsx

**Checkpoint**: Logout flow complete - disconnect clears all state and protects private content ✅

---

## Phase 8: User Story 6 - Connection State Visibility (Priority: P3)

**Goal**: Users see real-time connection status; state syncs across browser tabs

**Independent Test**: Monitor UI during connect/disconnect/reconnect; open multiple tabs and verify state syncs

**Depends on**: US1, US4 (connection and protected routes)

### Implementation for User Story 6

- [x] T058 [US6] Create ConnectionStatus component with status indicator in react/src/components/ConnectionStatus.tsx
- [x] T059 [US6] Style connection states (connecting, connected, reconnecting, disconnected) in react/src/components/ConnectionStatus.tsx
- [x] T060 [US6] Add ConnectionStatus to Navigation for authenticated users in react/src/components/Navigation.tsx
- [x] T061 [US6] Create tab sync service with BroadcastChannel in react/src/services/sync/tabSync.ts
- [x] T062 [US6] Create useConnectionSync hook for tab synchronization in react/src/hooks/useConnectionSync.ts
- [x] T063 [US6] Integrate tab sync with AuthContext in react/src/contexts/AuthContext.tsx
- [x] T064 [US6] Add localStorage fallback for Safari < 15.1 in react/src/services/sync/tabSync.ts
- [x] T065 [US6] Handle connection state events from NATS client in react/src/services/nats/connection.ts

**Checkpoint**: Connection visibility complete - status shown and synced across tabs ✅

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T066 [P] Add loading spinners for async operations in react/src/components/
- [x] T067 [P] Ensure consistent error message styling across components
- [x] T068 [P] Add keyboard accessibility to CredentialUpload component in react/src/components/CredentialUpload.tsx
- [x] T069 Verify SC-007: Run local with 3 commands (npm install, configure .env, npm run dev)
- [x] T070 [P] Add responsive design for mobile viewports in react/src/
- [x] T071 Final code cleanup and remove any console.log statements
- [x] T072 Validate all acceptance scenarios from spec.md manually

**Checkpoint**: All tasks complete - React NATS Authentication Boilerplate ready for use ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 + US2: Can proceed after Foundational (P1 stories)
  - US3: Can proceed after Foundational (independent of auth)
  - US4: Depends on US1 (needs auth to test)
  - US5: Depends on US1 + US2 (needs stored credentials)
  - US6: Depends on US1 + US4 (needs connection to show status)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
    ├─→ US1 (P1): First-Time Auth ─────────────┐
    │       ↓                                   │
    │   US2 (P1): Returning User ←──────────────┤
    │                                           │
    ├─→ US3 (P2): Public Pages (independent)    │
    │                                           │
    └─→ US4 (P2): Private Pages ←───────────────┤
            ↓                                   │
        US5 (P2): Disconnect ←──────────────────┤
            ↓                                   │
        US6 (P3): Connection Visibility ←───────┘
    ↓
Phase 9: Polish
```

### Within Each User Story

- Models/Types before services
- Services before hooks
- Hooks before components
- Components before pages
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- Within US3: T040 and T041 can run in parallel (different files)
- US3 can proceed in parallel with US1/US2 (no auth dependency)
- Test tasks (if added later) can run in parallel per story

---

## Parallel Example: Phase 1 Setup

```bash
# These can all run in parallel (different files):
T003: Install production dependencies
T004: Install dev dependencies
T005: Configure TypeScript
T006: Configure Tailwind CSS
T007: Configure PostCSS
T008: Configure Vite
T010: Configure ESLint/Prettier
```

## Parallel Example: Phase 2 Foundational

```bash
# These can all run in parallel (different files):
T011: Create TypeScript types
T012: Create error utilities
T013: Create credential parser
T015: Create NATS service types
T019: Create Tailwind styles
T020: Create index.html
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (first-time auth)
4. Complete Phase 4: User Story 2 (returning user)
5. **STOP and VALIDATE**: Test auth flow end-to-end
6. Deploy/demo if ready - users can authenticate!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Test authentication → **MVP Ready!**
3. Add US2 → Test persistence → Session management complete
4. Add US3 → Test public pages → Marketing ready
5. Add US4 → Test route protection → Full routing complete
6. Add US5 → Test logout → Security complete
7. Add US6 → Test status visibility → UX complete
8. Each story adds value without breaking previous stories

### Suggested MVP Scope

**Minimum Viable Product**: Complete through Phase 4 (US1 + US2)
- Users can authenticate with .creds file
- Credentials persist across sessions
- Basic navigation structure in place
- Estimated tasks: T001-T039 (39 tasks)

---

## Notes

- [P] tasks = different files, no dependencies within same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No test tasks included - add if TDD approach is requested

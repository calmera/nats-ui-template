# Contracts: Developer Documentation

**Feature**: 001-developer-docs
**Date**: 2026-01-20

## Overview

This feature is **documentation-only** and does not define new APIs or data contracts.

The documentation will describe existing APIs that are already implemented:

- **Hooks API**: `useAuth`, `useNatsConnection`, `useAppState`, `useCommand`, etc.
- **Contexts API**: `AuthContext`, `EventContext`, `ThemeContext`
- **Service API**: `NatsService`, `NatsEventService`, `NatsCommandService`
- **Type Definitions**: Credentials, Events, Commands, State

These existing APIs are documented in:
- `research.md` - Full API inventory
- `data-model.md` - Documentation structure specifications
- `quick-reference.md` (to be created) - Developer-facing API reference

## Existing API Locations

| API Category | Source Location | Documentation Target |
|--------------|-----------------|---------------------|
| Hooks | `react/src/hooks/` | `docs/quick-reference.md` |
| Contexts | `react/src/contexts/` | `docs/quick-reference.md` |
| Services | `react/src/services/nats/` | `docs/concepts/`, `docs/quick-reference.md` |
| Types | `react/src/types/` | `docs/quick-reference.md` |

## No New Contracts Needed

This directory is intentionally minimal because:
1. The feature creates documentation, not code
2. Existing APIs are already well-typed in TypeScript
3. NATS subject patterns are documented in `research.md`

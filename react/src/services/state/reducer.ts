/**
 * State Reducer for Event Processing
 *
 * Feature: 002-event-driven-state
 *
 * Applies events to the application state using immutable update patterns.
 */

import type { AppEvent } from "../../types/events";
import type { AppState } from "../../types/state";

/**
 * Applies an event to the application state, returning a new state.
 * This is a pure function with no side effects.
 *
 * @param state - Current application state
 * @param event - Event to apply
 * @returns New application state
 */
export function appStateReducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case "user.updated":
      if (!state.user || state.user.id !== event.payload.id) {
        return state;
      }
      return {
        ...state,
        user: { ...state.user, ...event.payload.changes },
      };

    case "session.created":
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [event.payload.id]: event.payload,
        },
      };

    case "session.expired": {
      const { [event.payload.sessionId]: _removed, ...remainingSessions } = state.sessions;
      void _removed; // Intentionally unused - destructuring to remove from object
      return {
        ...state,
        sessions: remainingSessions,
      };
    }

    case "notification.received":
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [event.payload.id]: event.payload,
        },
      };

    case "notification.read": {
      const notification = state.notifications[event.payload.notificationId];
      if (!notification) return state;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [event.payload.notificationId]: { ...notification, read: true },
        },
      };
    }

    case "notification.dismissed": {
      const notification = state.notifications[event.payload.notificationId];
      if (!notification) return state;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [event.payload.notificationId]: { ...notification, dismissed: true },
        },
      };
    }

    default:
      return state;
  }
}

/**
 * Type guard to check if an object is a valid AppEvent.
 */
export function isValidEvent(obj: unknown): obj is AppEvent {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const event = obj as Record<string, unknown>;

  if (typeof event.type !== "string" || typeof event.timestamp !== "number") {
    return false;
  }

  const validTypes = [
    "user.updated",
    "session.created",
    "session.expired",
    "notification.received",
    "notification.read",
    "notification.dismissed",
  ];

  return validTypes.includes(event.type);
}

/**
 * Safely parse and apply an event, logging errors for malformed events.
 *
 * @param state - Current application state
 * @param rawEvent - Raw event object (potentially malformed)
 * @returns New state if event is valid, original state otherwise
 */
export function safeApplyEvent(state: AppState, rawEvent: unknown): AppState {
  if (!isValidEvent(rawEvent)) {
    console.warn("Received malformed event:", rawEvent);
    return state;
  }

  try {
    return appStateReducer(state, rawEvent);
  } catch (error) {
    console.error("Error processing event:", error, rawEvent);
    return state;
  }
}

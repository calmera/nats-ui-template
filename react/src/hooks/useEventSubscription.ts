/**
 * useEventSubscription Hook
 *
 * Feature: 002-event-driven-state
 *
 * Allows components to listen for specific event types.
 */

import { useEffect, useRef, useCallback } from "react";
import type { AppEvent } from "../types/events";
import { getEventService } from "../services/nats/events";
import { getNatsService } from "../services/nats/connection";

// =============================================================================
// Types
// =============================================================================

export type EventType = AppEvent["type"];
export type EventHandler<T extends AppEvent = AppEvent> = (event: T) => void;

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to subscribe to specific event types.
 *
 * This is useful for showing toasts, playing sounds, or other side effects
 * when specific events occur.
 *
 * @example
 * ```tsx
 * function NotificationToast() {
 *   useEventSubscription('notification.received', (event) => {
 *     toast.info(event.payload.title);
 *   });
 *
 *   return null;
 * }
 * ```
 *
 * @param eventType - The event type to listen for
 * @param handler - Callback function when event is received
 */
export function useEventSubscription<T extends AppEvent>(
  eventType: T["type"],
  handler: EventHandler<T>
): void {
  const handlerRef = useRef(handler);

  // Update handler ref in effect to avoid ref updates during render
  useEffect(() => {
    handlerRef.current = handler;
  });

  const stableHandler = useCallback(
    (event: AppEvent) => {
      if (event.type === eventType) {
        handlerRef.current(event as T);
      }
    },
    [eventType]
  );

  useEffect(() => {
    const natsService = getNatsService();
    if (!natsService.isConnected()) {
      return;
    }

    const eventService = getEventService();
    let unsubscribe: (() => void) | undefined;

    const subscribe = async () => {
      try {
        unsubscribe = await eventService.subscribe(stableHandler);
      } catch (error) {
        console.error("Failed to subscribe to events:", error);
      }
    };

    subscribe();

    return () => {
      unsubscribe?.();
    };
  }, [stableHandler]);
}

/**
 * Hook to subscribe to multiple event types.
 *
 * @example
 * ```tsx
 * function EventLogger() {
 *   useEventSubscriptions({
 *     'notification.received': (event) => console.log('New notification:', event),
 *     'user.updated': (event) => console.log('User updated:', event),
 *   });
 *
 *   return null;
 * }
 * ```
 */
export function useEventSubscriptions(handlers: Partial<Record<EventType, EventHandler>>): void {
  const handlersRef = useRef(handlers);

  // Update handlers ref in effect to avoid ref updates during render
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const natsService = getNatsService();
    if (!natsService.isConnected()) {
      return;
    }

    const eventService = getEventService();
    let unsubscribe: (() => void) | undefined;

    const handleEvent = (event: AppEvent) => {
      const handler = handlersRef.current[event.type];
      if (handler) {
        handler(event);
      }
    };

    const subscribe = async () => {
      try {
        unsubscribe = await eventService.subscribe(handleEvent);
      } catch (error) {
        console.error("Failed to subscribe to events:", error);
      }
    };

    subscribe();

    return () => {
      unsubscribe?.();
    };
  }, []);
}

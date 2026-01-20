/**
 * NATS Subject Builder Utility
 *
 * Feature: 002-event-driven-state
 *
 * Provides type-safe subject generation for NATS events, commands, and state requests.
 */

export interface NatsSubjectConfig {
  namespace: string;
}

/**
 * Creates NATS subject builders for the given namespace.
 *
 * Subject pattern: `{namespace}.{category}.{domain}.{action}`
 *
 * @param namespace - The namespace prefix (default: 'app')
 * @returns Object with subject builders for events, commands, and state
 */
export const createSubjects = (namespace: string) => ({
  events: {
    /** Wildcard subscription for all events: `{namespace}.events.>` */
    all: `${namespace}.events.>`,
    user: {
      updated: `${namespace}.events.user.updated`,
    },
    session: {
      created: `${namespace}.events.session.created`,
      expired: `${namespace}.events.session.expired`,
    },
    notification: {
      received: `${namespace}.events.notification.received`,
      read: `${namespace}.events.notification.read`,
      dismissed: `${namespace}.events.notification.dismissed`,
    },
  },
  commands: {
    user: {
      updateProfile: `${namespace}.commands.user.updateProfile`,
    },
    notification: {
      dismiss: `${namespace}.commands.notification.dismiss`,
      markRead: `${namespace}.commands.notification.markRead`,
      markAllRead: `${namespace}.commands.notification.markAllRead`,
    },
  },
  state: {
    get: `${namespace}.state.get`,
  },
});

/** Type of the subjects object returned by createSubjects */
export type NatsSubjects = ReturnType<typeof createSubjects>;

/** Default namespace for NATS subjects */
export const DEFAULT_NAMESPACE = "app";

/** NATS system subjects for built-in endpoints */
export const NATS_SYSTEM_SUBJECTS = {
  userInfo: "$SYS.REQ.USER.INFO",
} as const;

/**
 * Gets the namespace from environment or uses default.
 */
export function getNamespace(): string {
  return import.meta.env.VITE_NATS_NAMESPACE || DEFAULT_NAMESPACE;
}

/**
 * Creates subjects using the configured namespace from environment.
 */
export function createDefaultSubjects(): NatsSubjects {
  return createSubjects(getNamespace());
}

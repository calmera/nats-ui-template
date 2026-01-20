/**
 * NATS Event Subscription Service
 *
 * Feature: 002-event-driven-state
 *
 * Handles subscribing to NATS event streams and processing incoming events.
 */

import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import type { AppEvent, GetStateResponse, NatsUserInfoResponse } from "../../types/events";
import { NATS_DEFAULTS } from "../../types/state";
import { createSubjects, getNamespace, NATS_SYSTEM_SUBJECTS } from "../../utils/subjects";
import { isValidEvent } from "../state/reducer";
import { getNatsService } from "./connection";

// =============================================================================
// Types
// =============================================================================

export type EventCallback = (event: AppEvent) => void;
export type StateLoadedCallback = (state: GetStateResponse) => void;
export type ErrorCallback = (error: Error) => void;

export interface EventServiceConfig {
  namespace?: string;
  stateTimeoutMs?: number;
}

export interface EventService {
  subscribe(onEvent: EventCallback, onError?: ErrorCallback): Promise<() => void>;
  fetchInitialState(): Promise<GetStateResponse>;
  isSubscribed(): boolean;
}

// =============================================================================
// Event Service Implementation
// =============================================================================

// Simple JSON codec since @nats-io/nats-core v3.x doesn't export JSONCodec
const jsonCodec = {
  encode: <T>(data: T): Uint8Array => new TextEncoder().encode(JSON.stringify(data)),
  decode: <T>(data: Uint8Array): T => JSON.parse(new TextDecoder().decode(data)) as T,
};

class NatsEventService implements EventService {
  private subscription: Subscription | null = null;
  private readonly namespace: string;
  private readonly subjects: ReturnType<typeof createSubjects>;
  private readonly codec = jsonCodec;
  private readonly stateTimeoutMs: number;

  constructor(config: EventServiceConfig = {}) {
    this.namespace = config.namespace || getNamespace();
    this.subjects = createSubjects(this.namespace);
    this.stateTimeoutMs = config.stateTimeoutMs || NATS_DEFAULTS.STATE_FETCH_TIMEOUT_MS;
  }

  private getConnection(): NatsConnection {
    const service = getNatsService();
    if (!service.connection) {
      throw new Error("Not connected to NATS");
    }
    return service.connection;
  }

  /**
   * Subscribe to all events on the configured namespace.
   *
   * @param onEvent - Callback for each received event
   * @param onError - Optional callback for errors
   * @returns Unsubscribe function
   */
  async subscribe(onEvent: EventCallback, onError?: ErrorCallback): Promise<() => void> {
    const connection = this.getConnection();

    // Unsubscribe from existing subscription if any
    await this.unsubscribe();

    try {
      this.subscription = connection.subscribe(this.subjects.events.all);

      // Start processing messages asynchronously
      this.processMessages(onEvent, onError);

      return () => {
        this.unsubscribe();
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Subscription failed");
      onError?.(err);
      throw err;
    }
  }

  /**
   * Fetch the initial state using $SYS.REQ.USER.INFO.
   *
   * This uses the built-in NATS system endpoint to get server and user information,
   * creating a self-contained demo that works without a backend service.
   */
  async fetchInitialState(): Promise<GetStateResponse> {
    const connection = this.getConnection();

    try {
      const response = await connection.request(
        NATS_SYSTEM_SUBJECTS.userInfo,
        new Uint8Array(),
        { timeout: this.stateTimeoutMs }
      );

      const info = this.codec.decode(response.data) as NatsUserInfoResponse;

      return {
        user: {
          id: info.data.user,
          email: `${info.data.user.slice(0, 8)}...@nats`,
          name: info.server.name,
          account: info.data.account,
          server: info.server.name,
          cluster: info.server.cluster,
          jetstream: info.server.jetstream,
          updatedAt: Date.now(),
        },
        sessions: [],
        notifications: [],
        serverTime: new Date(info.server.time).getTime(),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        throw new Error("NATS server not responding");
      }
      throw error;
    }
  }

  /**
   * Check if currently subscribed to events.
   */
  isSubscribed(): boolean {
    return this.subscription !== null && !this.subscription.isClosed();
  }

  /**
   * Process incoming messages from the subscription.
   */
  private async processMessages(onEvent: EventCallback, onError?: ErrorCallback): Promise<void> {
    if (!this.subscription) return;

    try {
      for await (const msg of this.subscription) {
        try {
          const event = this.codec.decode(msg.data);

          if (isValidEvent(event)) {
            onEvent(event);
          } else {
            console.warn("Received invalid event:", event);
          }
        } catch (decodeError) {
          console.error("Error decoding event:", decodeError);
        }
      }
    } catch (error) {
      // Subscription ended or error occurred
      if (!this.subscription?.isClosed()) {
        const err = error instanceof Error ? error : new Error("Subscription error");
        onError?.(err);
      }
    }
  }

  /**
   * Unsubscribe from events.
   */
  private async unsubscribe(): Promise<void> {
    if (this.subscription && !this.subscription.isClosed()) {
      try {
        await this.subscription.drain();
      } catch {
        // Ignore drain errors
      }
      this.subscription = null;
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

let eventServiceInstance: NatsEventService | null = null;

/**
 * Get the event service singleton instance.
 */
export function getEventService(config?: EventServiceConfig): EventService {
  if (!eventServiceInstance) {
    eventServiceInstance = new NatsEventService(config);
  }
  return eventServiceInstance;
}

/**
 * Reset the event service (for testing purposes).
 */
export function resetEventService(): void {
  eventServiceInstance = null;
}

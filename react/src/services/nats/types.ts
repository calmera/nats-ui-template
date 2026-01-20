import type { NatsConnection } from "@nats-io/nats-core";
import type { ConnectionStatus, ConnectionError, Credential } from "@/types";

/**
 * Connection event types emitted by the NATS service
 */
export type NatsEventType =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "reconnected"
  | "error"
  | "closed";

/**
 * Event payload for connection events
 */
export interface NatsEvent {
  type: NatsEventType;
  timestamp: number;
  reconnectAttempt?: number;
  error?: ConnectionError;
}

/**
 * Callback for connection events
 */
export type NatsEventCallback = (event: NatsEvent) => void;

/**
 * NATS service interface
 */
export interface INatsService {
  /** Current connection status */
  readonly status: ConnectionStatus;

  /** The active NATS connection (null if disconnected) */
  readonly connection: NatsConnection | null;

  /** Connect to NATS server */
  connect(credential: Credential, serverUrl: string): Promise<void>;

  /** Disconnect from NATS server */
  disconnect(): Promise<void>;

  /** Subscribe to connection events */
  onEvent(callback: NatsEventCallback): () => void;

  /** Check if connected */
  isConnected(): boolean;
}

/**
 * Connection configuration options
 */
export interface NatsServiceConfig {
  /** Connection timeout in ms (default: 20000) */
  timeout?: number;
  /** Enable automatic reconnection (default: true) */
  reconnect?: boolean;
  /** Max reconnection attempts, -1 for unlimited (default: -1) */
  maxReconnectAttempts?: number;
  /** Initial reconnect wait time in ms (default: 2000) */
  reconnectTimeWait?: number;
  /** Ping interval in ms (default: 120000) */
  pingInterval?: number;
  /** Max outstanding pings before connection is considered stale (default: 2) */
  maxPingOut?: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_NATS_CONFIG: Required<NatsServiceConfig> = {
  timeout: 20000,
  reconnect: true,
  maxReconnectAttempts: -1,
  reconnectTimeWait: 2000,
  pingInterval: 120000,
  maxPingOut: 2,
};

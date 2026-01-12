import { wsconnect, credsAuthenticator } from "@nats-io/nats-core";
import type { NatsConnection, Status } from "@nats-io/nats-core";
import type { ConnectionStatus } from "@/types";
import { createConnectionError, createErrorFromUnknown } from "@/utils/errors";
import type { INatsService, NatsEventCallback, NatsEvent, NatsServiceConfig } from "./types";
import { DEFAULT_NATS_CONFIG } from "./types";

/**
 * NATS connection service
 * Manages WebSocket connection to NATS server with credential-based authentication
 */
class NatsService implements INatsService {
  private _connection: NatsConnection | null = null;
  private _status: ConnectionStatus = "disconnected";
  private _eventListeners: Set<NatsEventCallback> = new Set();
  private _statusIteratorAbort: AbortController | null = null;
  private _config: Required<NatsServiceConfig>;

  constructor(config: NatsServiceConfig = {}) {
    this._config = { ...DEFAULT_NATS_CONFIG, ...config };
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get connection(): NatsConnection | null {
    return this._connection;
  }

  isConnected(): boolean {
    return this._status === "connected";
  }

  /**
   * Connect to NATS server with credentials
   */
  async connect(credsBytes: Uint8Array, serverUrl: string): Promise<void> {
    // Don't reconnect if already connected to same server
    if (this._status === "connected" && this._connection) {
      return;
    }

    // Disconnect existing connection if any
    if (this._connection) {
      await this.disconnect();
    }

    this._setStatus("connecting");
    this._emitEvent({ type: "connecting", timestamp: Date.now() });

    try {
      this._connection = await wsconnect({
        servers: serverUrl,
        authenticator: credsAuthenticator(credsBytes),
        timeout: this._config.timeout,
        reconnect: this._config.reconnect,
        maxReconnectAttempts: this._config.maxReconnectAttempts,
        reconnectTimeWait: this._config.reconnectTimeWait,
        pingInterval: this._config.pingInterval,
        maxPingOut: this._config.maxPingOut,
      });

      this._setStatus("connected");
      this._emitEvent({ type: "connected", timestamp: Date.now() });

      // Start listening to connection status events
      this._startStatusListener();
    } catch (error) {
      this._setStatus("failed");
      const connectionError = createErrorFromUnknown(error);
      this._emitEvent({
        type: "error",
        timestamp: Date.now(),
        error: connectionError,
      });
      throw connectionError;
    }
  }

  /**
   * Disconnect from NATS server
   */
  async disconnect(): Promise<void> {
    // Stop status listener
    if (this._statusIteratorAbort) {
      this._statusIteratorAbort.abort();
      this._statusIteratorAbort = null;
    }

    if (this._connection) {
      try {
        await this._connection.drain();
      } catch {
        // Ignore drain errors
      }

      try {
        await this._connection.close();
      } catch {
        // Ignore close errors
      }

      this._connection = null;
    }

    this._setStatus("disconnected");
    this._emitEvent({ type: "disconnected", timestamp: Date.now() });
  }

  /**
   * Subscribe to connection events
   */
  onEvent(callback: NatsEventCallback): () => void {
    this._eventListeners.add(callback);
    return () => {
      this._eventListeners.delete(callback);
    };
  }

  /**
   * Start listening to NATS connection status events
   */
  private async _startStatusListener(): Promise<void> {
    if (!this._connection) return;

    this._statusIteratorAbort = new AbortController();

    try {
      let reconnectAttempt = 0;

      for await (const status of this._connection.status()) {
        if (this._statusIteratorAbort?.signal.aborted) {
          break;
        }

        this._handleStatusEvent(status, reconnectAttempt);

        // Update reconnect attempt counter
        if (status.type === "reconnecting") {
          reconnectAttempt++;
        } else if (status.type === "reconnect") {
          reconnectAttempt = 0;
        }
      }
    } catch {
      // Status iterator ended
    }
  }

  /**
   * Handle a status event from the NATS connection
   */
  private _handleStatusEvent(status: Status, reconnectAttempt: number): void {
    switch (status.type) {
      case "disconnect":
        this._setStatus("reconnecting");
        this._emitEvent({
          type: "disconnected",
          timestamp: Date.now(),
        });
        break;

      case "reconnect":
        this._setStatus("connected");
        this._emitEvent({
          type: "reconnected",
          timestamp: Date.now(),
        });
        break;

      case "reconnecting":
        if (this._status !== "reconnecting") {
          this._setStatus("reconnecting");
        }
        this._emitEvent({
          type: "reconnecting",
          timestamp: Date.now(),
          reconnectAttempt: reconnectAttempt + 1,
        });
        break;

      case "update":
        // Server update event - cluster topology change
        break;

      case "error": {
        const error = createConnectionError(
          "SERVER_ERROR",
          status.error instanceof Error ? status.error.message : "Unknown server error"
        );
        this._emitEvent({
          type: "error",
          timestamp: Date.now(),
          error,
        });
        break;
      }

      case "ldm":
        // Lame Duck Mode - server is shutting down gracefully
        this._setStatus("reconnecting");
        this._emitEvent({
          type: "reconnecting",
          timestamp: Date.now(),
        });
        break;

      case "ping":
        // Client ping event
        break;

      case "staleConnection":
        // Connection is stale
        this._setStatus("reconnecting");
        this._emitEvent({
          type: "reconnecting",
          timestamp: Date.now(),
        });
        break;

      case "slowConsumer":
        // Slow consumer warning
        break;

      case "forceReconnect":
        // Force reconnect event
        this._setStatus("reconnecting");
        this._emitEvent({
          type: "reconnecting",
          timestamp: Date.now(),
        });
        break;

      case "close":
        // Connection closed
        this._setStatus("disconnected");
        this._emitEvent({
          type: "closed",
          timestamp: Date.now(),
        });
        break;
    }
  }

  private _setStatus(status: ConnectionStatus): void {
    this._status = status;
  }

  private _emitEvent(event: NatsEvent): void {
    for (const listener of this._eventListeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}

// Singleton instance
let natsServiceInstance: NatsService | null = null;

/**
 * Get the NATS service singleton instance
 */
export function getNatsService(config?: NatsServiceConfig): INatsService {
  if (!natsServiceInstance) {
    natsServiceInstance = new NatsService(config);
  }
  return natsServiceInstance;
}

/**
 * Reset the NATS service (for testing purposes)
 */
export async function resetNatsService(): Promise<void> {
  if (natsServiceInstance) {
    await natsServiceInstance.disconnect();
    natsServiceInstance = null;
  }
}

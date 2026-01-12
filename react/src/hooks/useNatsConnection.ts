import { useEffect, useCallback, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getNatsService } from "@/services/nats/connection";
import type { NatsEvent } from "@/services/nats/types";
import type { ConnectionStatus } from "@/types";

/**
 * Hook for managing NATS connection lifecycle
 */
export function useNatsConnection() {
  const { state, setConnected, setReconnecting, setDisconnected, setFailed } = useAuthContext();
  const [lastEvent, setLastEvent] = useState<NatsEvent | null>(null);

  // Subscribe to NATS connection events
  useEffect(() => {
    const natsService = getNatsService();

    const unsubscribe = natsService.onEvent((event) => {
      setLastEvent(event);

      switch (event.type) {
        case "connected":
        case "reconnected":
          if (state.connection.serverUrl) {
            setConnected(state.connection.serverUrl);
          }
          break;

        case "reconnecting":
          setReconnecting(event.reconnectAttempt || 0);
          break;

        case "disconnected":
          // Don't set to disconnected if we're reconnecting
          if (state.connection.status !== "reconnecting") {
            setDisconnected();
          }
          break;

        case "closed":
          setDisconnected();
          break;

        case "error":
          if (event.error) {
            setFailed(event.error);
          }
          break;
      }
    });

    return unsubscribe;
  }, [state.connection.serverUrl, state.connection.status, setConnected, setReconnecting, setDisconnected, setFailed]);

  /**
   * Get the current connection status
   */
  const getConnectionStatus = useCallback((): ConnectionStatus => {
    return getNatsService().status;
  }, []);

  /**
   * Check if currently connected
   */
  const isConnected = useCallback((): boolean => {
    return getNatsService().isConnected();
  }, []);

  /**
   * Get the underlying NATS connection
   * Useful for publishing/subscribing to messages
   */
  const getConnection = useCallback(() => {
    return getNatsService().connection;
  }, []);

  return {
    // State from context
    status: state.connection.status,
    serverUrl: state.connection.serverUrl,
    connectedAt: state.connection.connectedAt,
    reconnectAttempt: state.connection.reconnectAttempt,
    error: state.connection.lastError,

    // Last event
    lastEvent,

    // Methods
    getConnectionStatus,
    isConnected,
    getConnection,
  };
}

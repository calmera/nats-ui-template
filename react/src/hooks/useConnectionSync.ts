import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getTabSyncService } from "@/services/sync/tabSync";
import type { TabSyncMessage, ConnectionStatus } from "@/types";

/**
 * Hook for cross-tab connection state synchronization
 */
export function useConnectionSync() {
  const { state, setDisconnected, clearCredential } = useAuthContext();
  const { tabId } = state;

  // Use refs to access current state in callbacks without causing re-renders
  const stateRef = useRef(state);

  // Update ref in effect to avoid modifying during render
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Broadcast state change to other tabs
  const broadcastState = useCallback(
    (status: ConnectionStatus, hasCredential: boolean) => {
      const tabSync = getTabSyncService(tabId);
      tabSync.send("CONNECTION_STATE_CHANGED", {
        connectionStatus: status,
        hasCredential,
      });
    },
    [tabId]
  );

  // Handle incoming sync messages
  const handleSyncMessage = useCallback(
    (message: TabSyncMessage) => {
      switch (message.type) {
        case "CREDENTIAL_LOADED":
          // Another tab loaded credentials - no action needed
          // Each tab manages its own connection
          break;

        case "CREDENTIAL_CLEARED":
          // Another tab cleared credentials - sync the logout
          clearCredential();
          break;

        case "CONNECTION_STATE_CHANGED":
          if (message.payload.connectionStatus) {
            // Update local state to match remote
            if (message.payload.connectionStatus === "disconnected") {
              setDisconnected();
            }
          }
          break;

        case "REQUEST_STATE":
          // Another tab is requesting current state
          // Send our current state using ref to get latest value
          broadcastState(stateRef.current.connection.status, !!stateRef.current.credential);
          break;
      }
    },
    [clearCredential, setDisconnected, broadcastState]
  );

  // Broadcast credential loaded
  const broadcastCredentialLoaded = useCallback(() => {
    const tabSync = getTabSyncService(tabId);
    tabSync.send("CREDENTIAL_LOADED", {
      hasCredential: true,
    });
  }, [tabId]);

  // Broadcast credential cleared
  const broadcastCredentialCleared = useCallback(() => {
    const tabSync = getTabSyncService(tabId);
    tabSync.send("CREDENTIAL_CLEARED", {
      hasCredential: false,
      connectionStatus: "disconnected",
    });
  }, [tabId]);

  // Subscribe to sync messages
  useEffect(() => {
    const tabSync = getTabSyncService(tabId);
    const unsubscribe = tabSync.subscribe(handleSyncMessage);

    // Request state from other tabs when this tab opens
    tabSync.requestState();

    return unsubscribe;
  }, [tabId, handleSyncMessage]);

  // Broadcast connection state changes
  useEffect(() => {
    broadcastState(state.connection.status, !!state.credential);
  }, [state.connection.status, state.credential, broadcastState]);

  return {
    tabId,
    broadcastCredentialLoaded,
    broadcastCredentialCleared,
    broadcastState,
  };
}

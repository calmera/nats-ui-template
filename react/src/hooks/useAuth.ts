import { useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getNatsService } from "@/services/nats/connection";
import { parseCredentialFile } from "@/services/credentials/parser";
import { getCredentialStorage } from "@/services/credentials/storage";
import type { Credential, ConnectionError } from "@/types";

/**
 * Hook for authentication operations
 */
export function useAuth() {
  const {
    state,
    derived,
    loadCredential,
    loadCredentialError,
    setConnecting,
    setConnected,
    setFailed,
    setAuthCheckComplete,
    clearCredential,
  } = useAuthContext();

  /**
   * Authenticate with a credential file
   */
  const authenticateWithFile = useCallback(
    async (file: File, serverUrl: string, persistCredential = true): Promise<boolean> => {
      // Parse credential file
      const parseResult = await parseCredentialFile(file);

      if (!parseResult.success) {
        loadCredentialError(parseResult.error);
        return false;
      }

      loadCredential(parseResult.credential);

      // Connect to NATS
      setConnecting();

      try {
        const natsService = getNatsService();
        await natsService.connect(parseResult.credential, serverUrl);

        setConnected(serverUrl);

        // Persist credential for returning user authentication
        if (persistCredential) {
          const storage = getCredentialStorage();
          await storage.storeCredential(parseResult.credential, serverUrl);
        }

        return true;
      } catch (error) {
        const connError = error as ConnectionError;
        setFailed(connError);
        return false;
      }
    },
    [loadCredential, loadCredentialError, setConnecting, setConnected, setFailed]
  );

  /**
   * Authenticate with an already-parsed credential
   */
  const authenticateWithCredential = useCallback(
    async (credential: Credential, serverUrl: string, persistCredential = true): Promise<boolean> => {
      loadCredential(credential);
      setConnecting();

      try {
        const natsService = getNatsService();
        await natsService.connect(credential, serverUrl);
        setConnected(serverUrl);

        // Persist credential for returning user authentication
        if (persistCredential) {
          const storage = getCredentialStorage();
          await storage.storeCredential(credential, serverUrl);
        }

        return true;
      } catch (error) {
        const connError = error as ConnectionError;
        setFailed(connError);
        return false;
      }
    },
    [loadCredential, setConnecting, setConnected, setFailed]
  );

  /**
   * Authenticate with stored credentials (for returning users)
   */
  const authenticateWithStoredCredentials = useCallback(async (): Promise<boolean> => {
    const storage = getCredentialStorage();

    // Check if we have stored credentials
    const meta = await storage.getStoredCredentialMeta();
    if (!meta) {
      return false;
    }

    // Retrieve and decrypt credentials
    const credential = await storage.retrieveCredential(meta.id);
    if (!credential) {
      // Failed to decrypt - clear corrupted credential
      await storage.clearCredential(meta.id);
      return false;
    }

    loadCredential(credential);

    // Connect to NATS
    setConnecting();

    try {
      const natsService = getNatsService();
      await natsService.connect(credential, meta.serverUrl);

      setConnected(meta.serverUrl);
      return true;
    } catch (error) {
      const connError = error as ConnectionError;
      setFailed(connError);
      return false;
    }
  }, [loadCredential, setConnecting, setConnected, setFailed]);

  /**
   * Check if stored credentials exist
   */
  const hasStoredCredentials = useCallback(async (): Promise<boolean> => {
    const storage = getCredentialStorage();
    return storage.hasStoredCredential();
  }, []);

  /**
   * Disconnect and optionally clear credentials
   */
  const disconnect = useCallback(
    async (clearStoredCredentials = true): Promise<void> => {
      const natsService = getNatsService();
      await natsService.disconnect();

      // Clear stored credentials if requested
      if (clearStoredCredentials && state.credential) {
        const storage = getCredentialStorage();
        await storage.clearCredential(state.credential.id);
      }

      clearCredential();
    },
    [clearCredential, state.credential]
  );

  return {
    // State
    credential: state.credential,
    credentialStatus: state.credentialStatus,
    connectionStatus: state.connection.status,
    connectionError: state.connection.lastError,
    serverUrl: state.connection.serverUrl,
    authCheckComplete: state.authCheckComplete,

    // Derived state
    isAuthenticated: derived.isAuthenticated,
    isLoading: derived.isLoading,
    canAccessPrivate: derived.canAccessPrivate,

    // Actions
    authenticateWithFile,
    authenticateWithCredential,
    authenticateWithStoredCredentials,
    hasStoredCredentials,
    disconnect,
    setAuthCheckComplete,
  };
}

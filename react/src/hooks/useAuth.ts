import { useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getNatsService } from "@/services/nats/connection";
import { parseCredentialFile, parseCredentials, getCredentialBytes } from "@/services/credentials/parser";
import { getCredentialStorage } from "@/services/credentials/storage";
import type { ConnectionError, Credential } from "@/types";

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
    clearCredential,
  } = useAuthContext();

  /**
   * Reconstruct credential content for storage
   */
  const reconstructCredsContent = (credential: Credential): string => {
    return `-----BEGIN NATS USER JWT-----
${credential.jwt}
------END NATS USER JWT------

-----BEGIN USER NKEY SEED-----
${new TextDecoder().decode(credential.seed)}
------END USER NKEY SEED------
`;
  };

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
        const credsBytes = getCredentialBytes(parseResult.credential);
        await natsService.connect(credsBytes, serverUrl);

        setConnected(serverUrl);

        // Persist credential for returning user authentication
        if (persistCredential) {
          const storage = getCredentialStorage();
          const credsContent = reconstructCredsContent(parseResult.credential);
          await storage.storeCredential(parseResult.credential.id, credsContent, serverUrl);
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
    const credsContent = await storage.retrieveCredential(meta.id);
    if (!credsContent) {
      // Failed to decrypt - clear corrupted credential
      await storage.clearCredential(meta.id);
      return false;
    }

    // Parse the decrypted credentials
    const parseResult = parseCredentials(credsContent);
    if (!parseResult.success) {
      // Invalid credentials - clear
      await storage.clearCredential(meta.id);
      return false;
    }

    // Mark credential as loaded from storage
    const credential: Credential = {
      ...parseResult.credential,
      source: "storage",
    };

    loadCredential(credential);

    // Connect to NATS
    setConnecting();

    try {
      const natsService = getNatsService();
      const credsBytes = getCredentialBytes(credential);
      await natsService.connect(credsBytes, meta.serverUrl);

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

    // Derived state
    isAuthenticated: derived.isAuthenticated,
    isLoading: derived.isLoading,
    canAccessPrivate: derived.canAccessPrivate,

    // Actions
    authenticateWithFile,
    authenticateWithStoredCredentials,
    hasStoredCredentials,
    disconnect,
  };
}

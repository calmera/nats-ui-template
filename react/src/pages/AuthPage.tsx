import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CredentialUpload } from "@/components/CredentialUpload";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuthContext } from "@/contexts/AuthContext";
import { getNatsService } from "@/services/nats/connection";
import { getCredentialBytes } from "@/services/credentials/parser";
import type { Credential, ConnectionError } from "@/types";

/**
 * Authentication page with credential upload
 */
export function AuthPage() {
  const navigate = useNavigate();
  const {
    state,
    derived,
    loadCredential,
    loadCredentialError,
    setConnecting,
    setConnected,
    setFailed,
  } = useAuthContext();
  const [connectionError, setConnectionError] = useState<ConnectionError | null>(null);

  // Get NATS server URL from environment
  const serverUrl = import.meta.env.VITE_NATS_URL || "wss://localhost:9443";

  // Redirect if already connected
  useEffect(() => {
    if (derived.isAuthenticated) {
      navigate("/dashboard");
    }
  }, [derived.isAuthenticated, navigate]);

  const handleCredentialLoaded = async (credential: Credential) => {
    loadCredential(credential);
    setConnectionError(null);

    // Attempt to connect to NATS
    setConnecting();

    try {
      const natsService = getNatsService();
      const credsBytes = getCredentialBytes(credential);
      await natsService.connect(credsBytes, serverUrl);

      setConnected(serverUrl);
      navigate("/dashboard");
    } catch (error) {
      const connError = error as ConnectionError;
      setFailed(connError);
      setConnectionError(connError);
    }
  };

  const handleCredentialError = (error: ConnectionError) => {
    loadCredentialError(error);
    setConnectionError(error);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Connect to NATS</h1>
          <p className="mt-2 text-muted-foreground">
            Upload your .creds file to authenticate and connect to the NATS server.
          </p>
        </div>

        <CredentialUpload
          onCredentialLoaded={handleCredentialLoaded}
          onError={handleCredentialError}
          disabled={derived.isLoading}
        />

        {derived.isLoading && state.connection.status === "connecting" && (
          <LoadingSpinner size="sm" text="Connecting to NATS server..." className="mt-4" />
        )}

        {connectionError && state.connection.status === "failed" && (
          <div
            className="mt-4 rounded-md bg-destructive/10 p-4 border border-destructive/20"
            role="alert"
          >
            <h3 className="text-sm font-medium text-destructive">Connection Failed</h3>
            <p className="mt-1 text-sm text-destructive/80">{connectionError.userMessage}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Connecting to:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">{serverUrl}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export { AuthPage as default };

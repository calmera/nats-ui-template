import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CredentialUpload } from "@/components/CredentialUpload";
import { UserPassLogin } from "@/components/UserPassLogin";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { getAuthType } from "@/config/auth";
import type { Credential } from "@/types";

/**
 * Authentication page with credential upload or username/password login
 */
export function AuthPage() {
  const navigate = useNavigate();
  const {
    connectionStatus,
    connectionError,
    isAuthenticated,
    isLoading,
    authenticateWithCredential,
  } = useAuth();

  // Get configuration from environment
  const serverUrl = import.meta.env.VITE_NATS_URL || "wss://localhost:9443";
  const authType = getAuthType();

  // Redirect if already connected
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleCredentialLoaded = async (credential: Credential) => {
    const success = await authenticateWithCredential(credential, serverUrl);
    if (success) {
      navigate("/dashboard");
    }
  };

  // Error handling is managed by the useAuth hook
  // The connectionError state from the hook will be displayed
  const handleCredentialError = () => {};

  // Description text based on auth type
  const descriptionText =
    authType === "userpass"
      ? "Enter your username and password to authenticate and connect to the NATS server."
      : "Upload your .creds file to authenticate and connect to the NATS server.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Connect to NATS</h1>
          <p className="mt-2 text-muted-foreground">{descriptionText}</p>
        </div>

        {authType === "userpass" ? (
          <UserPassLogin
            onSubmit={handleCredentialLoaded}
            onError={handleCredentialError}
            disabled={isLoading}
          />
        ) : (
          <CredentialUpload
            onCredentialLoaded={handleCredentialLoaded}
            onError={handleCredentialError}
            disabled={isLoading}
          />
        )}

        {isLoading && connectionStatus === "connecting" && (
          <LoadingSpinner size="sm" text="Connecting to NATS server..." className="mt-4" />
        )}

        {connectionError && connectionStatus === "failed" && (
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

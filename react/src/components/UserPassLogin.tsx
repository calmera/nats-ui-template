import { useState, useCallback, type FormEvent } from "react";
import type { ConnectionError, UserPassCredential } from "@/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";

/**
 * Props for UserPassLogin component
 */
export interface UserPassLoginProps {
  /** Callback when credential is submitted */
  onSubmit: (credential: UserPassCredential) => void;
  /** Callback when error occurs */
  onError: (error: ConnectionError) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
}

/**
 * Generate a unique credential ID
 */
function generateCredentialId(): string {
  return crypto.randomUUID();
}

/**
 * Username/password login form component
 */
export function UserPassLogin({ onSubmit, onError, disabled }: UserPassLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Validate inputs
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        setError("Username is required");
        return;
      }
      if (!password) {
        setError("Password is required");
        return;
      }

      setError(null);
      setIsSubmitting(true);

      try {
        const credential: UserPassCredential = {
          authType: "userpass",
          id: generateCredentialId(),
          username: trimmedUsername,
          password,
          loadedAt: Date.now(),
          source: "form",
        };

        onSubmit(credential);
      } catch (err) {
        const connectionError: ConnectionError = {
          code: "UNKNOWN",
          message: err instanceof Error ? err.message : "Unknown error",
          userMessage: "An unexpected error occurred. Please try again.",
          timestamp: Date.now(),
          recoverable: true,
        };
        setError(connectionError.userMessage);
        onError(connectionError);
      } finally {
        setIsSubmitting(false);
      }
    },
    [username, password, onSubmit, onError]
  );

  const isFormDisabled = disabled || isSubmitting;

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isFormDisabled}
            autoComplete="username"
            className={`
              w-full rounded-md border px-3 py-2
              bg-card text-foreground placeholder-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
              ${isFormDisabled ? "cursor-not-allowed opacity-50" : "border-border"}
              ${error && !username.trim() ? "border-destructive" : "border-border"}
            `}
            placeholder="Enter your username"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isFormDisabled}
            autoComplete="current-password"
            className={`
              w-full rounded-md border px-3 py-2
              bg-card text-foreground placeholder-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
              ${isFormDisabled ? "cursor-not-allowed opacity-50" : "border-border"}
              ${error && !password ? "border-destructive" : "border-border"}
            `}
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={isFormDisabled}
          className={`
            w-full rounded-md px-4 py-2 font-medium
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
            ${
              isFormDisabled
                ? "cursor-not-allowed bg-primary/50 text-primary-foreground/50"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              Connecting...
            </span>
          ) : (
            "Connect"
          )}
        </button>
      </form>

      {error && (
        <div
          className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
}

export { UserPassLogin as default };

import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface AutoConnectProps {
  children: ReactNode;
}

/**
 * Component that attempts to auto-connect using stored credentials on app load
 *
 * Uses a ref-based approach to handle React 18 Strict Mode's double-mount behavior.
 * The ref is never reset, so Strict Mode's second mount skips the effect entirely.
 */
export function AutoConnect({ children }: AutoConnectProps) {
  const {
    authenticateWithStoredCredentials,
    hasStoredCredentials,
    authCheckComplete,
    setAuthCheckComplete,
  } = useAuth();

  // Track if we've run - never reset this ref (survives Strict Mode)
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function checkAndConnect() {
      try {
        const hasStored = await hasStoredCredentials();
        console.debug("[AutoConnect] Has stored credentials:", hasStored);

        if (hasStored) {
          console.debug("[AutoConnect] Attempting to connect with stored credentials");
          const success = await authenticateWithStoredCredentials();
          console.debug("[AutoConnect] Connection result:", success);
        }
      } catch (error) {
        console.error("[AutoConnect] Error:", error);
      } finally {
        // Always mark auth check as complete, regardless of outcome
        setAuthCheckComplete();
      }
    }

    checkAndConnect();
  }, [authenticateWithStoredCredentials, hasStoredCredentials, setAuthCheckComplete]);

  // Show loading state while checking credentials
  if (!authCheckComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="md" text="Checking credentials..." />
      </div>
    );
  }

  return <>{children}</>;
}

export { AutoConnect as default };

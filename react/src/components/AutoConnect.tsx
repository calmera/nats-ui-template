import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface AutoConnectProps {
  children: ReactNode;
}

/**
 * Component that attempts to auto-connect using stored credentials on app load
 */
export function AutoConnect({ children }: AutoConnectProps) {
  const { authenticateWithStoredCredentials, hasStoredCredentials, isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function attemptAutoConnect() {
      try {
        // Check if we have stored credentials
        const hasStored = await hasStoredCredentials();

        if (!hasStored) {
          if (mounted) setIsChecking(false);
          return;
        }

        // Attempt to connect with stored credentials
        await authenticateWithStoredCredentials();
      } catch {
        // Silently fail - user will need to re-authenticate
      } finally {
        if (mounted) setIsChecking(false);
      }
    }

    // Only attempt auto-connect if not already authenticated
    if (!isAuthenticated) {
      attemptAutoConnect();
    } else {
      setIsChecking(false);
    }

    return () => {
      mounted = false;
    };
  }, [authenticateWithStoredCredentials, hasStoredCredentials, isAuthenticated]);

  // Show loading state while checking for stored credentials
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="md" text="Checking for stored credentials..." />
      </div>
    );
  }

  return <>{children}</>;
}

export { AutoConnect as default };

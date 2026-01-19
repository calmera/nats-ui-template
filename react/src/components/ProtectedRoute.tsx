import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { ProtectedRouteProps } from "@/types";

/**
 * Protected route component that redirects unauthenticated users
 */
export function ProtectedRoute({ children, redirectTo = "/auth" }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, connectionStatus } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner
          size="md"
          text={connectionStatus === "reconnecting" ? "Reconnecting..." : "Loading..."}
        />
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL to redirect back after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Show reconnecting state
  if (connectionStatus === "reconnecting") {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 z-50 flex items-start justify-center bg-white/50 pt-20">
          <div className="flex items-center space-x-2 rounded-md bg-yellow-100 px-4 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
            <span className="text-sm font-medium text-yellow-800">Reconnecting to server...</span>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

export { ProtectedRoute as default };

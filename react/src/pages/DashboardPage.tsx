import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppState } from "@/hooks/useAppState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StateIndicator } from "@/components/StateIndicator";
import type { Notification, Session } from "@/types/events";

/**
 * Protected dashboard page showing connection info and materialized state
 */
export function DashboardPage() {
  const { credential, serverUrl, connectionStatus } = useAuth();
  const {
    user,
    isLoading,
    isStale,
    unreadNotificationCount,
    activeSessionCount,
    notificationList,
    activeSessionList,
    refreshState,
  } = useAppState();

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading state..." />
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="mt-2 text-muted-foreground">
              {user ? `Welcome back, ${user.name}!` : "You are connected to the NATS server."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <StateIndicator hideWhenSynced />
            {isStale && (
              <button
                onClick={refreshState}
                className="text-sm text-primary hover:text-primary/80 underline"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Connection Status Card */}
          <div className="rounded-lg bg-card p-6 shadow border border-border">
            <h2 className="text-lg font-medium text-card-foreground">Connection Status</h2>
            <div className="mt-4 space-y-3">
              <InfoRow
                label="Status"
                value={
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      connectionStatus === "connected"
                        ? "bg-success/10 text-success"
                        : connectionStatus === "reconnecting"
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {connectionStatus}
                  </span>
                }
              />
              <InfoRow label="Server" value={serverUrl || "Unknown"} />
            </div>
          </div>

          {/* Credential Info Card */}
          <div className="rounded-lg bg-card p-6 shadow border border-border">
            <h2 className="text-lg font-medium text-card-foreground">Credential Info</h2>
            <div className="mt-4 space-y-3">
              <InfoRow
                label="Public Key"
                value={
                  <code className="rounded bg-muted px-2 py-1 text-xs">
                    {credential?.publicKey?.slice(0, 20)}...
                  </code>
                }
              />
              <InfoRow
                label="Source"
                value={credential?.source === "storage" ? "Stored credential" : "File upload"}
              />
              <InfoRow
                label="Loaded"
                value={
                  credential?.loadedAt ? new Date(credential.loadedAt).toLocaleString() : "Unknown"
                }
              />
            </div>
          </div>

          {/* User Info Card */}
          {user && (
            <div className="rounded-lg bg-card p-6 shadow border border-border">
              <h2 className="text-lg font-medium text-card-foreground">User Profile</h2>
              <div className="mt-4 space-y-3">
                <InfoRow label="Name" value={user.name} />
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Updated" value={new Date(user.updatedAt).toLocaleString()} />
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Unread Notifications" value={unreadNotificationCount} color="info" />
          <StatCard label="Active Sessions" value={activeSessionCount} color="success" />
          <StatCard label="Total Notifications" value={notificationList.length} color="muted" />
          <StatCard label="All Sessions" value={activeSessionList.length} color="muted" />
        </div>

        {/* Notifications Section */}
        {notificationList.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Recent Notifications</h2>
            <div className="space-y-3">
              {notificationList.slice(0, 5).map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          </div>
        )}

        {/* Sessions Section */}
        {activeSessionList.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Active Sessions</h2>
            <div className="space-y-3">
              {activeSessionList.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </div>
        )}

        {/* Getting Started */}
        <div className="mt-8 rounded-lg bg-info/10 p-6 border border-info/20">
          <h2 className="text-lg font-medium text-info">Getting Started</h2>
          <p className="mt-2 text-info/80">
            Your NATS connection is active! The state is automatically synchronized via events. Use
            the <code className="rounded bg-info/20 px-1.5 py-0.5 text-sm">useAppState</code> hook
            to access the materialized state and{" "}
            <code className="rounded bg-info/20 px-1.5 py-0.5 text-sm">useCommand</code> to execute
            commands.
          </p>
        </div>
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: "info" | "success" | "warning" | "destructive" | "muted";
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses = {
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };

  return (
    <div className="rounded-lg bg-card p-4 shadow border border-border">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
}

function NotificationCard({ notification }: NotificationCardProps) {
  const typeColors = {
    info: "bg-info/10 border-info/20 text-info",
    success: "bg-success/10 border-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 text-warning",
    error: "bg-destructive/10 border-destructive/20 text-destructive",
  };

  return (
    <div
      className={`rounded-lg p-4 border ${typeColors[notification.type]} ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{notification.title}</h3>
          <p className="text-sm mt-1 opacity-80">{notification.message}</p>
        </div>
        <span className="text-xs opacity-60">
          {new Date(notification.createdAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: Session;
}

function SessionCard({ session }: SessionCardProps) {
  // Use state with effect to compute expiration to avoid Date.now() during render
  const [hoursLeft, setHoursLeft] = useState(0);

  useEffect(() => {
    const updateHours = () => {
      const expiresIn = session.expiresAt - Date.now();
      setHoursLeft(Math.round(expiresIn / (1000 * 60 * 60)));
    };
    updateHours();
    // Update every minute for accuracy
    const interval = setInterval(updateHours, 60000);
    return () => clearInterval(interval);
  }, [session.expiresAt]);

  return (
    <div className="rounded-lg bg-card p-4 shadow border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">{session.deviceInfo || "Unknown Device"}</p>
          <p className="text-sm text-muted-foreground">
            Last active: {new Date(session.lastActivityAt).toLocaleString()}
          </p>
        </div>
        <span className="text-sm text-muted-foreground">Expires in {hoursLeft}h</span>
      </div>
    </div>
  );
}

export { DashboardPage as default };

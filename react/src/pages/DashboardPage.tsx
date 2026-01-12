import { useAuth } from "@/hooks/useAuth";

/**
 * Protected dashboard page showing connection info
 */
export function DashboardPage() {
  const { credential, serverUrl, connectionStatus } = useAuth();

  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">You are connected to the NATS server.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Connection Status</h2>
            <div className="mt-4 space-y-3">
              <InfoRow
                label="Status"
                value={
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      connectionStatus === "connected"
                        ? "bg-green-100 text-green-800"
                        : connectionStatus === "reconnecting"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {connectionStatus}
                  </span>
                }
              />
              <InfoRow label="Server" value={serverUrl || "Unknown"} />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Credential Info</h2>
            <div className="mt-4 space-y-3">
              <InfoRow
                label="Public Key"
                value={
                  <code className="rounded bg-gray-100 px-2 py-1 text-xs">
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
                  credential?.loadedAt
                    ? new Date(credential.loadedAt).toLocaleString()
                    : "Unknown"
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h2 className="text-lg font-medium text-blue-900">Getting Started</h2>
          <p className="mt-2 text-blue-700">
            Your NATS connection is active! You can now use the connection to publish and subscribe
            to messages. Check out the{" "}
            <code className="rounded bg-blue-100 px-1.5 py-0.5 text-sm">useNatsConnection</code>{" "}
            hook to interact with NATS.
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
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export { DashboardPage as default };

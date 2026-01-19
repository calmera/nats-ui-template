import type { ConnectionStatusProps } from "@/types";

/**
 * Connection status indicator component
 */
export function ConnectionStatus({ status, className = "" }: ConnectionStatusProps) {
  const statusConfig = {
    disconnected: {
      color: "bg-gray-400",
      text: "Disconnected",
      pulse: false,
    },
    connecting: {
      color: "bg-yellow-400",
      text: "Connecting",
      pulse: true,
    },
    connected: {
      color: "bg-green-400",
      text: "Connected",
      pulse: false,
    },
    reconnecting: {
      color: "bg-yellow-400",
      text: "Reconnecting",
      pulse: true,
    },
    failed: {
      color: "bg-red-400",
      text: "Failed",
      pulse: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="relative flex h-3 w-3">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.color} opacity-75`}
          />
        )}
        <span className={`relative inline-flex h-3 w-3 rounded-full ${config.color}`} />
      </span>
      <span className="text-sm text-muted-foreground">{config.text}</span>
    </div>
  );
}

export { ConnectionStatus as default };

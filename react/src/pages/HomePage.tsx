import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Public home page with navigation to authentication
 */
export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">NATS Auth</span>
            <span className="block text-blue-600">Boilerplate</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-xl text-gray-500">
            A React boilerplate with secure NATS credential-based authentication. Connect to your
            NATS server using .creds files with WebSocket transport.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Connect with NATS
              </Link>
            )}
          </div>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-3">
          <FeatureCard
            title="Secure Authentication"
            description="Authenticate using NATS .creds files with NKey-based cryptographic signing. Your credentials are encrypted locally."
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
          />
          <FeatureCard
            title="WebSocket Connection"
            description="Real-time bidirectional communication with NATS servers via secure WebSocket connections."
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
          />
          <FeatureCard
            title="Session Persistence"
            description="Your credentials are securely stored locally, enabling quick reconnection when you return."
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"
                />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-100 text-blue-600">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-500">{description}</p>
    </div>
  );
}

export { HomePage as default };

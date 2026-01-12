import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ConnectionStatus } from "@/components/ConnectionStatus";

/**
 * Navigation component with public and private links
 */
export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, disconnect, connectionStatus } = useAuth();

  const handleDisconnect = async () => {
    await disconnect();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">NATS Auth</span>
            </Link>
            {/* Desktop navigation */}
            <div className="ml-10 hidden items-baseline space-x-4 md:flex">
              <NavLink to="/" active={isActive("/")}>
                Home
              </NavLink>
              {isAuthenticated && (
                <NavLink to="/dashboard" active={isActive("/dashboard")}>
                  Dashboard
                </NavLink>
              )}
            </div>
          </div>

          {/* Desktop right section */}
          <div className="hidden items-center space-x-4 md:flex">
            {isAuthenticated && <ConnectionStatus status={connectionStatus} />}
            {isAuthenticated ? (
              <button
                onClick={handleDisconnect}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Disconnect
              </button>
            ) : (
              <Link
                to="/auth"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Connect
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            {isAuthenticated && <ConnectionStatus status={connectionStatus} className="mr-2" />}
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-gray-200 md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            <MobileNavLink to="/" active={isActive("/")} onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </MobileNavLink>
            {isAuthenticated && (
              <MobileNavLink to="/dashboard" active={isActive("/dashboard")} onClick={() => setIsMobileMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
            )}
          </div>
          <div className="border-t border-gray-200 px-4 pb-3 pt-3">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleDisconnect();
                }}
                className="block w-full rounded-md bg-gray-100 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Disconnect
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Connect
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

interface NavLinkProps {
  to: string;
  active: boolean;
  children: React.ReactNode;
}

function NavLink({ to, active, children }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}

interface MobileNavLinkProps extends NavLinkProps {
  onClick: () => void;
}

function MobileNavLink({ to, active, children, onClick }: MobileNavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`block rounded-md px-3 py-2 text-base font-medium ${
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}

export { Navigation as default };

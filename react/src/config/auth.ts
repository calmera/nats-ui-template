import type { AuthType } from "@/types";

/**
 * Get the configured authentication type from environment variables.
 * Defaults to "credsfile" if not set or invalid.
 */
export function getAuthType(): AuthType {
  const authType = import.meta.env.VITE_AUTH_TYPE;
  return authType === "userpass" ? "userpass" : "credsfile";
}

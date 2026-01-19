import type { ConnectionError, ConnectionErrorCode } from "@/types";

/**
 * User-friendly error messages for each error code
 */
const ERROR_MESSAGES: Record<ConnectionErrorCode, string> = {
  INVALID_CREDENTIAL:
    "The credential file appears to be invalid. Please ensure you're uploading a valid NATS .creds file.",
  AUTH_FAILED:
    "Authentication failed. Your credentials may have expired or been revoked. Please contact your NATS administrator.",
  CONNECTION_REFUSED:
    "Unable to connect to the NATS server. Please check your network connection and try again.",
  CONNECTION_TIMEOUT:
    "Connection timed out. The server may be temporarily unavailable. Please try again.",
  PERMISSION_DENIED:
    "You don't have permission to perform this action. Please contact your administrator.",
  SERVER_ERROR: "The server encountered an error. Please try again later.",
  UNKNOWN: "An unexpected error occurred. Please try again or contact support.",
};

/**
 * Recoverable error codes that the system can auto-recover from
 */
const RECOVERABLE_ERRORS: ConnectionErrorCode[] = [
  "CONNECTION_REFUSED",
  "CONNECTION_TIMEOUT",
  "SERVER_ERROR",
];

/**
 * Creates a ConnectionError object with user-friendly messaging
 */
export function createConnectionError(
  code: ConnectionErrorCode,
  technicalMessage: string
): ConnectionError {
  return {
    code,
    message: technicalMessage,
    userMessage: ERROR_MESSAGES[code],
    timestamp: Date.now(),
    recoverable: RECOVERABLE_ERRORS.includes(code),
  };
}

/**
 * Maps a raw error to a ConnectionErrorCode
 */
export function mapErrorToCode(error: unknown): ConnectionErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("authorization") || message.includes("authentication")) {
      return "AUTH_FAILED";
    }
    if (message.includes("timeout")) {
      return "CONNECTION_TIMEOUT";
    }
    if (message.includes("permission") || message.includes("not allowed")) {
      return "PERMISSION_DENIED";
    }
    if (
      message.includes("connection refused") ||
      message.includes("failed to connect") ||
      message.includes("websocket")
    ) {
      return "CONNECTION_REFUSED";
    }
    if (message.includes("invalid") && message.includes("cred")) {
      return "INVALID_CREDENTIAL";
    }
    if (message.includes("server error") || message.includes("internal")) {
      return "SERVER_ERROR";
    }
  }

  return "UNKNOWN";
}

/**
 * Creates a ConnectionError from an unknown error
 */
export function createErrorFromUnknown(error: unknown): ConnectionError {
  const code = mapErrorToCode(error);
  const technicalMessage = error instanceof Error ? error.message : String(error);
  return createConnectionError(code, technicalMessage);
}

/**
 * Gets the user-friendly message for an error code
 */
export function getUserMessage(code: ConnectionErrorCode): string {
  return ERROR_MESSAGES[code];
}

import { fromSeed } from "@nats-io/nkeys";
import type { CredsFileCredential, ConnectionError } from "@/types";
import { createConnectionError } from "@/utils/errors";

/**
 * Regex pattern to extract sections from .creds file
 * Matches content between BEGIN/END markers
 */
const CREDS_SECTION_REGEX =
  /\s*(?:(?:[-]{3,}[^\n]*[-]{3,}\n)(.+)(?:\n\s*[-]{3,}[^\n]*[-]{3,}\n))/gi;

/**
 * Maximum allowed credential file size (10KB)
 */
const MAX_CREDS_SIZE = 10 * 1024;

/**
 * User NKey seed prefix
 */
const USER_SEED_PREFIX = "SU";

/**
 * User public key prefix
 */
const USER_PUBLIC_KEY_PREFIX = "U";

/**
 * Result of parsing a .creds file
 */
export interface ParseResult {
  success: true;
  credential: CredsFileCredential;
}

/**
 * Error result from parsing
 */
export interface ParseError {
  success: false;
  error: ConnectionError;
}

/**
 * Generates a unique ID for a credential
 */
function generateCredentialId(): string {
  return crypto.randomUUID();
}

/**
 * Extracts JWT and seed sections from credential text
 */
function extractSections(credsText: string): { jwt: string; seed: string } | null {
  // Reset regex state
  CREDS_SECTION_REGEX.lastIndex = 0;

  const jwtMatch = CREDS_SECTION_REGEX.exec(credsText);
  if (!jwtMatch || !jwtMatch[1]) {
    return null;
  }

  const seedMatch = CREDS_SECTION_REGEX.exec(credsText);
  if (!seedMatch || !seedMatch[1]) {
    return null;
  }

  return {
    jwt: jwtMatch[1].trim(),
    seed: seedMatch[1].trim(),
  };
}

/**
 * Validates the seed and extracts the public key
 */
function validateAndExtractPublicKey(seedString: string): {
  seed: Uint8Array;
  publicKey: string;
} | null {
  try {
    // Check seed prefix
    if (!seedString.startsWith(USER_SEED_PREFIX)) {
      return null;
    }

    const seedBytes = new TextEncoder().encode(seedString);
    const keyPair = fromSeed(seedBytes);
    const publicKey = keyPair.getPublicKey();

    // Verify public key format
    if (!publicKey.startsWith(USER_PUBLIC_KEY_PREFIX)) {
      return null;
    }

    return {
      seed: seedBytes,
      publicKey,
    };
  } catch {
    return null;
  }
}

/**
 * Parses a .creds file content and returns a Credential object
 */
export function parseCredentials(credsText: string): ParseResult | ParseError {
  // Check file size
  const textBytes = new TextEncoder().encode(credsText);
  if (textBytes.length > MAX_CREDS_SIZE) {
    return {
      success: false,
      error: createConnectionError(
        "INVALID_CREDENTIAL",
        `Credential file exceeds maximum size of ${MAX_CREDS_SIZE / 1024}KB`
      ),
    };
  }

  // Extract JWT and seed sections
  const sections = extractSections(credsText);
  if (!sections) {
    return {
      success: false,
      error: createConnectionError(
        "INVALID_CREDENTIAL",
        "Could not find JWT and seed sections in credential file"
      ),
    };
  }

  // Validate JWT format (basic check - it should be base64url encoded)
  try {
    // JWT has 3 parts separated by dots
    const jwtParts = sections.jwt.split(".");
    if (jwtParts.length !== 3) {
      return {
        success: false,
        error: createConnectionError("INVALID_CREDENTIAL", "Invalid JWT format in credential file"),
      };
    }
  } catch {
    return {
      success: false,
      error: createConnectionError("INVALID_CREDENTIAL", "Invalid JWT encoding in credential file"),
    };
  }

  // Validate seed and extract public key
  const keyData = validateAndExtractPublicKey(sections.seed);
  if (!keyData) {
    return {
      success: false,
      error: createConnectionError(
        "INVALID_CREDENTIAL",
        "Invalid NKey seed in credential file. Seed must be a valid user seed starting with 'SU'."
      ),
    };
  }

  return {
    success: true,
    credential: {
      authType: "credsfile",
      id: generateCredentialId(),
      jwt: sections.jwt,
      seed: keyData.seed,
      publicKey: keyData.publicKey,
      loadedAt: Date.now(),
      source: "file",
    },
  };
}

/**
 * Parses a File object containing .creds content
 */
export async function parseCredentialFile(file: File): Promise<ParseResult | ParseError> {
  // Check file size before reading
  if (file.size > MAX_CREDS_SIZE) {
    return {
      success: false,
      error: createConnectionError(
        "INVALID_CREDENTIAL",
        `Credential file exceeds maximum size of ${MAX_CREDS_SIZE / 1024}KB`
      ),
    };
  }

  try {
    const text = await file.text();
    return parseCredentials(text);
  } catch {
    return {
      success: false,
      error: createConnectionError("INVALID_CREDENTIAL", "Failed to read credential file"),
    };
  }
}

/**
 * Validates a credential file without fully parsing it
 * Useful for quick validation before upload
 */
export function isValidCredentialFormat(credsText: string): boolean {
  const result = parseCredentials(credsText);
  return result.success;
}

/**
 * Gets the raw credential bytes for use with NATS authenticator
 */
export function getCredentialBytes(credential: CredsFileCredential): Uint8Array {
  // Reconstruct the .creds format
  const credsContent = `-----BEGIN NATS USER JWT-----
${credential.jwt}
------END NATS USER JWT------

-----BEGIN USER NKEY SEED-----
${new TextDecoder().decode(credential.seed)}
------END USER NKEY SEED------
`;
  return new TextEncoder().encode(credsContent);
}

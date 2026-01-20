import type {
  StoredCredential,
  CredentialStorageOptions,
  Credential,
  CredsFileCredential,
  UserPassCredential,
  AuthType,
} from "@/types";
import { isCredsFileCredential } from "@/types";

/**
 * Default storage options
 */
const DEFAULT_OPTIONS: Required<CredentialStorageOptions> = {
  dbName: "NATSCredentials",
  storeName: "credentials",
  iterations: 100000,
};

/**
 * IndexedDB credential storage service with AES-256-GCM encryption
 */
class CredentialStorage {
  private options: Required<CredentialStorageOptions>;
  private db: IDBDatabase | null = null;

  constructor(options: CredentialStorageOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.options.storeName)) {
          db.createObjectStore(this.options.storeName, { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Derive an AES-256 key from a password using PBKDF2
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: new Uint8Array(salt) as unknown as ArrayBuffer,
        iterations: this.options.iterations,
        hash: "SHA-256",
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypt credential data
   */
  private async encrypt(
    data: string,
    password: string
  ): Promise<{ encrypted: string; salt: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);

    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(data)
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return {
      encrypted: this.arrayBufferToBase64(combined),
      salt: this.arrayBufferToBase64(salt),
    };
  }

  /**
   * Decrypt credential data
   */
  private async decrypt(encrypted: string, salt: string, password: string): Promise<string> {
    const combined = this.base64ToArrayBuffer(encrypted);
    const saltBytes = this.base64ToArrayBuffer(salt);

    // Extract IV (first 12 bytes) and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const key = await this.deriveKey(password, saltBytes);

    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to Uint8Array
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generate a device-specific password for encryption
   * Uses a combination of factors to create a stable key
   */
  private async getDevicePassword(): Promise<string> {
    // Use a combination of browser fingerprint factors
    // Note: This is not highly secure but adds a layer of obscurity
    const factors = [
      navigator.userAgent,
      navigator.language,
      screen.width.toString(),
      screen.height.toString(),
      new Date().getTimezoneOffset().toString(),
    ].join("|");

    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(factors));
    return this.arrayBufferToBase64(hash);
  }

  /**
   * Store a credential (T031)
   */
  async storeCredential(credential: Credential, serverUrl: string): Promise<StoredCredential> {
    const db = await this.initDB();
    const password = await this.getDevicePassword();

    // Serialize credential data based on type
    let dataToEncrypt: string;
    let authType: AuthType;

    if (isCredsFileCredential(credential)) {
      authType = "credsfile";
      dataToEncrypt = JSON.stringify({
        type: "credsfile",
        jwt: credential.jwt,
        seed: Array.from(credential.seed),
        publicKey: credential.publicKey,
      });
    } else {
      authType = "userpass";
      dataToEncrypt = JSON.stringify({
        type: "userpass",
        username: credential.username,
        password: credential.password,
      });
    }

    const { encrypted, salt } = await this.encrypt(dataToEncrypt, password);

    const storedCredential: StoredCredential = {
      id: credential.id,
      encrypted,
      salt,
      iterations: this.options.iterations,
      storedAt: Date.now(),
      serverUrl,
      authType,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.options.storeName, "readwrite");
      const store = transaction.objectStore(this.options.storeName);
      const request = store.put(storedCredential);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(storedCredential);
    });
  }

  /**
   * Retrieve and decrypt a stored credential (T032)
   */
  async retrieveCredential(id: string): Promise<Credential | null> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.options.storeName, "readonly");
      const store = transaction.objectStore(this.options.storeName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const stored = request.result as StoredCredential | undefined;
        if (!stored) {
          resolve(null);
          return;
        }

        try {
          const password = await this.getDevicePassword();
          const decrypted = await this.decrypt(stored.encrypted, stored.salt, password);
          const data = JSON.parse(decrypted);

          // Reconstruct credential based on type
          if (data.type === "credsfile") {
            const credential: CredsFileCredential = {
              authType: "credsfile",
              id: stored.id,
              jwt: data.jwt,
              seed: new Uint8Array(data.seed),
              publicKey: data.publicKey,
              loadedAt: Date.now(),
              source: "storage",
            };
            resolve(credential);
          } else if (data.type === "userpass") {
            const credential: UserPassCredential = {
              authType: "userpass",
              id: stored.id,
              username: data.username,
              password: data.password,
              loadedAt: Date.now(),
              source: "storage",
            };
            resolve(credential);
          } else {
            // Unknown credential type
            resolve(null);
          }
        } catch {
          // Decryption or parsing failed - credential may be corrupted or from different device
          resolve(null);
        }
      };
    });
  }

  /**
   * Check if a stored credential exists (T033)
   */
  async hasStoredCredential(id?: string): Promise<boolean> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.options.storeName, "readonly");
      const store = transaction.objectStore(this.options.storeName);

      if (id) {
        const request = store.get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(!!request.result);
      } else {
        const request = store.count();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result > 0);
      }
    });
  }

  /**
   * Get the stored credential metadata (without decrypting)
   */
  async getStoredCredentialMeta(): Promise<StoredCredential | null> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.options.storeName, "readonly");
      const store = transaction.objectStore(this.options.storeName);
      const request = store.openCursor();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(cursor.value as StoredCredential);
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Clear a stored credential (T034)
   */
  async clearCredential(id: string): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.options.storeName, "readwrite");
      const store = transaction.objectStore(this.options.storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all stored credentials
   */
  async clearAllCredentials(): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.options.storeName, "readwrite");
      const store = transaction.objectStore(this.options.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Singleton instance
let storageInstance: CredentialStorage | null = null;

/**
 * Get the credential storage singleton instance
 */
export function getCredentialStorage(options?: CredentialStorageOptions): CredentialStorage {
  if (!storageInstance) {
    storageInstance = new CredentialStorage(options);
  }
  return storageInstance;
}

/**
 * Reset the credential storage (for testing purposes)
 */
export function resetCredentialStorage(): void {
  storageInstance = null;
}

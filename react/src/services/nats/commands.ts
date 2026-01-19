/**
 * NATS Command Execution Service
 *
 * Feature: 002-event-driven-state
 *
 * Handles sending commands to the backend via NATS request/response.
 */

import type { NatsConnection } from "@nats-io/nats-core";
import {
  createCommand,
  type AppCommand,
  type CommandResult,
  type DismissNotificationCommand,
  type MarkAllNotificationsReadCommand,
  type MarkNotificationReadCommand,
  type UpdateProfileCommand,
} from "../../types/commands";
import { NATS_DEFAULTS } from "../../types/state";
import { createSubjects, getNamespace } from "../../utils/subjects";
import { getNatsService } from "./connection";

// =============================================================================
// Types
// =============================================================================

export interface CommandServiceConfig {
  namespace?: string;
  defaultTimeoutMs?: number;
}

export interface CommandTimeouts {
  updateProfile: number;
  dismissNotification: number;
  markRead: number;
  markAllRead: number;
}

export interface CommandService {
  updateProfile(payload: UpdateProfileCommand["payload"]): Promise<CommandResult>;
  dismissNotification(notificationId: string): Promise<CommandResult>;
  markNotificationRead(notificationId: string): Promise<CommandResult>;
  markAllNotificationsRead(): Promise<CommandResult>;
  isOnline(): boolean;
}

// =============================================================================
// Default Timeouts
// =============================================================================

const DEFAULT_TIMEOUTS: CommandTimeouts = {
  updateProfile: 10000,
  dismissNotification: NATS_DEFAULTS.COMMAND_TIMEOUT_MS,
  markRead: NATS_DEFAULTS.COMMAND_TIMEOUT_MS,
  markAllRead: 10000,
};

// =============================================================================
// Command Service Implementation
// =============================================================================

// Simple JSON codec since @nats-io/nats-core v3.x doesn't export JSONCodec
const jsonCodec = {
  encode: <T>(data: T): Uint8Array => new TextEncoder().encode(JSON.stringify(data)),
  decode: <T>(data: Uint8Array): T => JSON.parse(new TextDecoder().decode(data)) as T,
};

class NatsCommandService implements CommandService {
  private readonly namespace: string;
  private readonly subjects: ReturnType<typeof createSubjects>;
  private readonly codec = jsonCodec;
  private readonly timeouts: CommandTimeouts;

  constructor(config: CommandServiceConfig = {}) {
    this.namespace = config.namespace || getNamespace();
    this.subjects = createSubjects(this.namespace);
    this.timeouts = { ...DEFAULT_TIMEOUTS };
    if (config.defaultTimeoutMs) {
      this.timeouts.dismissNotification = config.defaultTimeoutMs;
      this.timeouts.markRead = config.defaultTimeoutMs;
    }
  }

  private getConnection(): NatsConnection {
    const service = getNatsService();
    if (!service.connection) {
      throw new Error("Not connected to NATS");
    }
    return service.connection;
  }

  /**
   * Check if the NATS connection is online.
   */
  isOnline(): boolean {
    const service = getNatsService();
    return service.isConnected();
  }

  /**
   * Execute a command and return the result.
   */
  private async executeCommand<T extends AppCommand>(
    subject: string,
    command: T,
    timeoutMs: number
  ): Promise<CommandResult> {
    if (!this.isOnline()) {
      return {
        commandId: command.id,
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Cannot execute command while offline",
        },
        timestamp: Date.now(),
      };
    }

    const connection = this.getConnection();

    try {
      const response = await connection.request(subject, this.codec.encode(command), {
        timeout: timeoutMs,
      });

      return this.codec.decode(response.data) as CommandResult;
    } catch (error) {
      return this.handleCommandError(command.id, error);
    }
  }

  /**
   * Handle command execution errors.
   */
  private handleCommandError(commandId: string, error: unknown): CommandResult {
    const timestamp = Date.now();

    if (error instanceof Error) {
      if (error.message.includes("503")) {
        return {
          commandId,
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Command service unavailable",
          },
          timestamp,
        };
      }
      if (error.message.includes("timeout")) {
        return {
          commandId,
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Command timed out",
          },
          timestamp,
        };
      }
      return {
        commandId,
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message,
        },
        timestamp,
      };
    }

    return {
      commandId,
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unknown error occurred",
      },
      timestamp,
    };
  }

  /**
   * Update the current user's profile.
   */
  async updateProfile(payload: UpdateProfileCommand["payload"]): Promise<CommandResult> {
    const command = createCommand<UpdateProfileCommand>("user.updateProfile", payload);

    return this.executeCommand(
      this.subjects.commands.user.updateProfile,
      command,
      this.timeouts.updateProfile
    );
  }

  /**
   * Dismiss a notification.
   */
  async dismissNotification(notificationId: string): Promise<CommandResult> {
    const command = createCommand<DismissNotificationCommand>("notification.dismiss", {
      notificationId,
    });

    return this.executeCommand(
      this.subjects.commands.notification.dismiss,
      command,
      this.timeouts.dismissNotification
    );
  }

  /**
   * Mark a notification as read.
   */
  async markNotificationRead(notificationId: string): Promise<CommandResult> {
    const command = createCommand<MarkNotificationReadCommand>("notification.markRead", {
      notificationId,
    });

    return this.executeCommand(
      this.subjects.commands.notification.markRead,
      command,
      this.timeouts.markRead
    );
  }

  /**
   * Mark all notifications as read.
   */
  async markAllNotificationsRead(): Promise<CommandResult> {
    const command = createCommand<MarkAllNotificationsReadCommand>(
      "notification.markAllRead",
      {} as Record<string, never>
    );

    return this.executeCommand(
      this.subjects.commands.notification.markAllRead,
      command,
      this.timeouts.markAllRead
    );
  }
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate command payload before sending.
 */
export function validateUpdateProfilePayload(payload: UpdateProfileCommand["payload"]): {
  valid: boolean;
  error?: string;
} {
  if (payload.name !== undefined) {
    if (typeof payload.name !== "string") {
      return { valid: false, error: "Name must be a string" };
    }
    if (payload.name.length === 0) {
      return { valid: false, error: "Name cannot be empty" };
    }
    if (payload.name.length > 255) {
      return { valid: false, error: "Name cannot exceed 255 characters" };
    }
  }

  if (payload.avatarUrl !== undefined) {
    if (typeof payload.avatarUrl !== "string") {
      return { valid: false, error: "Avatar URL must be a string" };
    }
  }

  // At least one field must be provided
  if (payload.name === undefined && payload.avatarUrl === undefined) {
    return { valid: false, error: "At least one field must be provided" };
  }

  return { valid: true };
}

/**
 * Validate notification ID.
 */
export function validateNotificationId(notificationId: string): { valid: boolean; error?: string } {
  if (!notificationId || typeof notificationId !== "string") {
    return { valid: false, error: "Notification ID is required" };
  }
  if (notificationId.length === 0) {
    return { valid: false, error: "Notification ID cannot be empty" };
  }
  return { valid: true };
}

// =============================================================================
// Factory
// =============================================================================

let commandServiceInstance: NatsCommandService | null = null;

/**
 * Get the command service singleton instance.
 */
export function getCommandService(config?: CommandServiceConfig): CommandService {
  if (!commandServiceInstance) {
    commandServiceInstance = new NatsCommandService(config);
  }
  return commandServiceInstance;
}

/**
 * Reset the command service (for testing purposes).
 */
export function resetCommandService(): void {
  commandServiceInstance = null;
}

/**
 * Profile Editor Component
 *
 * Feature: 002-event-driven-state
 *
 * Demonstrates command usage for updating user profile.
 */

import { useState, useCallback } from "react";
import { useAppState } from "../hooks/useAppState";
import { useCommand } from "../hooks/useCommand";

interface ProfileEditorProps {
  /** Optional callback when profile is updated */
  onUpdate?: () => void;
  /** Optional additional className */
  className?: string;
}

/**
 * A form component for editing user profile.
 *
 * @example
 * ```tsx
 * <ProfileEditor onUpdate={() => console.log('Profile updated!')} />
 * ```
 */
export function ProfileEditor({ onUpdate, className = "" }: ProfileEditorProps) {
  const { user } = useAppState();
  const { execute, isExecuting, error, canExecute, clearError } = useCommand();

  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSuccess(false);
      clearError();

      const payload: { name?: string; avatarUrl?: string } = {};
      if (name !== user?.name) payload.name = name;
      if (avatarUrl !== user?.avatarUrl) payload.avatarUrl = avatarUrl || undefined;

      if (Object.keys(payload).length === 0) {
        return; // No changes
      }

      const result = await execute("user.updateProfile", payload);

      if (result.success) {
        setSuccess(true);
        onUpdate?.();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    },
    [name, avatarUrl, user, execute, clearError, onUpdate]
  );

  if (!user) {
    return null;
  }

  return (
    <div className={`rounded-lg bg-card p-6 shadow border border-border ${className}`}>
      <h2 className="text-lg font-medium text-card-foreground mb-4">Edit Profile</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {success && (
          <div className="rounded-md bg-success/10 p-3 text-sm text-success">
            Profile updated successfully!
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isExecuting}
            maxLength={255}
          />
        </div>

        <div>
          <label htmlFor="avatarUrl" className="block text-sm font-medium text-foreground">
            Avatar URL
          </label>
          <input
            type="url"
            id="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isExecuting}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          {!canExecute && (
            <span className="text-sm text-muted-foreground">Offline - cannot save changes</span>
          )}
          <button
            type="submit"
            disabled={!canExecute || isExecuting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export { ProfileEditor as default };

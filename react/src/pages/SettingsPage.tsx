/**
 * Settings Page
 *
 * Feature: 002-event-driven-state
 *
 * Page for managing user settings including theme selection.
 */

import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileEditor } from "@/components/ProfileEditor";
import { useAppState } from "@/hooks/useAppState";

/**
 * Settings page with theme selection and profile editing.
 */
export function SettingsPage() {
  const { theme, resolvedTheme, isSystem } = useTheme();
  const { user, syncStatus } = useAppState();

  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your preferences and profile settings.</p>

        <div className="mt-8 space-y-8">
          {/* Theme Section */}
          <section className="rounded-lg bg-card p-6 shadow border border-border">
            <h2 className="text-lg font-medium text-card-foreground">Appearance</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose how the application looks on your device.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Theme</label>
                <ThemeToggle mode="buttons" />
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-foreground">Current Theme</h3>
                <dl className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Mode</dt>
                    <dd className="font-medium text-foreground capitalize">{theme}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Active Theme</dt>
                    <dd className="font-medium text-foreground capitalize">{resolvedTheme}</dd>
                  </div>
                  {isSystem && (
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">System Preference</dt>
                      <dd className="font-medium text-foreground">Following system</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </section>

          {/* Profile Section */}
          {user && <ProfileEditor />}

          {/* Connection Info Section */}
          <section className="rounded-lg bg-card p-6 shadow border border-border">
            <h2 className="text-lg font-medium text-card-foreground">Connection</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Information about your current session.
            </p>

            <dl className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Sync Status</dt>
                <dd className="font-medium text-foreground capitalize">{syncStatus}</dd>
              </div>
              {user && (
                <>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">User ID</dt>
                    <dd className="font-mono text-xs text-foreground">{user.id}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="text-foreground">{user.email}</dd>
                  </div>
                </>
              )}
            </dl>
          </section>

          {/* Danger Zone */}
          <section className="rounded-lg bg-destructive/5 p-6 border border-destructive/20">
            <h2 className="text-lg font-medium text-destructive">Danger Zone</h2>
            <p className="mt-1 text-sm text-destructive/80">Actions that can affect your data.</p>

            <div className="mt-4">
              <button
                onClick={() => {
                  // Clear local storage and reload
                  localStorage.clear();
                  window.location.reload();
                }}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Clear Local Data
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export { SettingsPage as default };

/**
 * Theme Toggle Component
 *
 * Feature: 002-event-driven-state
 *
 * Provides UI for switching between light, dark, and system themes.
 */

import { useTheme } from "../hooks/useTheme";
import type { ThemeMode } from "../types/state";

interface ThemeToggleProps {
  /** Display mode: 'buttons' shows all options, 'dropdown' shows a dropdown */
  mode?: "buttons" | "dropdown" | "icon";
  /** Optional additional className */
  className?: string;
}

/**
 * Theme toggle component with three modes: light, dark, system.
 *
 * @example
 * ```tsx
 * // Button group
 * <ThemeToggle mode="buttons" />
 *
 * // Dropdown select
 * <ThemeToggle mode="dropdown" />
 *
 * // Simple icon toggle
 * <ThemeToggle mode="icon" />
 * ```
 */
export function ThemeToggle({ mode = "buttons", className = "" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, isSystem } = useTheme();

  if (mode === "icon") {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${className}`}
        title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      >
        {resolvedTheme === "dark" ? (
          <SunIcon className="h-5 w-5" />
        ) : (
          <MoonIcon className="h-5 w-5" />
        )}
      </button>
    );
  }

  if (mode === "dropdown") {
    return (
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeMode)}
        className={`rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    );
  }

  // Buttons mode
  return (
    <div className={`inline-flex rounded-md shadow-sm ${className}`}>
      <ThemeButton
        mode="light"
        current={theme}
        isSystem={isSystem}
        resolvedTheme={resolvedTheme}
        onClick={() => setTheme("light")}
        position="left"
      >
        <SunIcon className="h-4 w-4" />
        <span className="sr-only">Light</span>
      </ThemeButton>
      <ThemeButton
        mode="dark"
        current={theme}
        isSystem={isSystem}
        resolvedTheme={resolvedTheme}
        onClick={() => setTheme("dark")}
        position="middle"
      >
        <MoonIcon className="h-4 w-4" />
        <span className="sr-only">Dark</span>
      </ThemeButton>
      <ThemeButton
        mode="system"
        current={theme}
        isSystem={isSystem}
        resolvedTheme={resolvedTheme}
        onClick={() => setTheme("system")}
        position="right"
      >
        <ComputerIcon className="h-4 w-4" />
        <span className="sr-only">System</span>
      </ThemeButton>
    </div>
  );
}

interface ThemeButtonProps {
  mode: ThemeMode;
  current: ThemeMode;
  isSystem: boolean;
  resolvedTheme: "light" | "dark";
  onClick: () => void;
  position: "left" | "middle" | "right";
  children: React.ReactNode;
}

function ThemeButton({ mode, current, onClick, position, children }: ThemeButtonProps) {
  const isActive = current === mode;

  const positionClasses = {
    left: "rounded-l-md",
    middle: "-ml-px",
    right: "-ml-px rounded-r-md",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary ${positionClasses[position]} ${
        isActive
          ? "bg-primary text-primary-foreground border-primary z-10"
          : "bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Icons
// =============================================================================

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function ComputerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

export { ThemeToggle as default };

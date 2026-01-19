/**
 * useTheme Hook
 *
 * Feature: 002-event-driven-state
 *
 * Convenient hook for accessing theme preferences.
 */

import { useThemeContext } from "../contexts/ThemeContext";
import type { ThemeMode, ResolvedTheme } from "../types/state";

// =============================================================================
// Types
// =============================================================================

export interface UseThemeResult {
  /** Current theme mode setting (light, dark, or system) */
  theme: ThemeMode;
  /** Resolved theme (always light or dark) */
  resolvedTheme: ResolvedTheme;
  /** Set the theme mode */
  setTheme: (mode: ThemeMode) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** Whether using system preference */
  isSystem: boolean;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for theme management.
 *
 * @example
 * ```tsx
 * function ThemeToggle() {
 *   const { theme, resolvedTheme, setTheme, isDark } = useTheme();
 *
 *   return (
 *     <div>
 *       <button onClick={() => setTheme('light')}>Light</button>
 *       <button onClick={() => setTheme('dark')}>Dark</button>
 *       <button onClick={() => setTheme('system')}>System</button>
 *       <p>Current: {resolvedTheme}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): UseThemeResult {
  const { mode, resolvedTheme, setTheme, toggleTheme } = useThemeContext();

  return {
    theme: mode,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === "dark",
    isSystem: mode === "system",
  };
}

/**
 * Theme Context Provider
 *
 * Feature: 002-event-driven-state
 *
 * Manages theme preference with system preference detection and cross-tab sync.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { ThemeMode, ResolvedTheme } from "../types/state";
import {
  getStoredTheme,
  setStoredTheme,
  resolveTheme,
  applyTheme,
  subscribeToSystemTheme,
} from "../utils/theme";
import { getStateSyncService, generateTabId } from "../services/state/sync";

// =============================================================================
// Types
// =============================================================================

interface ThemeContextValue {
  /** Current theme mode setting */
  mode: ThemeMode;
  /** Resolved theme (light or dark) */
  resolvedTheme: ResolvedTheme;
  /** Set the theme mode */
  setTheme: (mode: ThemeMode) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
}

// =============================================================================
// Context
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface ThemeProviderProps {
  children: ReactNode;
  /** Initial theme mode (defaults to stored or system) */
  defaultTheme?: ThemeMode;
}

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  // Combine mode and resolved theme in single state to avoid multiple setState calls
  const [themeState, setThemeState] = useState<ThemeState>(() => {
    const mode = defaultTheme ?? getStoredTheme();
    return { mode, resolved: resolveTheme(mode) };
  });

  const { mode, resolved: resolvedTheme } = themeState;

  // Apply theme to DOM on mount and when state changes
  useEffect(() => {
    applyTheme(resolvedTheme);
    setStoredTheme(mode);
  }, [mode, resolvedTheme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (mode !== "system") {
      return;
    }

    const unsubscribe = subscribeToSystemTheme((systemTheme) => {
      setThemeState((prev) => ({ ...prev, resolved: systemTheme }));
      applyTheme(systemTheme);
    });

    return unsubscribe;
  }, [mode]);

  // Cross-tab synchronization
  useEffect(() => {
    const tabId = generateTabId();
    const syncService = getStateSyncService(tabId);

    const unsubscribe = syncService.subscribe((message) => {
      if (message.type === "THEME_CHANGED" && message.payload) {
        const payload = message.payload as { mode: ThemeMode; resolved: ResolvedTheme };
        setThemeState({ mode: payload.mode, resolved: payload.resolved });
        applyTheme(payload.resolved);
      }
    });

    return unsubscribe;
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    const resolved = resolveTheme(newMode);
    setThemeState({ mode: newMode, resolved });

    // Notify other tabs
    const syncService = getStateSyncService();
    syncService.notifyThemeChanged(newMode, resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    const newMode: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(newMode);
  }, [resolvedTheme, setTheme]);

  const value: ThemeContextValue = {
    mode,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access theme context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}

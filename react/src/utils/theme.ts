/**
 * Theme Detection Utilities
 *
 * Feature: 002-event-driven-state
 *
 * Utilities for detecting and managing theme preferences.
 */

import type { ThemeMode, ResolvedTheme } from "../types/state";

// =============================================================================
// Constants
// =============================================================================

export const THEME_STORAGE_KEY = "theme-mode";
export const DEFAULT_THEME: ThemeMode = "system";

// =============================================================================
// System Theme Detection
// =============================================================================

/**
 * Get the system's preferred color scheme.
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Subscribe to system theme changes.
 *
 * @param callback - Called when system theme changes
 * @returns Cleanup function
 */
export function subscribeToSystemTheme(callback: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? "dark" : "light");
  };

  mediaQuery.addEventListener("change", handler);

  return () => {
    mediaQuery.removeEventListener("change", handler);
  };
}

// =============================================================================
// Theme Storage
// =============================================================================

/**
 * Get the stored theme preference.
 */
export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return DEFAULT_THEME;
}

/**
 * Store the theme preference.
 */
export function setStoredTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

// =============================================================================
// Theme Resolution
// =============================================================================

/**
 * Resolve the actual theme to use based on mode.
 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
}

// =============================================================================
// DOM Manipulation
// =============================================================================

/**
 * Apply the theme to the document.
 */
export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/**
 * Get the current applied theme from the document.
 */
export function getAppliedTheme(): ResolvedTheme {
  if (typeof document === "undefined") {
    return "light";
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

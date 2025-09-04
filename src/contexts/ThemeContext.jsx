import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_CONFIG } from '../config/visualizationConfig.js';

// Helper to resolve 'light' | 'dark' | 'system'
function resolveMode(mode) {
  if (!mode) return 'light';
  if (mode === 'system' && typeof window !== 'undefined') {
    try {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }
  return mode === 'dark' ? 'dark' : 'light';
}

// Apply theme class immediately on module load (to prevent flash)
if (typeof window !== 'undefined') {
  try {
    const STORAGE_KEY = 'hoodini_theme';
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    const defaultMode = DEFAULT_CONFIG.theme?.mode ?? 'light';
    const initialMode = persisted || defaultMode || 'light';
    const resolved = resolveMode(initialMode);
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  } catch (e) { }
}

const STORAGE_KEY = 'hoodini_theme';
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const defaultMode = DEFAULT_CONFIG.theme?.mode ?? 'light';
  const persisted = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
  const initial = persisted || defaultMode || 'light';

  const [theme, setTheme] = useState(initial);
  const [resolvedThemeState, setResolvedThemeState] = useState(() => resolveMode(initial));

  const getThemeColors = (mode = theme) => {
    let resolved = mode;
    if (mode === 'system' && typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    }
    return DEFAULT_CONFIG.theme?.[resolved] ?? {};
  };

  const themeColors = getThemeColors(resolvedThemeState); // ✅ auto-updated when theme changes

  const setThemeAndPersist = (value) => {
    setTheme(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {}
    try {
      const resolved = resolveMode(value);
      setResolvedThemeState(resolved);
      const root = document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    } catch (e) {}
  };

  const toggleTheme = () => {
    const next = resolvedThemeState === 'light' ? 'dark' : 'light';
    setThemeAndPersist(next);
  };

  useEffect(() => {
    const resolved = resolveMode(theme);
    setResolvedThemeState(resolved);

    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    let mql;
    let handler;
    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      try {
        mql = window.matchMedia('(prefers-color-scheme: dark)');
        handler = (e) => {
          const newResolved = e.matches ? 'dark' : 'light';
          if (newResolved === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
          } else {
            root.classList.remove('dark');
            root.classList.add('light');
          }
          setResolvedThemeState(newResolved);
        };
        if (mql.addEventListener) mql.addEventListener('change', handler);
        else if (mql.addListener) mql.addListener(handler);
      } catch (e) {}
    }

    return () => {
      if (mql && handler) {
        if (mql.removeEventListener) mql.removeEventListener('change', handler);
        else if (mql.removeListener) mql.removeListener(handler);
      }
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{
      theme,
      resolvedTheme: resolvedThemeState,
      themeColors, // ✅ EXPOSED
      getThemeColors: (mode) => getThemeColors(mode || resolvedThemeState),
      setTheme: setThemeAndPersist,
      toggleTheme,
      isLight: resolvedThemeState === 'light',
      isDark: resolvedThemeState === 'dark'
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

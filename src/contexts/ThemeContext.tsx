import React, { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
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

// Helper to detect current theme from document
function detectDocumentTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const root = document.documentElement;
    // Check for common dark mode indicators
    if (root.classList.contains('dark')) return 'dark';
    if (root.getAttribute('data-theme') === 'dark') return 'dark';
    if (root.style.colorScheme === 'dark') return 'dark';
    // Check Nextra's theme attribute
    if (root.getAttribute('class')?.includes('dark')) return 'dark';
    // Fallback to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) { }
  return 'light';
}

// External store for document theme - enables reactive updates when host theme changes
let documentThemeListeners: Array<() => void> = [];
let cachedDocumentTheme = typeof window !== 'undefined' ? detectDocumentTheme() : 'light';

function subscribeToDocumentTheme(callback: () => void) {
  documentThemeListeners.push(callback);
  
  // Set up MutationObserver on first subscriber
  if (documentThemeListeners.length === 1 && typeof window !== 'undefined') {
    const observer = new MutationObserver(() => {
      const newTheme = detectDocumentTheme();
      if (newTheme !== cachedDocumentTheme) {
        cachedDocumentTheme = newTheme;
        documentThemeListeners.forEach(l => l());
      }
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });
    
    // Also listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const newTheme = detectDocumentTheme();
      if (newTheme !== cachedDocumentTheme) {
        cachedDocumentTheme = newTheme;
        documentThemeListeners.forEach(l => l());
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);
    
    // Store cleanup function
    (subscribeToDocumentTheme as any)._cleanup = () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }
  
  return () => {
    documentThemeListeners = documentThemeListeners.filter(l => l !== callback);
    if (documentThemeListeners.length === 0 && (subscribeToDocumentTheme as any)._cleanup) {
      (subscribeToDocumentTheme as any)._cleanup();
    }
  };
}

function getDocumentThemeSnapshot() {
  return cachedDocumentTheme;
}

function getDocumentThemeServerSnapshot() {
  return 'light';
}

// REMOVED: Auto-applying theme class on module load
// This was interfering with host page themes (like Nextra)
// The ThemeProvider will handle this when used standalone

const STORAGE_KEY = 'hoodini_theme';
const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  // Use useSyncExternalStore to reactively track document theme changes
  // This will cause re-renders when the host page theme changes
  const documentTheme = useSyncExternalStore(
    subscribeToDocumentTheme,
    getDocumentThemeSnapshot,
    getDocumentThemeServerSnapshot
  );
  
  if (!context) {
    // Fallback values when used outside ThemeProvider (embedded mode)
    // Use the reactive documentTheme instead of static detection
    return {
      theme: documentTheme,
      setTheme: () => {},
      resolvedTheme: documentTheme,
      getThemeColors: (mode = documentTheme) => {
        const resolved = mode === 'dark' ? 'dark' : 'light';
        return DEFAULT_CONFIG.theme?.[resolved] ?? (resolved === 'dark' ? {
          background: '#18181b',
          foreground: '#fafafa',
          muted: '#27272a',
          mutedForeground: '#a1a1aa',
          border: '#3f3f46',
          primary: '#fafafa',
          primaryForeground: '#18181b',
          geneFill: [100, 100, 100, 255],
        } : {
          background: '#ffffff',
          foreground: '#000000',
          muted: '#f4f4f5',
          mutedForeground: '#71717a',
          border: '#e4e4e7',
          primary: '#18181b',
          primaryForeground: '#fafafa',
          geneFill: [150, 150, 150, 255],
        });
      },
    };
  }
  return context;
};

export const ThemeProvider = ({ children, respectHostTheme = true }) => {
  const defaultMode = DEFAULT_CONFIG.theme?.mode ?? 'light';
  
  // If respectHostTheme is true, detect host theme first instead of using stored preference
  const getInitialTheme = () => {
    if (respectHostTheme && typeof window !== 'undefined') {
      const hostTheme = detectDocumentTheme();
      // If host has a dark theme, use it
      if (hostTheme === 'dark') return 'dark';
    }
    // Otherwise use stored preference or default
    const persisted = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    return persisted || defaultMode || 'light';
  };
  
  const initial = getInitialTheme();

  const [theme, setTheme] = useState(initial);
  const [resolvedThemeState, setResolvedThemeState] = useState(() => resolveMode(initial));
  // Track if we're being controlled by host
  const [isHostControlled, setIsHostControlled] = useState(respectHostTheme);

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
    // When user explicitly sets theme, we take control from host
    setIsHostControlled(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {}
    try {
      const resolved = resolveMode(value);
      setResolvedThemeState(resolved);
      // Always modify document when user explicitly changes theme
      // (user took control, so we apply their choice)
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
    
    // Only modify document classes if NOT respecting host theme
    // When embedded (respectHostTheme=true), let the host control document classes
    if (!respectHostTheme) {
      if (resolved === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }

    // Observe external theme changes (e.g., from parent page like Nextra)
    // This allows hoodini-viz to stay in sync when embedded
    let observer: MutationObserver | null = null;
    if (respectHostTheme) {
      try {
        observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              const hasDark = root.classList.contains('dark');
              const currentResolved = resolvedThemeState;
              // Sync internal state to match host
              if (hasDark && currentResolved !== 'dark') {
                setResolvedThemeState('dark');
                setTheme('dark');
              } else if (!hasDark && currentResolved !== 'light') {
                setResolvedThemeState('light');
                setTheme('light');
              }
            }
          }
        });
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
      } catch (e) {}
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
      if (observer) {
        observer.disconnect();
      }
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

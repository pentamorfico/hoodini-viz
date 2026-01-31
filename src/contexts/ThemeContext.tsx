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
    // Check for explicit dark mode indicators
    if (root.classList.contains('dark')) return 'dark';
    if (root.getAttribute('data-theme') === 'dark') return 'dark';
    if (root.style.colorScheme === 'dark') return 'dark';
    
    // Check for explicit light mode indicators
    // If the page has explicitly set light mode, use it
    if (root.classList.contains('light')) return 'light';
    if (root.getAttribute('data-theme') === 'light') return 'light';
    if (root.style.colorScheme === 'light') return 'light';
    
    // Only fall back to system preference if there's NO explicit theme class
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) { }
  return 'light';
}

// External store for document theme - enables reactive updates when host theme changes
let documentThemeListeners: Array<() => void> = [];
let cachedDocumentTheme: 'light' | 'dark' = 'light'; // Will be detected on first subscribe

function subscribeToDocumentTheme(callback: () => void) {
  documentThemeListeners.push(callback);
  
  // Set up MutationObserver on first subscriber
  if (documentThemeListeners.length === 1 && typeof window !== 'undefined') {
    // Re-detect theme when first subscriber registers (in case module loaded before host set theme)
    cachedDocumentTheme = detectDocumentTheme();
    
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
  
  // If respectHostTheme is true, always use host theme, ignore localStorage
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return defaultMode;
    
    if (respectHostTheme) {
      // Always detect from document when respecting host
      return detectDocumentTheme();
    }
    
    // Only use stored preference when NOT respecting host
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    return persisted || defaultMode || 'light';
  };
  
  const initial = getInitialTheme();

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
      // Always modify document when user explicitly changes theme
      const root = document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
      
      // Sync with host frameworks (Nextra, next-themes, etc.)
      // Update common localStorage keys used by theme providers
      try {
        // Nextra and next-themes use 'theme' key
        window.localStorage.setItem('theme', value);
        // Dispatch storage event so other tabs/components detect the change
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'theme',
          newValue: value,
          storageArea: localStorage
        }));
        // Also dispatch a custom event that some frameworks listen to
        window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: value } }));
      } catch (e) {}
    } catch (e) {}
  };

  const toggleTheme = () => {
    const next = resolvedThemeState === 'light' ? 'dark' : 'light';
    setThemeAndPersist(next);
  };

  // Effect to apply document classes when NOT respecting host
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
  }, [theme, respectHostTheme]);

  // Separate effect for observing host theme changes
  // This runs only once and doesn't depend on theme state to avoid stale closures
  useEffect(() => {
    if (!respectHostTheme) return;
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Observer callback - always reads fresh state from DOM
    const handleMutation = () => {
      const newTheme = detectDocumentTheme();
      // Update state to match host
      setResolvedThemeState(prev => {
        if (prev !== newTheme) {
          setTheme(newTheme);
          return newTheme;
        }
        return prev;
      });
    };
    
    // Observe class attribute changes
    const observer = new MutationObserver(handleMutation);
    observer.observe(root, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme', 'style'] 
    });
    
    // Also sync on mount in case host theme changed after initial render
    handleMutation();
    
    return () => {
      observer.disconnect();
    };
  }, [respectHostTheme]);

  // Effect for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = (e) => {
      const newResolved = e.matches ? 'dark' : 'light';
      if (!respectHostTheme) {
        if (newResolved === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.remove('dark');
          root.classList.add('light');
        }
      }
      setResolvedThemeState(newResolved);
    };
    
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else if (mql.addListener) mql.addListener(handler);
    
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else if (mql.removeListener) mql.removeListener(handler);
    };
  }, [theme, respectHostTheme]);

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

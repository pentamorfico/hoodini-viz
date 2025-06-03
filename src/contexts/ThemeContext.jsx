import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_CONFIG } from '../config/visualizationConfig.js';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(DEFAULT_CONFIG.theme.mode);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const getThemeColors = () => {
    return DEFAULT_CONFIG.theme[theme];
  };

  // Apply theme to CSS variables
  useEffect(() => {
    const colors = getThemeColors();
    const root = document.documentElement;
    
    root.style.setProperty('--theme-background', colors.background);
    root.style.setProperty('--theme-text', colors.text);
    root.style.setProperty('--theme-ruler-background', colors.rulerBackground);
    root.style.setProperty('--theme-ruler-text', colors.rulerText);
    root.style.setProperty('--theme-ruler-ticks', colors.rulerTicks);
    root.style.setProperty('--theme-button-background', colors.buttonBackground);
    root.style.setProperty('--theme-button-text', colors.buttonText);
    root.style.setProperty('--theme-button-border', colors.buttonBorder);
    root.style.setProperty('--theme-tooltip-background', colors.tooltipBackground);
    root.style.setProperty('--theme-tooltip-text', colors.tooltipText);
    root.style.setProperty('--theme-tooltip-border', colors.tooltipBorder);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      getThemeColors,
      isLight: theme === 'light',
      isDark: theme === 'dark'
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

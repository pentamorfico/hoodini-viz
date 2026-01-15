import React from 'react';
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  // Show icon based on effective theme (resolvedTheme). Use 'theme' for title to indicate
  // what selecting the button will do (this shows the selected mode, e.g., 'system').
  const effective = resolvedTheme || theme || 'light';

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 flex items-center justify-center border"
      onClick={toggleTheme}
      title={`Switch to ${effective === 'light' ? 'dark' : 'light'} theme`}
    >
      {effective === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

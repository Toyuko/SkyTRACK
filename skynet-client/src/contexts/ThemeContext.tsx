import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { settingsStorage } from '../services/settingsStorage';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return settingsStorage.getTheme();
  });
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    const saved = settingsStorage.getTheme();
    if (saved === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return saved;
  });

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    // Update effective theme when theme preference changes
    if (theme === 'system') {
      setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
    } else {
      setEffectiveTheme(theme);
    }

    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(effectiveTheme);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, effectiveTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    settingsStorage.setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

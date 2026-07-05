import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../constants/colors';
import { getSetting, setSetting } from '../db/queries/settings';

type ThemeMode = 'system' | 'light' | 'dark';
type ThemeName = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeName;
  colors: typeof lightColors;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  colors: lightColors,
  setThemeMode: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    const loadThemeMode = async () => {
      const stored = await getSetting('dark_mode');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setMode(stored);
      }
    };
    loadThemeMode();
  }, []);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    setSetting('dark_mode', newMode);
  }, []);

  const resolvedTheme: ThemeName =
    mode === 'system'
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : mode;

  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}

export { ThemeContext };

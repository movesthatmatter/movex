import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export const useCurrentTheme = () => {
  const { systemTheme, theme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');

  useEffect(() => {
    setCurrentTheme(
      (theme === 'system' ? systemTheme : (theme as Theme)) || 'light'
    );
  }, [theme, systemTheme]);

  return currentTheme;
};

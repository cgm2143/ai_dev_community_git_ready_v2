'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggle = useThemeStore((state) => state.toggle);
  const hydrate = useThemeStore((state) => state.hydrate);

  React.useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === 'light' ? '다크모드로 전환' : '라이트모드로 전환'}
      onClick={toggle}
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}

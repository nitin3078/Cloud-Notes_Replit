import React from 'react';
import { Palette, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { THEMES } from '../lib/themes';
import { useTheme } from '../lib/ThemeContext';

export default function ThemeSwitcher() {
  const { themeId, setThemeId } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Change theme"
        >
          <Palette size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
          Theme
        </div>
        <div className="flex flex-col gap-0.5">
          {THEMES.map((theme) => {
            const active = theme.id === themeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setThemeId(theme.id)}
                className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm hover-elevate text-left"
              >
                <span
                  className="flex h-5 w-5 shrink-0 rounded-full border border-border/50 overflow-hidden"
                  style={{ background: theme.swatches.background }}
                >
                  <span
                    className="block h-full w-1/2 ml-auto"
                    style={{ background: theme.swatches.primary }}
                  />
                </span>
                <span className="flex-1 font-serif">{theme.name}</span>
                {active && <Check size={14} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

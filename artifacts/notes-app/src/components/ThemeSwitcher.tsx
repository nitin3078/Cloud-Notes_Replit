import React from 'react';
import { Palette, Check, Paintbrush } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { THEMES, CUSTOM_THEME_ID } from '../lib/themes';
import { useTheme } from '../lib/ThemeContext';

export default function ThemeSwitcher() {
  const { themeId, setThemeId, customColors, setCustomColors } = useTheme();

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
      <PopoverContent align="end" className="w-64 p-2">
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

          {/* Custom theme */}
          <button
            type="button"
            onClick={() => setThemeId(CUSTOM_THEME_ID)}
            className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm hover-elevate text-left"
          >
            <span
              className="flex h-5 w-5 shrink-0 rounded-full border border-border/50 items-center justify-center"
              style={{ background: customColors.background }}
            >
              <Paintbrush size={11} style={{ color: customColors.accent }} />
            </span>
            <span className="flex-1 font-serif">Custom</span>
            {themeId === CUSTOM_THEME_ID && <Check size={14} className="text-primary shrink-0" />}
          </button>
        </div>

        {themeId === CUSTOM_THEME_ID && (
          <div className="mt-2 pt-2 border-t border-border/50 px-2 pb-1 flex flex-col gap-2">
            <ColorField
              label="Background"
              value={customColors.background}
              onChange={(background) => setCustomColors({ ...customColors, background })}
            />
            <ColorField
              label="Accent"
              value={customColors.accent}
              onChange={(accent) => setCustomColors({ ...customColors, accent })}
            />
            <ColorField
              label="Text"
              value={customColors.text}
              onChange={(text) => setCustomColors({ ...customColors, text })}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 rounded border border-border/50 cursor-pointer bg-transparent p-0"
        />
        <span className="font-mono text-muted-foreground/70 w-14">{value.toUpperCase()}</span>
      </span>
    </label>
  );
}

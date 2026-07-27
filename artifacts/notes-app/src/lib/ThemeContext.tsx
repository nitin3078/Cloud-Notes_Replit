import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  THEMES, DEFAULT_THEME_ID, THEME_STORAGE_KEY,
  CUSTOM_THEME_ID, CUSTOM_COLORS_STORAGE_KEY, DEFAULT_CUSTOM_COLORS, CustomColors,
} from './themes';
import { hexToHslTriplet, shiftLightness } from './color';

interface ThemeContextType {
  themeId: string;
  setThemeId: (id: string) => void;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && (stored === CUSTOM_THEME_ID || THEMES.some((t) => t.id === stored))) return stored;
  return DEFAULT_THEME_ID;
}

function getInitialCustomColors(): CustomColors {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_COLORS;
  try {
    const stored = window.localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
    if (stored) return { ...DEFAULT_CUSTOM_COLORS, ...JSON.parse(stored) };
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_CUSTOM_COLORS;
}

/** Applies a custom color set to the document root as CSS variable overrides. */
function applyCustomColors(colors: CustomColors) {
  const root = document.documentElement;
  const bg = hexToHslTriplet(colors.background);
  const fg = hexToHslTriplet(colors.text);
  const accent = hexToHslTriplet(colors.accent);

  root.style.setProperty('--background', bg);
  root.style.setProperty('--foreground', fg);
  root.style.setProperty('--card', shiftLightness(bg, 2));
  root.style.setProperty('--card-foreground', fg);
  root.style.setProperty('--popover', shiftLightness(bg, 2));
  root.style.setProperty('--popover-foreground', fg);
  root.style.setProperty('--sidebar', shiftLightness(bg, -3));
  root.style.setProperty('--sidebar-foreground', fg);
  root.style.setProperty('--sidebar-accent', shiftLightness(bg, -8));
  root.style.setProperty('--sidebar-accent-foreground', fg);
  root.style.setProperty('--border', shiftLightness(bg, -12));
  root.style.setProperty('--input', shiftLightness(bg, -12));
  root.style.setProperty('--muted', shiftLightness(bg, -6));
  root.style.setProperty('--muted-foreground', shiftLightness(fg, 30));
  root.style.setProperty('--secondary', shiftLightness(bg, -6));
  root.style.setProperty('--secondary-foreground', fg);
  root.style.setProperty('--accent', shiftLightness(bg, -8));
  root.style.setProperty('--accent-foreground', fg);
  root.style.setProperty('--primary', accent);
  root.style.setProperty('--primary-foreground', bg);
  root.style.setProperty('--sidebar-primary', accent);
  root.style.setProperty('--sidebar-primary-foreground', bg);
  root.style.setProperty('--ring', accent);
  root.style.setProperty('--sidebar-ring', accent);
}

/** Removes any inline custom-color overrides so a preset (or the default) can take over cleanly. */
function clearCustomColors() {
  const root = document.documentElement;
  [
    '--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground',
    '--sidebar', '--sidebar-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
    '--border', '--input', '--muted', '--muted-foreground', '--secondary', '--secondary-foreground',
    '--accent', '--accent-foreground', '--primary', '--primary-foreground',
    '--sidebar-primary', '--sidebar-primary-foreground', '--ring', '--sidebar-ring',
  ].forEach((prop) => root.style.removeProperty(prop));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(getInitialTheme);
  const [customColors, setCustomColorsState] = useState<CustomColors>(getInitialCustomColors);

  useEffect(() => {
    const root = document.documentElement;
    if (themeId === CUSTOM_THEME_ID) {
      root.removeAttribute('data-theme');
      applyCustomColors(customColors);
    } else {
      clearCustomColors();
      if (themeId === DEFAULT_THEME_ID) {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', themeId);
      }
    }
  }, [themeId, customColors]);

  const setThemeId = (id: string) => {
    setThemeIdState(id);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // localStorage can throw in private browsing / disabled-storage modes; theme just won't persist.
    }
  };

  const setCustomColors = (colors: CustomColors) => {
    setCustomColorsState(colors);
    try {
      window.localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(colors));
    } catch {
      // ignore
    }
  };

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, customColors, setCustomColors }}>
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

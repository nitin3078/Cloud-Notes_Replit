export interface ThemeDefinition {
  id: string;
  name: string;
  /** Small preview swatches shown in the theme switcher, as real CSS colors (not HSL triplets). */
  swatches: { background: string; primary: string; accent: string };
}

// The `id` here must match a `[data-theme="..."]` block defined in index.css.
// "parchment" has no data-theme override — it's the app's original default,
// defined directly in :root.
export const THEMES: ThemeDefinition[] = [
  {
    id: 'parchment',
    name: 'Parchment',
    swatches: { background: '#FAF7F2', primary: '#C4713A', accent: '#E4D9C8' },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    swatches: { background: '#191714', primary: '#E0A458', accent: '#332C24' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    swatches: { background: '#F3F8FA', primary: '#1E7C8C', accent: '#DCEAEE' },
  },
  {
    id: 'forest',
    name: 'Forest',
    swatches: { background: '#F5F8F3', primary: '#3F6B3F', accent: '#DFE9DA' },
  },
  {
    id: 'rose',
    name: 'Rose',
    swatches: { background: '#FBF3F5', primary: '#B85C7A', accent: '#F0DEE3' },
  },
  {
    id: 'slate',
    name: 'Slate',
    swatches: { background: '#F5F6F8', primary: '#4C5B77', accent: '#E1E4EA' },
  },
];

export const DEFAULT_THEME_ID = 'parchment';
export const THEME_STORAGE_KEY = 'folio-theme';

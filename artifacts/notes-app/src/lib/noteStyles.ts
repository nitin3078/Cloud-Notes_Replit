export interface NoteStyleDefinition {
  id: string;
  name: string;
  description: string;
}

// These `id`s must match: (1) the noteStyle enum in the OpenAPI spec / DB
// column, and (2) a `.note-style-<id>` CSS block in index.css.
export const NOTE_STYLES: NoteStyleDefinition[] = [
  { id: 'default', name: 'Default', description: 'Matches your app theme' },
  { id: 'pdf', name: 'PDF Page', description: 'Crisp white page, like a printed document' },
  { id: 'notebook', name: 'Notebook', description: 'Ruled lines and a red margin, like paper' },
  { id: 'chalkboard', name: 'Chalkboard', description: 'Dark slate with chalky white text' },
  { id: 'kraft', name: 'Kraft Card', description: 'Warm brown paper, like an index card' },
  { id: 'terminal', name: 'Terminal', description: 'Green monospace text on black' },
];

export const DEFAULT_NOTE_STYLE = 'default';

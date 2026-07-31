import React from 'react';
import { X, HelpCircle } from 'lucide-react';

interface HelpGuideProps {
  onClose: () => void;
}

interface Section {
  title: string;
  what: string;
  how: string[];
  extra?: string;
}

const SECTIONS: Section[] = [
  {
    title: 'Planner',
    what: "A simple, date-based task list — but a sparse one. It doesn't show every day of the month, only dates you've actually put something on.",
    how: [
      'Click "Planner" in the sidebar to open it',
      'Pick a date, type a task, hit enter',
      'Check tasks off as you finish them',
      '"Up Next" always shows today\'s tasks first — or the nearest upcoming date',
    ],
    extra: 'A scrolling ticker at the top of the app shows today\'s (or tomorrow\'s) tasks automatically, even without opening Planner. Ask the AI "what do I need to do today?" — it can read your Planner too.',
  },
  {
    title: 'Notes & Folders',
    what: 'The core of Folio — write notes, organize them into folders and subfolders.',
    how: [
      'Click "+ New Note", choose a folder (or leave it in your library)',
      'Drag any note in the sidebar onto a folder to move it',
      'Right-click a note for more options (pin, lock, color, delete)',
    ],
  },
  {
    title: 'Tags',
    what: 'A lighter-weight way to group notes than folders — one note can have several tags at once.',
    how: [
      'Open a note, click "Add tag", type a word',
      'Tags you\'ve used appear in the sidebar — click one to filter',
    ],
  },
  {
    title: 'Search',
    what: 'Looks across all your notes at once, by title and content — not just the folder you\'re browsing.',
    how: ['Use the search bar near the top of the sidebar'],
  },
  {
    title: 'AI Chat',
    what: 'An assistant that answers questions using your own notes — and can write directly into a note for you.',
    how: [
      '"Ask your notes" in the sidebar for a general chat across your library',
      'The floating "Ask AI" button inside a note asks just about that note',
      'If it can\'t find an answer, it offers to search generally instead',
      'Ask it to draft something, then click "Insert into note" to actually add it — nothing is added automatically',
    ],
  },
  {
    title: 'Note styles',
    what: 'Give an individual note its own look — Default, PDF Page, Notebook, Chalkboard, Kraft Card, or Terminal — independent of your app theme.',
    how: ['Open a note, click the paint-bucket icon in the toolbar'],
  },
  {
    title: 'App themes',
    what: 'Change the color palette of the whole app, or build your own with the Custom option.',
    how: ['Click the palette icon near the top of the sidebar'],
  },
  {
    title: 'Locking a note',
    what: "Password-protect a note. Its content is hidden everywhere — previews, tooltips — until you unlock it.",
    how: ['Open a note, click the lock icon in the toolbar, set a password'],
  },
  {
    title: 'Markdown export',
    what: 'Download any note as a real .md file.',
    how: ['Open a note, click the download icon in the toolbar'],
  },
];

export default function HelpGuide({ onClose }: HelpGuideProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-card rounded-tl-xl border-l border-t shadow-[-4px_0_12px_rgba(44,26,14,0.02)] border-border relative z-10 overflow-hidden">
      <div className="h-14 flex-shrink-0 border-b border-border flex items-center justify-between px-4 bg-card/80 backdrop-blur-sm">
        <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
          <HelpCircle size={18} className="text-primary" />
          How to use Folio
        </h2>
        <button onClick={onClose} className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10 flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-1.5">{s.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{s.what}</p>
              <ul className="flex flex-col gap-1.5 mb-2">
                {s.how.map((step, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary shrink-0 mt-2" />
                    {step}
                  </li>
                ))}
              </ul>
              {s.extra && (
                <p className="text-xs text-muted-foreground italic mt-2 bg-muted/50 rounded-md px-3 py-2">{s.extra}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

# Folio

A personal, cloud-synced note-taking app: create and organize notes in folders, lock individual notes with a password, use voice-to-text while writing, skin your notes and your whole app with different looks, drag notes between folders, and ask an AI assistant to answer questions from your notes — or write directly into them.

> **Sync check:** if you can see this line after pulling in Replit, GitHub → Replit sync is working correctly. (Added as a one-time verification after fixing the repo-mismatch issue.)

## Features

- **Notes & folders** — create, edit, and organize notes into folders; drag and drop a note from the sidebar onto any folder to move it there
- **Version history** — restore or copy earlier versions of a note
- **Password-protected notes** — lock individual notes with bcrypt-hashed passwords
- **Voice-to-text** — dictate note content via the Web Speech API
- **App theming** — six built-in color palettes (parchment, midnight, ocean, forest, rose, slate), plus a **Custom** theme with your own background/accent/text colors, persisted per browser
- **Per-note styles** — give an individual note its own look, independent of the app theme: Default, PDF Page, Notebook, Chalkboard, Kraft Card, or Terminal
- **Note previews** — hover any note in the sidebar for a scrollable preview of its content
- **Ask your notes** — a chat panel (global or scoped to a single open note) that answers questions using only your own notes as context, powered by the Gemini API free tier
- **AI writing** — ask the assistant to draft, summarize, or rewrite something for a note, review its answer, then click "Insert into note" to add it — every AI-written addition is signed with a timestamp so it's always clear what the AI wrote versus what you wrote
- **General-knowledge fallback** — if the AI can't answer from your notes, it offers to answer from general knowledge instead, on request
- **Email/password accounts** — sign up and log in with email + password, alongside the existing Replit login
- **Planner** — a sparse, date-based task list: only dates you've actually added something to ever show up, with an "Up Next" view surfacing what's due today or coming up soonest

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite + shadcn/ui (`artifacts/notes-app`)
- **API**: Express 5 (`artifacts/api-server`)
- **DB**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval, generating typed hooks/schemas from an OpenAPI spec (`lib/api-spec`, `lib/api-client-react`, `lib/api-zod`)
- **Build**: esbuild (CJS bundle)

## Run & operate

```bash
# install deps
pnpm install

# run the API server (port 5000)
pnpm --filter @workspace/api-server run dev

# run the frontend
pnpm --filter @workspace/notes-app run dev

# typecheck everything
pnpm run typecheck

# typecheck + build everything
pnpm run build

# push DB schema changes (dev only — no migration files, schema is source of truth)
pnpm --filter @workspace/db run push

# regenerate API hooks/Zod schemas after changing the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## Required environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `GEMINI_API_KEY` | Enables the "Ask your notes" AI chat feature (Google AI Studio, free tier) |
| `GEMINI_MODEL` | *(optional)* Override the default Gemini model if Google renames/deprecates it |

## Where things live

- `artifacts/notes-app` — React frontend
- `artifacts/api-server` — Express API, routes under `src/routes/`
- `lib/db` — Drizzle schema and DB client
- `lib/api-spec` / `lib/api-client-react` / `lib/api-zod` — OpenAPI spec and generated client code
- `lib/replit-auth-web` — auth integration

## Development history

Roughly in the order each piece was built:

1. **Note creation bug fix** — creating a note silently failed. Root cause: an un-transacted insert into the note-versions table could fail after the note itself was already created, with no error handling anywhere in the stack to surface it. Fixed by wrapping the write in a database transaction and adding a global API error handler plus frontend error toasts, so failures are now visible instead of silent.
2. **App-wide theming (first pass)** — six built-in color palettes (parchment, midnight, ocean, forest, rose, slate) with a swatch-picker dropdown, persisted to the browser.
3. **"Ask your notes" AI chat** — a chat panel backed by a new `/api/ai/chat` route that reads the user's own notes as context before answering.
4. **AI provider switched to Gemini** — originally built against the Anthropic API; switched to Google Gemini's free tier so the AI feature doesn't require a paid API key.
5. **`sortOrder` overflow bug fix** — note creation crashed under the new theming/AI code because `sortOrder` was seeded with a millisecond timestamp that overflowed Postgres's 32-bit `integer` column. Changed the column to `bigint`.
6. **Per-note visual styles** — added a `noteStyle` field (Default, PDF Page, Notebook, Chalkboard, Kraft Card, Terminal) selectable at note creation or anytime from the editor toolbar, independent of the app-wide theme.
7. **Custom app theme** — extended the theme switcher with a "Custom" option and three color pickers (background, accent, text) that derive a full coordinated palette.
8. **Per-note AI chat** — the "Ask AI" action is now available from inside any open note, scoped to just that note's content, not just the whole library.
9. **AI writing into notes** — the assistant can now draft content on request; the person reviews it in the chat panel and explicitly clicks "Insert into note" before anything is written — nothing is added automatically. Inserted text is signed with a timestamp.
10. **Cross-folder drag-and-drop** — notes in the sidebar can be dragged directly onto a folder (or "All Notes") to move them, in addition to the existing right-click "Move to..." menu.
11. **Note preview tooltips** — hovering a note in the sidebar shows a scrollable preview of its full content, plus a clearer hover highlight.
12. **Drag-and-drop fix** — the drag handle was originally only a tiny hover-only icon; the whole note card is draggable now.
13. **Full-bleed note styles** — PDF/Notebook/Chalkboard/Kraft/Terminal now fill the entire note area instead of sitting in a centered box.
14. **Email/password accounts** — added alongside the existing Replit login, using the same session system.
15. **AI general-knowledge fallback** — when the assistant can't answer from your notes, it offers a one-click "search generally instead?" option.
16. **Planner** — a new sparse, date-based task list with an "Up Next" view.

## Built by

This app was built collaboratively: the person who owns this repo (GitHub: nitin3078) directed requirements, tested changes live on Replit, and made product decisions (theme options, AI provider choice, feature priorities). The code — diagnosis, implementation, and this README — was written by Claude (Anthropic), working from that direction and pushing changes to this repo on request.

## Deployment

This app runs live on [Replit](https://replit.com). This GitHub repo is a backup/mirror — changes made here don't automatically apply to the running app. After pushing changes to GitHub, pull them into Replit's **Git** pane, then run the DB push command above from Replit's Shell if the schema changed.

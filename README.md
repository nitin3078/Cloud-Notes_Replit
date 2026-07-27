# Folio

A personal, cloud-synced note-taking app: create and organize notes in folders, lock individual notes with a password, switch between color themes, use voice-to-text while writing, and ask an AI assistant questions grounded in your own notes.

## Features

- **Notes & folders** — create, edit, and organize notes into folders
- **Version history** — restore or copy earlier versions of a note
- **Password-protected notes** — lock individual notes with bcrypt-hashed passwords
- **Voice-to-text** — dictate note content via the Web Speech API
- **Theming** — six built-in color palettes (parchment, midnight, ocean, forest, rose, slate), persisted per browser
- **Ask your notes** — a chat panel that answers questions using only the content of your own notes as context, powered by the Gemini API free tier

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

## Deployment

This app runs live on [Replit](https://replit.com). This GitHub repo is a backup/mirror — changes made here don't automatically apply to the running app. After pushing changes to GitHub, pull them into Replit's **Git** pane, then run the DB push command above from Replit's Shell if the schema changed.

# CLAUDE.md

A small Linear-style task manager: Next.js App Router, TypeScript (strict), Tailwind CSS, SQLite with better-sqlite3 and Drizzle ORM. One user, no auth. See README.md for the full picture.

## Commands

```bash
npm run dev          # dev server on :3000
npm run lint         # ESLint
npm run typecheck    # next typegen + tsc
npm run test         # Vitest unit tests (in-memory SQLite)
npm run test:e2e     # Playwright smoke test (own DB at data/e2e.db)
npm run build        # production build
npm run db:generate  # new migration from src/lib/db/schema.ts
npm run db:migrate   # apply migrations to data/app.db
npm run db:seed      # reset data/app.db to demo data
```

## Architecture

- `src/lib/db/schema.ts` holds the Drizzle tables. `src/lib/db/index.ts` opens the database and applies migrations on first use.
- `src/lib/tasks.ts` is the only place that reads or writes the database. Every function takes an optional `db` argument so tests can pass an in-memory one.
- `src/lib/validation.ts` holds the zod schemas. The data layer parses every input with them.
- `src/app/actions.ts` holds the Server Actions. All mutations go through them. They call the data layer, then `revalidatePath("/", "layout")`.
- Pages (`src/app/**/page.tsx`) are Server Components that call the data layer directly. Interactive parts are Client Components in `src/components/`.
- Client Components may only `import type` from `src/lib/tasks.ts` or `src/lib/db/*`, never values, because those modules load better-sqlite3.

## Conventions

- Mutations use Server Actions, not route handlers. Keep it that way.
- To change the schema: edit `src/lib/db/schema.ts`, run `npm run db:generate -- --name <what_changed>`, commit the new file in `drizzle/`, and update `src/lib/seed.ts` if needed. Never edit an old migration.
- Add a unit test in `tests/unit/` for every new data-layer function.
- Colors come from the tokens in `src/app/globals.css` (`bg`, `panel`, `panel-hover`, `line`, `fg`, `muted`, `accent`). Keep the UI dense.
- Pin dependency versions exactly (no `^`).

## Before you finish

Run `npm run lint`, `npm run typecheck` and `npm run test`. All three must pass. Run `npm run test:e2e` when you change the UI.

@AGENTS.md

# Joule

AI-augmented electronics store — a rebuild of a first-year ASP.NET catalog as a modern, personalised, BDD-verified SvelteKit + Supabase app.

- **Brief:** [`docs/brief.html`](./docs/brief.html)
- **Window:** 8 weeks · 2 sprints · end of June 2026
- **Stack:** SvelteKit 2 · Supabase · Vercel · Stripe (test mode) · Claude + OpenAI · Playwright-BDD

Progress is tracked per week. Every week lives on its own integration branch (`week-NN-<theme>`) and lands on `main` via a single PR tagged `week-NN-done`.

## Quickstart

```bash
npm install
cp .env.example .env.local         # fill in keys, or leave blank for seed-only mode
npm run dev                        # http://localhost:5173
```

Without a `.env.local`, the app degrades to anonymous mode and serves the in-memory seed catalog — useful for local UI work without Supabase.

With Supabase credentials:

```bash
npx supabase start                 # local Postgres + Auth
npm run db:migrate                 # apply migrations
npm run db:types                   # regenerate src/lib/server/db/types.ts
npm run seed                       # populate categories, products, images, reviews
npm run embed                      # optional — populate pgvector embeddings
```

## Scripts

| command                     | purpose                                                                   |
| --------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`               | Vite dev server                                                           |
| `npm run build` / `preview` | Production build / local preview                                          |
| `npm run check`             | `svelte-check` typecheck                                                  |
| `npm run lint`              | Prettier + ESLint                                                         |
| `npm run format`            | Prettier write                                                            |
| `npm run test:unit`         | Vitest                                                                    |
| `npm run test:e2e`          | Playwright                                                                |
| `npm run test:bdd`          | Playwright-BDD (Layer 1 always; Layer 2 only if `AI_GATEWAY_API_KEY` set) |

## Testing layers

- **Layer 1 (`tests/bdd/features/*.feature`)** — deterministic UI scenarios. Flakes here are bugs.
- **Layer 2 (`@ai` tag)** — calls live model endpoints and asserts structural invariants (every cited slug resolves in the catalog, every review citation is in range). Skipped in CI unless `AI_GATEWAY_API_KEY` is configured.

# Implementation Plan: Admin Product Management

**Branch**: `week-05-admin` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-admin-product-management/spec.md`

## Summary

Build the smallest admin UI that lets a holder of the `admin` profile role list every product, change a product's price and stock inline, and toggle its `featured` flag — without touching SQL. Access is gated at two layers: a SvelteKit `+layout.server.ts` role guard on `/admin/*`, and an RLS policy (`products admin update / insert`) that calls the existing `public.is_admin()` SQL function. The admin UI re-uses the same `@supabase/ssr` session-bound client the customer app already uses, so RLS does the heavy lifting.

## Technical Context

**Language/Version**: TypeScript 5.x on SvelteKit 2 with Svelte 5 runes.

**Primary Dependencies**: `@supabase/ssr` for the request-scoped Postgres client; Tailwind v4 for styling; SvelteKit form actions (no client-side JS framework). The existing `src/lib/server/auth.ts:isAdmin()` helper is the single source of truth for "is the caller an admin?" outside the database.

**Storage**: Supabase Postgres. New writes hit `public.products`. Reads use the catalog query the customer app already has; the admin list adds no new reads against the database.

**Testing**: `vitest` for unit (already at 96% lines on `src/lib`); `playwright-bdd` for the access-control scenarios (new `admin.feature` file under `tests/bdd/features/`); the existing `k6` smoke run already covers the public storefront and does not need expansion for this feature.

**Target Platform**: Vercel SSR (Edge / Node serverless, whichever Vercel picks for the route). No client-only behaviour required for the first release.

**Project Type**: Web application — single SvelteKit app, no separate admin service. The route lives under `src/routes/admin/`.

**Performance Goals**: Admin list page loads in under 1 second over the home Wi-Fi the supervisor demos from. Writes finish in under 500 ms server-side (Supabase round-trip + audit log line).

**Constraints**: Must run under the user's auth cookie, never the service-role client. Must not weaken any existing RLS policy. The catalog is 50 rows; pagination is out of scope.

**Scale/Scope**: One admin role, two or three admins concurrently, ~50 products, ~5 writes per day in steady state. The feature should not depend on any of these numbers — they describe the target environment, not a limit.

## Constitution Check

Walked through each of the five principles in `.specify/memory/constitution.md`:

- **I. RLS On Day One** — Passes. The new admin write paths run under the user's session and are gated by `products admin update / insert` policies that call `public.is_admin()`. No service-role usage from any user-triggered code path.
- **II. Spec Before Code** — Passes. This plan accompanies `spec.md` and `tasks.md` in the same folder; no admin-page code is committed before they are.
- **III. Test Pyramid With Real Coverage Gates** — Passes. The plan adds unit tests for `isAdmin()` and the admin action handlers, plus a new BDD feature file for the access-control scenarios. The existing 85% line gate stays as the floor.
- **IV. Tracked Decisions, Tracked Evidence** — Passes, with one new ADR added (see Phase 0 below) to capture the choice of "form actions + RLS, no separate admin service."
- **V. One Branch Per Week, Squash To Main** — Passes. Work continues on `week-05-admin`; the feature branch `001-admin-product-management` that `create-new-feature.sh` produced was discarded immediately so the per-week squash narrative stays clean.

No violations; Complexity Tracking table at the bottom of this file stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-product-management/
├── plan.md                  # This file
├── spec.md                  # What and why
├── tasks.md                 # Punch-list (next file)
└── checklists/
    └── requirements.md      # Spec quality gate (already green)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── server/
│       ├── auth.ts                       # isAdmin() helper (already added)
│       └── admin/
│           └── products.ts               # NEW: server-side query + mutation helpers
├── routes/
│   ├── admin/
│   │   ├── +layout.server.ts             # NEW: role-guard load that 302s non-admins
│   │   ├── +layout.svelte                # NEW: admin shell (header + nav, kept minimal)
│   │   ├── +page.server.ts               # NEW: small dashboard with counts
│   │   ├── +page.svelte                  # NEW: dashboard page
│   │   └── products/
│   │       ├── +page.server.ts           # NEW: list load + update/toggle form actions
│   │       └── +page.svelte              # NEW: admin product list with inline edits
│   └── (existing customer routes untouched)

supabase/
└── migrations/
    └── 20260519120000_admin_rls_policies.sql   # Already added (is_admin SQL fn + policies)

tests/
├── unit/
│   └── server/
│       ├── auth.test.ts                  # NEW: isAdmin() unit tests
│       └── admin/
│           └── products.test.ts          # NEW: admin product helpers unit tests
└── bdd/
    └── features/
        └── admin.feature                 # NEW: role-gate access scenarios
```

**Structure Decision**: Single SvelteKit app, admin lives under `src/routes/admin/` with its own `+layout.server.ts` that does the role check once per request and exposes `data.adminUser` to nested pages. The admin module's server helpers go under `src/lib/server/admin/` to keep them out of the customer code path. No separate admin service, no separate auth, no client-side state library — the form actions plus the request-scoped Supabase client are enough for this scope.

## Phase 0 — Research

Three questions came up while writing the spec; all resolved.

**Q1**: Should the admin UI use the existing user-bound Supabase client, or the service-role admin client?

Decision: user-bound. The existing `getSupabaseAdmin()` bypasses RLS by design; using it from a user-triggered request would weaken the project's "RLS-on-day-one" rule (Principle I). The user-bound client respects the RLS policies added in `20260519120000_admin_rls_policies.sql`, which is the layer that needs to be load-bearing. This decision is captured as a new ADR row in `docs/architecture-decisions.docx` (see "Admin UI uses request-scoped Supabase client, not service-role").

**Q2**: Inline edits, or a per-product detail page with a form?

Decision: inline. The fields admins touch most often (price, stock, featured) are scalars; a separate detail page is one extra navigation per edit. The list page renders one form per row with the row's id in a hidden field; the form action mutates one row at a time. This matches the operator's mental model — see the list, fix the row, move on.

**Q3**: Where does the audit log go for v1?

Decision: server console (`console.info`) with a stable prefix `[admin]` and a JSON payload. Vercel logs already retain this for the period that matters (≥ 7 days on the current plan). A future feature can promote it to a queryable table if writes per day cross a threshold that makes log search unworkable. Recorded as an assumption in the spec and is not a constitution violation because Principle IV says decisions and evidence must be tracked, not that audit logs must be in a relational table.

## Phase 1 — Design

### Data model

No schema changes beyond `20260519120000_admin_rls_policies.sql`, which is already in the migrations folder.

The migration adds:

- `public.is_admin()` — `security definer` function reading `profiles.role` for `auth.uid()`. Existing.
- `products admin update`, `products admin insert` policies — `using` / `with check` clauses both call `public.is_admin()`. Existing.

### Server modules

`src/lib/server/admin/products.ts` exports three functions:

- `listAdminProducts(sb)` — selects the columns the admin list needs in slug-asc order. Single query, no joins beyond the existing `categories(slug, name)` to show the category name in the list. Returns `AdminProductRow[]` (a narrower view than the customer-facing `Product`).
- `updateProductScalars(sb, id, patch)` — patch is `{ price_cents?, stock_qty?, featured? }`. Validates the patch, calls `sb.from('products').update(patch).eq('id', id)`. Throws `AdminWriteError` with a typed code on RLS or CHECK failure so the page action can translate it to a user-readable form error.
- `toggleFeatured(sb, id, next)` — thin convenience wrapper over `updateProductScalars`.

Validation happens here (`Number.isFinite`, `>= 0`, integer for stock, `<= 10_000_000` cents for price) so the form action stays small.

### Routes

`src/routes/admin/+layout.server.ts`:

```ts
export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  if (!(await isAdmin(locals.supabase, locals.user))) {
    throw redirect(303, '/');
  }
  return { adminUser: locals.user };
};
```

Two failure modes, two redirects. No 403 page in v1; sending non-admins to the home page is consistent with the "do not leak admin existence" requirement (FR-009).

`src/routes/admin/products/+page.server.ts` exports:

- `load` — `listAdminProducts(locals.supabase)`.
- `actions.update` — reads `id`, `price`, `stock`, `featured` from `formData`, parses into a patch, calls `updateProductScalars`. Returns `{ ok: true, id }` on success; `fail(400, { id, error })` on validation; `fail(403, ...)` on RLS denial.

The page uses one `<form method="POST" action="?/update">` per row with `use:enhance` so the inline edit is non-blocking but degrades gracefully without JS.

### Audit log

A single helper in `src/lib/server/admin/products.ts`:

```ts
function logAdminWrite(adminUserId: string, productId: string, before: Patch, after: Patch) {
  console.info('[admin]', JSON.stringify({
    at: new Date().toISOString(),
    by: adminUserId,
    product: productId,
    diff: shallowDiff(before, after)
  }));
}
```

Called from `updateProductScalars` after the row is fetched (for `before`) and after the update succeeds (for `after`).

### Failure modes

- Non-admin tries to load the page — redirected by the layout guard (303 home).
- Non-admin POSTs directly to the action — passes the guard? No: the layout's load runs before the action when the URL is under `/admin/*`. Defense-in-depth: even if the action ran, `updateProductScalars` would fail at the RLS layer.
- Admin enters bad input — form-level validation returns 400 with a per-field error.
- Admin's role is revoked mid-session — next write fails at RLS, returns 403 with "your session no longer has admin access; please sign in again."

### UI

Minimal — Tailwind, no client component library, no DataGrid. The list is a `<table>` with one form per row. Featured is a checkbox; price and stock are number inputs with `step` and `min`. Save buttons are per-row, not per-cell. Errors render inline above the row.

## Complexity Tracking

> Constitution Check above is green. This table stays empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    |            |                                     |

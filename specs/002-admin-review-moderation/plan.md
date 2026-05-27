# Implementation Plan: Admin Review Moderation

**Branch**: `week-05-admin` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-admin-review-moderation/spec.md`

## Summary

Add a soft-hide column to `public.reviews`, update the existing "reviews readable" RLS policy so non-admins see only visible rows while admins see everything, and ship an `/admin/reviews` page with three actions (hide, show, delete). The admin policies (`reviews admin update`, `reviews admin delete`) already exist from migration `20260519120000`; this slice only adds the column, tightens the read policy, and builds the UI.

## Technical Context

**Language/Version**: TypeScript 5.x on SvelteKit 2 with Svelte 5 runes.

**Primary Dependencies**: `@supabase/ssr` for the request-scoped Postgres client; Tailwind v4 for styling; SvelteKit form actions. The existing `isAdmin()` helper and the audit-log conventions from `001-admin-product-management` carry over.

**Storage**: Supabase Postgres. New column `reviews.hidden_at timestamptz`. New index optional. The RLS read policy on reviews gets tightened in the same migration.

**Testing**: `vitest` for unit (target: at least one test per server helper); the existing BDD harness already covers the route-layer redirect via `admin.feature`; no new BDD scenarios needed.

**Target Platform**: Vercel SSR (Edge / Node serverless).

**Project Type**: Web application — single SvelteKit app, admin lives under `src/routes/admin/`.

**Performance Goals**: Admin review list loads in under 1 second for the current review volume (a few dozen rows). Moderation writes finish in under 500 ms server-side.

**Constraints**: Must run under the user's auth cookie, never service-role. Must not break the existing customer-side reviews queries (which read from the same table via the same RLS).

**Scale/Scope**: One admin role, two or three admins concurrently, ~50 reviews in steady state, < 1 moderation action per day. Numbers are the target environment, not a limit.

## Constitution Check

- **I. RLS On Day One** — Passes. The new `hidden_at` column is added with a tightened "reviews readable" policy in the same migration; non-admins lose access to hidden rows at the database layer, not just at the application layer.
- **II. Spec Before Code** — Passes. This plan accompanies `spec.md` and `tasks.md` in the same folder.
- **III. Test Pyramid With Real Coverage Gates** — Passes. New unit tests cover the three moderation helpers and the list-filter behaviour. Coverage stays above the 85% line gate.
- **IV. Tracked Decisions, Tracked Evidence** — Passes. No new ADR needed; the decisions (soft hide via column, RLS-enforced visibility, no new audit table) follow established patterns. ADR 0006 already covers the "admin UI on the request-scoped client" choice that this feature extends.
- **V. One Branch Per Week, Squash To Main** — Passes. Work continues on `week-05-admin`; the throwaway `002-admin-review-moderation` branch from `create-new-feature.sh` was discarded immediately.

No violations; Complexity Tracking table stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-review-moderation/
├── plan.md                  # This file
├── spec.md                  # What and why
├── tasks.md                 # Punch-list
└── checklists/
    └── requirements.md      # Spec quality gate (green)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── server/
│       └── admin/
│           ├── products.ts                 # Existing (slice 001)
│           └── reviews.ts                  # NEW: list / hide / delete helpers
├── routes/
│   └── admin/
│       └── reviews/
│           ├── +page.server.ts             # NEW: list load + hide/show/delete actions
│           └── +page.svelte                # NEW: moderation queue UI

supabase/
└── migrations/
    └── 20260519140000_reviews_hidden.sql   # NEW: hidden_at column + read-policy tighten

tests/
└── unit/
    └── server/
        └── admin/
            └── reviews.test.ts             # NEW: list / hide / delete unit tests
```

**Structure Decision**: Same shape as slice 001. Admin helpers live in `src/lib/server/admin/`. The admin layout's nav gets a new "Reviews" link; the +layout.svelte stays a small, hand-authored shell — no nav library.

## Phase 0 — Research

Two questions came up; both resolved.

**Q1**: Soft delete (hidden flag) or hard delete only?

Decision: support both. Hide is the everyday action (reversible, audit-friendly); delete is the rare destructive action for spam. Two columns aren't needed — `hidden_at` (nullable timestamp) captures both "is it hidden" and "when was it hidden", which is enough for v1. Delete is a row-level DELETE through the existing admin RLS policy.

**Q2**: Filter the customer-facing query, or enforce hiding via RLS?

Decision: RLS. The "reviews readable" policy gets tightened to `using (hidden_at is null or public.is_admin())`. Non-admins (logged-in customers and anonymous visitors) see only visible reviews; admins see everything. This keeps the customer-facing query code unchanged — `select * from reviews where product_id = X` continues to work, and the database does the filtering. The alternative (every query adds `and hidden_at is null`) is too easy to forget in a future query, which would leak a hidden review.

## Phase 1 — Design

### Data model

Migration `20260519140000_reviews_hidden.sql`:

```sql
alter table public.reviews add column hidden_at timestamptz;
create index reviews_hidden_idx on public.reviews(hidden_at) where hidden_at is not null;

drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews
    for select
    using (hidden_at is null or public.is_admin());
```

The partial index on `hidden_at is not null` keeps the admin "hidden only" filter fast as the table grows. The `using (hidden_at is null or public.is_admin())` clause is the load-bearing change — it makes hidden rows literally invisible to non-admin reads.

### Server module

`src/lib/server/admin/reviews.ts` exports:

- `listAdminReviews(sb, filter)` — selects every review with the columns the admin grid needs, ordered by `created_at desc`. `filter` is `'all' | 'visible' | 'hidden'`. Joins `products(slug, name)` for the column showing which product the review is on. Returns `AdminReviewRow[]`.
- `setReviewHidden(sb, adminUserId, id, hidden)` — sets `hidden_at = now()` when `hidden` is true, `null` when false. Validates id; translates RLS denial into `AdminReviewError` with code `forbidden`. Logs the action.
- `deleteReview(sb, adminUserId, id)` — hard delete. If the row was already gone, treat as success (idempotent). Logs the action.
- `AdminReviewError` — typed error with codes `validation | forbidden | not_found | database`. Mirrors `AdminWriteError` from the product slice.
- `logModeration` — JSON line on `console.info` prefixed `[admin]`, same shape as the product audit log so they can be searched together.

### Routes

`src/routes/admin/reviews/+page.server.ts`:

- `load` — parses `?filter=visible|hidden` (default `all`), calls `listAdminReviews`.
- `actions.hide` — reads `id` from formData, calls `setReviewHidden(..., true)`.
- `actions.show` — calls `setReviewHidden(..., false)`.
- `actions.delete` — calls `deleteReview`.

Each action returns `{ ok: true, id }` on success or `fail(status, { id, error })` with status mapped from `AdminReviewError.code`.

`+page.svelte`:

- Filter chips at the top (All / Visible / Hidden) — same pattern as the products page.
- Table: product, reviewer (truncated user_id for now), rating + aspect, title, body (truncated to ~140 chars with a click-to-expand if needed), created date, current status, three small action forms (Hide/Show + Delete).
- The Delete button uses an inline `onsubmit={(e) => !confirm('...')}` style guard so a non-JS browser also gets the prompt via the form's native behaviour.
- Inline error rendering on a failed action (same pattern as products).

### Audit log

```ts
function logModeration(
	adminUserId: string,
	reviewId: string,
	action: 'hide' | 'show' | 'delete',
	before: { hidden_at: string | null } | null,
	after: { hidden_at: string | null } | null
) {
	console.info(
		'[admin]',
		JSON.stringify({
			at: new Date().toISOString(),
			by: adminUserId,
			review: reviewId,
			action,
			before,
			after
		})
	);
}
```

Same `[admin]` prefix as the product audit so an operator can grep both in Vercel logs.

### Failure modes

- Non-admin tries to load — caught by `/admin/+layout.server.ts` from slice 001.
- Non-admin direct POST — caught by RLS (`reviews admin update` / `reviews admin delete` policies).
- Admin hides a review that was deleted — `setReviewHidden` returns `not_found`; the action surfaces a row error.
- Admin deletes a review that was already deleted — treated as success (the desired end state was reached).
- Customer's product page request happens while a review is mid-hide — RLS evaluates per request, so the next request sees the new state. No race.

### UI

Minimal Tailwind. Body excerpt is `.line-clamp-2` to keep rows compact. Hidden reviews have a faint grey background and a "Hidden since [date]" label.

### Customer side

No changes required. The existing reviews query (`src/lib/server/reviews.ts`) reads from `public.reviews` through the user's session-bound client. After the migration, non-admins get filtered rows automatically. The aspect-rating aggregation also reads through the same client so it inherits the same filter — hidden reviews are excluded from the headline averages, matching FR-006.

## Complexity Tracking

> Constitution Check above is green. This table stays empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    |            |                                      |

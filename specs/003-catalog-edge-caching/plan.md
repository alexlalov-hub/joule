# Implementation Plan: Catalog Edge Caching

**Branch**: `week-06-performance` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-catalog-edge-caching/spec.md`

## Summary

Add Vercel edge caching to the public catalog routes (`/`, `/categories`, `/category/<slug>`, `/product/<slug>`, `/search`, `/compare`) via SvelteKit's `setHeaders` API, with tag-based invalidation fired from the admin write helpers added in Week 5. Public traffic hits the edge cache and never touches Supabase; admin writes invalidate the affected tags so the next public request after a save renders fresh HTML. Header personalisation (user name, cart count) moves out of the cached SSR body and into a client-side hydration so the cached HTML is the same for every visitor regardless of session.

## Technical Context

**Language/Version**: TypeScript 5.x on SvelteKit 2 with Svelte 5 runes.

**Primary Dependencies**: SvelteKit's `event.setHeaders()` for response cache headers; Vercel's `revalidateTag()` SDK (via `@vercel/cache`) for programmatic invalidation; the existing `src/lib/server/admin/*` write helpers as the trigger points.

**Storage**: No new tables. The cache itself lives in Vercel's edge POPs, managed by them.

**Testing**: `vitest` for unit-level tests on the cache-tag helper and the personalisation-hydration logic; `playwright-bdd` for an integration scenario "admin edits price, public page reflects within one request"; `k6` for the before/after p95 measurement (the load suite from Week 5).

**Target Platform**: Vercel — the edge cache is Vercel-specific. Same hosting choice as ADR 0007 (platform-first observability).

**Project Type**: Web application — single SvelteKit app.

**Performance Goals**: Drop `tests/load/sustained.js` `route:catalog` p95 from ~2 s to < 800 ms; `route:product` p95 from ~1.8 s to < 1 s; `journey:browse` p95 down at least 30 %.

**Constraints**: No personalised content in the cached body. Cache invalidation must run inside the admin action's request, not lag behind it. No new Supabase tables — the cache is stateless storage on Vercel.

**Scale/Scope**: Catalog of ~73 products, < 10 admin writes per day, anonymous traffic dominates. Cache hit rate target > 95 % on the hot routes in steady state.

## Constitution Check

- **I. RLS On Day One** — Passes. No new tables, no new DB writes from this feature. The admin writes that trigger invalidation already enforce RLS via the policies added in Week 5.
- **II. Spec Before Code** — Passes. This plan accompanies `spec.md` and `tasks.md` in the same folder.
- **III. Test Pyramid With Real Coverage Gates** — Passes. New unit tests on the cache-tag helper and personalisation logic; new BDD scenario for the invalidation behaviour; before/after k6 numbers captured.
- **IV. Tracked Decisions, Tracked Evidence** — Passes. New ADR 0008 captures the choice of Vercel edge cache + tag invalidation over alternatives (no cache, in-memory only, Cloudflare in front of Vercel, dedicated Redis layer).
- **V. One Branch Per Week, Squash To Main** — Passes. Work on `week-06-performance`; the throwaway `003-catalog-edge-caching` branch from `create-new-feature.sh` was discarded immediately.

No violations; Complexity Tracking table at the bottom stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-catalog-edge-caching/
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
│   ├── cache.ts                            # Existing in-memory request cache, unchanged.
│   └── server/
│       └── cache-tags.ts                   # NEW: tag-name helpers + invalidate() wrapper.
└── routes/
    ├── +layout.svelte                      # MODIFIED: move user/cartCount badge out of
    │                                       # SSR body, render via $effect after mount.
    ├── api/
    │   └── me/+server.ts                   # NEW: returns { user, cartCount } for the
    │                                       # client-side header hydration.
    ├── (shop)/
    │   ├── +page.server.ts                 # MODIFIED: setHeaders cache tags = ['catalog'].
    │   ├── categories/+page.server.ts      # MODIFIED: tags = ['catalog'].
    │   ├── category/[slug]/+page.server.ts # MODIFIED: tags = ['catalog'].
    │   ├── product/[slug]/+page.server.ts  # MODIFIED: tags = [`product:${slug}`,
    │   │                                   # `reviews:${slug}`].
    │   ├── search/+page.server.ts          # MODIFIED: short TTL, no tags.
    │   └── compare/+page.server.ts         # MODIFIED: short TTL, no tags.

src/lib/server/admin/
├── products.ts                             # MODIFIED: updateProductScalars +
│                                           # toggleFeatured fire invalidate(['catalog',
│                                           # `product:${slug}`]) on success.
└── reviews.ts                              # MODIFIED: setReviewHidden + deleteReview
                                            # fire invalidate([`product:${slug}`,
                                            # `reviews:${slug}`]).

tests/
├── unit/
│   └── server/
│       └── cache-tags.test.ts              # NEW: unit tests for the tag helpers.
└── bdd/
    └── features/
        └── caching.feature                 # NEW: 2 scenarios — admin edit invalidates,
                                            # public page reflects on next request.

docs/
└── load-test-results.md                    # NEW: before/after k6 numbers, gated on
                                            # this feature shipping.
```

**Structure Decision**: SvelteKit-native — every cache-control header is set inside a `+page.server.ts` load via `event.setHeaders()`. No new framework, no proxy in front of Vercel. The invalidation API call is one line per admin helper. The personalisation move-out is the largest mechanical change, but it stays inside `+layout.svelte` + the existing `Header.svelte` component.

## Phase 0 — Research

Three questions came up; all resolved.

**Q1**: SvelteKit `setHeaders` + Vercel edge cache, or a separate Cloudflare layer in front of Vercel?

Decision: SvelteKit `setHeaders`. Vercel's edge cache is automatic when you set `Cache-Control: s-maxage=...` on the response — no separate platform required. Cloudflare in front would add a second tier (CF cache → Vercel cache → function), useful for global hit rates if the project scales, but it doubles the invalidation complexity and the project's traffic profile doesn't justify it yet. Vercel-only is the cheaper-to-maintain answer.

**Q2**: Programmatic tag invalidation or "wait for TTL"?

Decision: programmatic. The `revalidateTag()` primitive from `@vercel/cache` is the supported invalidation API. The TTL-only approach would make admin writes "appear after up to 60 minutes" which violates SC-003. The invalidation call is one line; the cost is trivial.

**Q3**: How to keep the cached HTML user-state-free?

Decision: move the personalised header (`Header user={data.user} cartCount={data.cartCount}`) from SSR-rendered into a `$effect`-driven client-side render. The SSR pass renders the header with the anonymous-state shape (no name, no cart badge); after the page mounts, a client effect hits a small `/api/me` endpoint that reads the session cookie and returns `{ user, cartCount }`, then updates the header. The cached HTML is identical for every visitor.

Alternative considered: per-user `Vary: Cookie` cache. Rejected — every signed-in user creates a separate cache entry, defeating the cache for the majority of catalog traffic which is anonymous anyway. The client-hydration approach keeps a single cache entry per URL.

## Phase 1 — Design

### Cache header policy

Set in each catalog `+page.server.ts` via `event.setHeaders()`:

| Route                     | `Cache-Control`                                    | Tags                               |
| ------------------------- | -------------------------------------------------- | ---------------------------------- |
| `/`                       | `public, s-maxage=3600, stale-while-revalidate=60` | `catalog`                          |
| `/categories`             | `public, s-maxage=3600, stale-while-revalidate=60` | `catalog`                          |
| `/category/<slug>`        | `public, s-maxage=3600, stale-while-revalidate=60` | `catalog`                          |
| `/product/<slug>`         | `public, s-maxage=3600, stale-while-revalidate=60` | `product:<slug>`, `reviews:<slug>` |
| `/search?q=...`           | `public, s-maxage=60`                              | none (low cardinality, short TTL)  |
| `/compare?slugs=...`      | `public, s-maxage=60`                              | none                               |
| `/admin/*`                | `private, no-store`                                | (explicitly excluded)              |
| `/assistant`, `/api/ai/*` | `private, no-store`                                | (explicitly excluded)              |
| `/api/me`                 | `private, no-store`                                | (per-user, never cached)           |

The `stale-while-revalidate=60` on the long-TTL routes is the safety net for the edge case where an invalidation fails — visitors see the slightly-stale page while the cache refreshes in the background. Acceptable.

### Cache-tag helper

`src/lib/server/cache-tags.ts` exports:

- `productTag(slug: string): string` → `"product:" + slug` (consistent tag-name across read setter and write invalidator).
- `reviewsTag(slug: string): string` → `"reviews:" + slug`.
- `CATALOG_TAG = "catalog"`.
- `invalidateTags(tags: string[]): Promise<void>` — thin wrapper. In dev (no Vercel runtime), it's a no-op with a `[cache]` log line so we can see what would have been invalidated. In production, it fires `revalidateTag()`.

Centralising the tag-name strings here is the load-bearing maintenance choice — a typo in the tag string at the write site (e.g. `"product:" + id` instead of `slug`) is the kind of bug that would silently break invalidation, so the read and write sites both go through the same helper.

### Personalisation move-out

Currently `src/routes/+layout.svelte` reads `data.user` and `data.cartCount` from server load and renders into `<Header>`. After this change:

- `+layout.server.ts` still computes them but the public catalog routes mark their response as cacheable; the `Header` component takes `user` and `cartCount` as props with default-anonymous values for the SSR pass.
- A `$effect` in `+layout.svelte` runs on mount, hits the new `/api/me` endpoint, and updates the header's props from the JSON response. SSR renders the anonymous state; client-side rehydration shows the user's name and cart badge.
- `/api/me` itself is NOT cached — explicit `Cache-Control: private, no-store`.

A short flash of "Sign in" before the user's name appears is acceptable for v1. If it bothers, the follow-up is a localStorage cache of the last-seen user — out of scope for this feature.

### Admin write hooks

Two-line addition in each helper. In `src/lib/server/admin/products.ts`'s `updateProductScalars` and `toggleFeatured`, after `logAdminWrite(...)` and before `return`:

```ts
await invalidateTags([CATALOG_TAG, productTag(afterRow.slug)]);
```

In `src/lib/server/admin/reviews.ts`'s `setReviewHidden` and `deleteReview`, after the audit log and before return:

```ts
await invalidateTags([productTag(productSlug), reviewsTag(productSlug)]);
```

This requires both helpers to know the product slug. `setReviewHidden` already returns the joined product slug in `AdminReviewRow`. `deleteReview` needs the product slug looked up before the delete because after deletion the row is gone — minor refactor inside that helper.

### Failure modes

- **Invalidation API errors** — caught and logged but NOT bubbled up. The admin's save succeeds even if the cache invalidation fails; worst case is "stale page for up to 1 hour" which is recoverable. Surfacing the error to the admin UI would be misleading (the DB write did succeed).
- **Cold cache + slow Supabase** — the first request after invalidation hits the function, which queries Supabase. The existing in-memory `src/lib/cache.ts` request-cache layer is the mitigation.
- **Tag name drift** — addressed by routing every tag-name construction through `cache-tags.ts`.

### Measurement plan

Before this feature lands: run `k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/sustained.js` and `journey.js`, save the summary output as the "before" baseline in `docs/load-test-results.md`.

After: same run, "after" row appended. SC-001 through SC-006 checked against the diff.

## Complexity Tracking

> Constitution Check above is green. This table stays empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    |            |                                      |

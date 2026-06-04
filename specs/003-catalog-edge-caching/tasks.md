---
description: 'Tasks: Catalog Edge Caching'
---

# Tasks: Catalog Edge Caching

**Input**: Design documents from `specs/003-catalog-edge-caching/`

**Prerequisites**: spec.md, plan.md, checklists/requirements.md (all green).

**Tests**: Required (constitution Principle III).

**Organization**: One commit per slice. Story tags map back to spec.md.

## Format: `[ID] [P?] [Story] Description`

- `[P]` — different files, can land in parallel.
- `[Story]` — `US1` (cache hit), `US2` (invalidation), `US3` (graceful miss), `INFRA` (shared scaffolding), `PERF` (measurement).

## Phase 1 — Setup

- [ ] T001 [INFRA] Install `@vercel/cache` as a runtime dep so `revalidateTag()` is callable from server code.

## Phase 2 — Foundational (blocking)

**Goal**: Land the cache-tag helper and the response-header policy together so the read path and the write path agree on the tag names.

- [ ] T002 [INFRA] Add `src/lib/server/cache-tags.ts`:
      `CATALOG_TAG`, `productTag(slug)`, `reviewsTag(slug)`,
      `invalidateTags(tags)`. The invalidate wrapper falls back to a
      `[cache]` console.info no-op when not on Vercel (so local dev
      doesn't crash).
- [ ] T003 [P] [INFRA] Unit tests for the tag helpers in
      `tests/unit/server/cache-tags.test.ts`: happy paths, invalidate
      no-op in non-Vercel env, invalidate-with-error handled gracefully.
- [ ] T004 [INFRA] Add `src/routes/api/me/+server.ts` returning
      `{ user, cartCount }` for the client-side header hydration.
      `Cache-Control: private, no-store`.

**Checkpoint**: Tag helpers exist and are tested; the personalisation endpoint is up.

## Phase 3 — User Story 1 — Cache hits (Priority: P1)

**Goal**: Catalog routes return with the right `Cache-Control` headers and the right tags, so Vercel's edge starts serving repeat requests from cache.

**Independent Test**: Hit each cached route twice from `curl -I` — the first request has `x-vercel-cache: MISS`, the second has `x-vercel-cache: HIT`.

### Implementation

- [ ] T005 [US1] Move the header personalisation in
      `src/routes/+layout.svelte`: render an anonymous-state Header
      during SSR, then a `$effect` on mount calls `/api/me` and
      re-renders with the user data.
- [ ] T006 [P] [US1] `src/routes/(shop)/+page.server.ts` →
      `event.setHeaders({ 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60', 'Cache-Tag': CATALOG_TAG })`.
- [ ] T007 [P] [US1] `src/routes/(shop)/categories/+page.server.ts` —
      same headers, tag `CATALOG_TAG`.
- [ ] T008 [P] [US1] `src/routes/(shop)/category/[slug]/+page.server.ts` —
      same headers, tag `CATALOG_TAG`.
- [ ] T009 [P] [US1] `src/routes/(shop)/product/[slug]/+page.server.ts` —
      same headers, tags `productTag(slug)` and `reviewsTag(slug)`.
- [ ] T010 [P] [US1] `src/routes/(shop)/search/+page.server.ts` — short
      TTL `public, s-maxage=60`, no tags.
- [ ] T011 [P] [US1] `src/routes/(shop)/compare/+page.server.ts` — short
      TTL `public, s-maxage=60`, no tags.

**Checkpoint**: Public catalog routes are cacheable. Personalisation hydrates client-side. Cached HTML does not contain user names or cart badges.

## Phase 4 — User Story 2 — Invalidation on admin write (Priority: P1)

**Goal**: Admin writes invalidate the affected tags so changes appear on the public side on the next request.

**Independent Test**: An admin edits a product's price via `/admin/products`; immediately curl the public `/product/<slug>` page — the new price appears on the first request after the edit.

### Tests (write first)

- [ ] T012 [P] [US2] Extend `tests/unit/server/admin/products.test.ts`:
      assert `updateProductScalars` calls the invalidator with
      `[CATALOG_TAG, productTag(slug)]` on success; doesn't call it on
      validation failure.
- [ ] T013 [P] [US2] Extend `tests/unit/server/admin/reviews.test.ts`:
      assert `setReviewHidden` and `deleteReview` call the invalidator
      with `[productTag(slug), reviewsTag(slug)]` on success.

### Implementation

- [ ] T014 [US2] Wire `invalidateTags(...)` into
      `src/lib/server/admin/products.ts` after `logAdminWrite()` in
      `updateProductScalars` and `toggleFeatured`. Errors caught and
      logged, not bubbled.
- [ ] T015 [US2] Wire `invalidateTags(...)` into
      `src/lib/server/admin/reviews.ts` in `setReviewHidden` (joined
      product slug is already on `AdminReviewRow`) and `deleteReview`
      (refactor: look up product slug before the delete).

### BDD

- [ ] T016 [US2] Add `tests/bdd/features/caching.feature`:
      `Scenario: Admin edit shows on public page immediately` —
      admin updates a price, public product page reflects the new
      price within one request.

**Checkpoint**: Invalidation works end-to-end. Stale cache doesn't survive an admin write.

## Phase 5 — User Story 3 — Graceful miss (Priority: P2)

**Goal**: Verify that a cache miss never breaks the page.

- [ ] T017 [US3] Add a BDD scenario:
      `Scenario: First request after invalidation renders correctly` —
      after an invalidation, the next request gets a 200 with the
      expected content (and `x-vercel-cache: MISS` on that first
      request).

## Phase 6 — Polish & Measurement

- [ ] T018 [PERF] Capture the **before** baseline:
      `k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/sustained.js`
      and `tests/load/journey.js`. Save the summary output in a new file
      `docs/load-test-results.md` under a "Before catalog edge caching"
      heading.
- [ ] T019 [PERF] Capture the **after** results after this feature ships
      to prod. Append to `docs/load-test-results.md` and verify SC-001
      through SC-006 are met. If `route:catalog` p95 didn't drop > 50 %,
      something is wrong with the cache headers — investigate.
- [ ] T020 [P] Add ADR 0008 to `docs/architecture-decisions.docx` via
      `scripts/build-docs.js`: "Vercel edge cache with tag invalidation
      over no-cache / in-memory-only / Cloudflare-in-front / dedicated
      Redis."
- [ ] T021 Run `npm run check`, `npx vitest run`, `npm run lint`. All
      green.
- [ ] T022 Smoke-check locally: dev server, admin edits a price, public
      `/product/<slug>` shows new price after refresh.
- [ ] T023 Commit the slice (one commit, ref
      `specs/003-catalog-edge-caching/spec.md` in the message).

## Dependencies & Execution Order

- Phase 2 first (helper + endpoint) — everything else depends on it.
- Phase 3 (US1) and Phase 4 (US2) can run in parallel within their own files; the BDD scenario in T016 needs T014 to have landed.
- Phase 5 (US3) is small, ride along with Phase 4.
- Phase 6 measurement (T018) is the **before** baseline — must run **before** Phase 3 ships to prod, otherwise the comparison is meaningless. T019 runs after deploy.

## Traceability

| Task                              | Story | FR(s)                        | SC(s)                  |
| --------------------------------- | ----- | ---------------------------- | ---------------------- |
| T001, T002, T003                  | INFRA | FR-008                       | SC-003                 |
| T004                              | INFRA | FR-002                       | SC-004                 |
| T005, T006, T007, T008, T009      | US1   | FR-001, FR-002, FR-005, FR-006, FR-007 | SC-001, SC-002, SC-004, SC-006 |
| T010, T011                        | US1   | FR-001                       | SC-001                 |
| T012, T013, T014, T015, T016      | US2   | FR-003, FR-004, FR-008       | SC-003                 |
| T017                              | US3   | FR-005, FR-010               | SC-005                 |
| T018, T019                        | PERF  | FR-009                       | SC-001, SC-002, SC-006 |

## Notes

- The before/after k6 numbers in `docs/load-test-results.md` are the load-bearing portfolio artefact for this feature. Without them, the spec's measurable success criteria are unverified claims.
- Cache invalidation failures are deliberately swallowed — the admin's save must succeed even if Vercel's invalidation API is briefly unreachable. The audit log captures the attempt either way.

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

- [x] T001 [INFRA] ~~Install `@vercel/cache`~~ **Skipped** — v1 went TTL-only (see spec "What actually shipped"). No new runtime dep.

## Phase 2 — Foundational (blocking)

**Goal**: Land the response-header policy and the personalisation endpoint so the cached SSR HTML stays user-state-free.

- [x] T002 [INFRA] ~~Add `src/lib/server/cache-tags.ts`~~ **Skipped** — no programmatic invalidation in v1, so no tag-name helpers needed.
- [x] T003 [P] [INFRA] ~~Unit tests for the tag helpers~~ **Skipped** for the same reason.
- [x] T004 [INFRA] Add `src/routes/api/me/+server.ts` returning
      `{ user, cartCount }` for the client-side header hydration.
      `Cache-Control: private, no-store`. **Done** in commit `691a687`.

**Checkpoint**: The personalisation endpoint is up.

## Phase 3 — User Story 1 — Cache hits (Priority: P1)

**Goal**: Catalog routes return with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (catalog) and `60 / 120` (search, compare) so Vercel's edge serves repeat requests from cache.

**Independent Test**: Hit each cached route twice from `curl -I` against the deploy — the first request has `x-vercel-cache: MISS`, the second has `x-vercel-cache: HIT`.

### Implementation

- [x] T005 [US1] Move the header personalisation in `src/routes/+layout.svelte`:
      render an anonymous-state Header during SSR, then `onMount` fetches
      `/api/me` and re-renders with the user data. **Done** in commit `691a687`.
- [x] T006 [P] [US1] `src/routes/+page.server.ts` —
      `setHeaders({ 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' })`.
      **Done** in commit `691a687`.
- [x] T007 [P] [US1] `src/routes/(shop)/categories/+page.server.ts` — same. **Done**.
- [x] T008 [P] [US1] `src/routes/(shop)/category/[slug]/+page.server.ts` — same. **Done**.
- [ ] T009 [P] [US1] ~~`src/routes/(shop)/product/[slug]/+page.server.ts`~~ **Deferred** — load reads `locals.user` for `wishlisted` + `userReviewed`, can't cache without refactoring those to client-side fetches. Documented in spec "Adjustment 2".
- [x] T010 [P] [US1] `src/routes/(shop)/search/+page.server.ts` —
      `s-maxage=60, stale-while-revalidate=120`. **Done** in commit `691a687`.
- [x] T011 [P] [US1] `src/routes/(shop)/compare/+page.server.ts` — same. **Done**.

Additional task that landed:

- [x] T011a [US1] `src/routes/admin/+layout.server.ts` —
      `setHeaders({ 'Cache-Control': 'private, no-store' })` so admin
      pages explicitly opt out of the edge cache. **Done**.

**Checkpoint**: Five of six originally-cacheable public routes are cacheable. Admin is explicitly excluded. Personalisation hydrates client-side. Cached HTML does not contain user names or cart badges.

## Phase 4 — User Story 2 — Invalidation on admin write (Priority: P1)

**Goal (revised for v1)**: Admin writes appear on the public side within ~60 seconds via TTL expiry. Tighter immediate-invalidation deferred — see spec "Adjustment 1".

- [x] T012 [P] [US2] ~~Extend unit tests for the invalidator wiring~~ **Skipped** — no invalidator in v1.
- [x] T013 [P] [US2] Same. **Skipped**.
- [x] T014 [US2] ~~Wire `invalidateTags` into admin products~~ **Skipped**.
- [x] T015 [US2] ~~Wire `invalidateTags` into admin reviews~~ **Skipped**.
- [ ] T016 [US2] BDD scenario for the 60-second appearance: deferred to follow-up.

**Checkpoint**: TTL-only suffices for v1 traffic. Re-evaluate if SC-003's "immediate" semantics become operationally important.

## Phase 5 — User Story 3 — Graceful miss (Priority: P2)

**Goal**: Verify that a cache miss never breaks the page.

- [ ] T017 [US3] Deferred — Vercel's cache primitive is already
      origin-fallback by design, and the smoke test (`tests/load/smoke.js`)
      already exercises every cached route with marker-content assertions
      every time CI runs. The behavioural property is covered by the
      existing test, just not under that specific scenario name.

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

| Task                         | Story | FR(s)                                  | SC(s)                          |
| ---------------------------- | ----- | -------------------------------------- | ------------------------------ |
| T001, T002, T003             | INFRA | FR-008                                 | SC-003                         |
| T004                         | INFRA | FR-002                                 | SC-004                         |
| T005, T006, T007, T008, T009 | US1   | FR-001, FR-002, FR-005, FR-006, FR-007 | SC-001, SC-002, SC-004, SC-006 |
| T010, T011                   | US1   | FR-001                                 | SC-001                         |
| T012, T013, T014, T015, T016 | US2   | FR-003, FR-004, FR-008                 | SC-003                         |
| T017                         | US3   | FR-005, FR-010                         | SC-005                         |
| T018, T019                   | PERF  | FR-009                                 | SC-001, SC-002, SC-006         |

## Notes

- The before/after k6 numbers in `docs/load-test-results.md` are the load-bearing portfolio artefact for this feature. Without them, the spec's measurable success criteria are unverified claims.
- Cache invalidation failures are deliberately swallowed — the admin's save must succeed even if Vercel's invalidation API is briefly unreachable. The audit log captures the attempt either way.

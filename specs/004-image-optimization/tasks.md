---
description: 'Tasks: Image Optimization'
---

# Tasks: Image Optimization

**Input**: Design documents from `specs/004-image-optimization/`

**Prerequisites**: spec.md, plan.md, checklists/requirements.md (all green).

**Tests**: Web Vitals + Lighthouse cover SC layer; unit tests unchanged.

## Format: `[ID] [P?] [Story] Description`

- `[P]` — different files, can land in parallel.
- `[Story]` — `US1` (CLS), `US2` (payload), `US3` (lazy), `INFRA` (shared scaffolding), `PERF` (measurement).

## Phase 1 — Setup

- [x] T001 [INFRA] `vercel.json` — `images.remotePatterns` for `images.unsplash.com` + `**.supabase.co`; `sizes`, `formats`, `minimumCacheTTL`. **Done**.

## Phase 2 — Foundational (blocking)

- [x] T002 [INFRA] `src/lib/components/Image.svelte` — wrapper component
      around `<img>` that routes through `/_vercel/image`, builds 1x/2x
      srcset, hard-codes width/height, defaults to lazy, accepts a
      `priority` prop. Dev fallback returns the bare URL. **Done**.

**Checkpoint**: The component compiles, lints clean, typechecks clean.

## Phase 3 — User Story 1 + 2 + 3 — Replace existing `<img>` (P1 / P1 / P2)

**Goal**: Move every product image through the new component so it gets CLS-locked, payload-shrunk, and lazy-loaded by default.

- [x] T003 [P] [US1+2+3] `src/lib/components/product/ProductCard.svelte` —
      replace `<img>` with `<Image>` at 400 × 300. Accepts a new `priority`
      prop so consumers (`ProductGrid`) can mark above-the-fold cards
      eager. **Done**.
- [x] T004 [P] [US1+2+3] `src/routes/(shop)/product/[slug]/+page.svelte` —
      hero `<img>` becomes `<Image>` at 1200 × 900, `priority` on the
      first image. Thumbnail strip becomes `<Image>` at 120 × 90. **Done**.
- [x] T005 [P] [US1+2+3] `src/routes/(shop)/cart/+page.svelte` —
      line-item `<img>` at 224 × 168. **Done**.
- [x] T006 [P] [US1+2+3] `src/routes/(shop)/account/+page.svelte` —
      recommendation + wishlist `<img>` at 400 × 300. **Done**.

**Checkpoint**: All product images route through `<Image>`. Lint + typecheck green.

## Phase 4 — Polish & Measurement

- [ ] T007 [PERF] Capture **before** Lighthouse + DevTools network on `/`
      against the deploy. Save `docs/lighthouse-before.html`; record total
      image bytes in `docs/load-test-results.md` "Image Vitals" section.
- [ ] T008 [PERF] Capture **after** Lighthouse + DevTools network on `/`
      post-deploy. Save `docs/lighthouse-after.html`; record delta.
- [ ] T009 [PERF] Capture a Vercel Speed Insights screenshot after one
      week of real-user data showing CLS/LCP for `/`, `/category/<slug>`,
      `/product/<slug>` before/after.
- [x] T010 [P] Add ADR 0009 — Vercel image-optimization endpoint over
      `@sveltejs/enhanced-img` / third-party library. **Done** in same
      commit batch.
- [ ] T011 Commit + push.

## Dependencies & Execution Order

- Phase 1 + 2 must land together (the component needs `vercel.json` to actually fetch through `/_vercel/image` in production).
- Phase 3 tasks are all `[P]` — different files, no shared edits — can run in parallel.
- Phase 4 measurement (T007) needs the deploy to happen for the after run (T008); ADR (T010) and commit (T011) gate the deploy.

## Traceability

| Task                   | Story                            | FR(s)                                                  | SC(s)                          |
| ---------------------- | -------------------------------- | ------------------------------------------------------ | ------------------------------ |
| T001, T002             | INFRA                            | FR-002, FR-003                                         | SC-001, SC-002                 |
| T003, T004, T005, T006 | US1+2+3                          | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-008 | SC-001, SC-002, SC-003, SC-005 |
| T007, T008, T009       | PERF                             | (measurement)                                          | SC-002, SC-003, SC-004         |
| T010                   | Principle IV (tracked decisions) | —                                                      | —                              |

## Notes

- The dev-mode fallback in `Image.svelte` (`import.meta.env.DEV` → pass URL through) is what keeps local dev working. Vercel's `/_vercel/image` endpoint doesn't exist in `npm run dev`.
- Image transformation counts against Vercel's free-tier quota only on the first request per source-and-size combination. Subsequent requests hit the edge cache; no quota cost.
- The `<picture>` element pattern was considered for explicit AVIF/WebP/JPEG sources. Rejected — Vercel's transformer reads the request's `Accept` header and negotiates format server-side, so `<img>` with `srcset` is enough and the markup stays simple.

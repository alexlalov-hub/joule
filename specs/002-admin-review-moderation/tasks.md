---
description: 'Tasks: Admin Review Moderation'
---

# Tasks: Admin Review Moderation

**Input**: Design documents from `specs/002-admin-review-moderation/`

**Prerequisites**: spec.md, plan.md, checklists/requirements.md (all green).

**Tests**: Required (constitution Principle III, 85% line gate).

**Organization**: One commit per slice. Story tags map back to spec.md.

## Format: `[ID] [P?] [Story] Description`

- `[P]` — different files, can land in parallel.
- `[Story]` — `US1` (P1 hide/show), `US2` (P2 delete), `US3` (P1 access control), `INFRA` (shared scaffolding).

## Phase 1 — Setup

Nothing project-wide to set up.

## Phase 2 — Foundational (blocking)

**Goal**: Get the `hidden_at` column and the tightened read policy into the database so the rest of the feature has a stable schema to build against.

- [ ] T001 [INFRA] Write `supabase/migrations/20260519140000_reviews_hidden.sql`:
      add `hidden_at timestamptz`, partial index on the column, drop and
      recreate the `reviews readable` policy with
      `using (hidden_at is null or public.is_admin())`.
- [ ] T002 [INFRA] **Operator task** — apply the migration to the linked Supabase project (Studio SQL editor or `supabase db push`).
- [ ] T003 [INFRA] Update `src/lib/server/db/types.ts` `ReviewsRow` to include `hidden_at: string | null`.

**Checkpoint**: Schema is current. Customer-side reads of `reviews` already filter out hidden rows via RLS.

## Phase 3 — User Story 3 — Access Control (Priority: P1)

**Goal**: Confirm the existing route guard + the existing admin RLS policies cover the new endpoints. No new code required — this slice is a verification phase.

- [ ] T004 [US3] Add one BDD scenario to `tests/bdd/features/admin.feature` for `/admin/reviews` (signed-out → /login), matching the existing two scenarios.

**Checkpoint**: Access control is covered for the new route by the existing layout guard. No regressions.

## Phase 4 — User Story 1 — Hide and Show (Priority: P1)

**Goal**: An admin can hide / show a review from the moderation queue.

**Independent Test**: An admin signed in opens `/admin/reviews`, clicks Hide on a row, refreshes the public product page → review gone; clicks Show on the same row, refresh → review back.

### Tests (write first)

- [ ] T005 [P] [US1] Unit tests for `listAdminReviews` in `tests/unit/server/admin/reviews.test.ts` — null client, default filter, visible filter, hidden filter, supabase error path.
- [ ] T006 [P] [US1] Unit tests for `setReviewHidden` — null client, happy path (hide), happy path (show), RLS-denial path → `forbidden`, not-found path.

### Implementation

- [ ] T007 [US1] Add `src/lib/server/admin/reviews.ts`:
      `AdminReviewRow`, `AdminReviewFilter`, `AdminReviewError`,
      `listAdminReviews`, `setReviewHidden`, `logModeration`.
- [ ] T008 [US1] Add `src/routes/admin/reviews/+page.server.ts`:
      `load` parses filter, calls `listAdminReviews`; `actions.hide` and
      `actions.show` call `setReviewHidden`.
- [ ] T009 [US1] Add `src/routes/admin/reviews/+page.svelte`:
      filter chips (All / Visible / Hidden), table with one form per
      action per row, inline error rendering, hidden rows faded.
- [ ] T010 [US1] Add a "Reviews" link to the admin nav in
      `src/routes/admin/+layout.svelte`.

**Checkpoint**: An admin can hide / show. The change is reflected on the public side on the next request via RLS.

## Phase 5 — User Story 2 — Permanent Delete (Priority: P2)

**Goal**: An admin can permanently delete a review, gated by a confirmation prompt.

**Independent Test**: An admin clicks Delete, confirms the prompt, the row is gone from the admin list and from the public side.

### Tests (write first)

- [ ] T011 [P] [US2] Unit tests for `deleteReview` — null client, happy path, idempotent on a missing row, RLS-denial → `forbidden`.

### Implementation

- [ ] T012 [US2] Add `deleteReview(sb, adminUserId, id)` to `src/lib/server/admin/reviews.ts`.
- [ ] T013 [US2] Add `actions.delete` to `src/routes/admin/reviews/+page.server.ts`.
- [ ] T014 [US2] Add the Delete button to `+page.svelte` with an inline
      `onsubmit={(e) => !confirm('Permanently delete this review?') && e.preventDefault()}`
      so a non-JS browser still gets the prompt via the form's native confirm.

**Checkpoint**: All three actions (hide, show, delete) work. Feature is complete for v1.

## Phase 6 — Polish & Cross-Cutting

- [ ] T015 Run `npm run check`, `npx vitest run`, `npm run lint`, `npx vitest run --coverage`. Confirm gates green.
- [ ] T016 Smoke-check locally: hide a review, see it disappear from `/product/<slug>`; show it, see it reappear; delete it, see it gone for good.
- [ ] T017 Commit the slice (one commit, ref `specs/002-admin-review-moderation/spec.md`); push to `origin/week-05-admin`.

## Dependencies & Execution Order

- Phase 2 first (migration) — everything else depends on the column existing.
- Phase 3 is a quick test-only addition; can run alongside Phase 4.
- Phase 4 (US1) and Phase 5 (US2) share files, so within each phase tests precede implementation.
- Polish at the end.

## Traceability

| Task                               | Story | FR(s)                                          | SC(s)          |
| ---------------------------------- | ----- | ---------------------------------------------- | -------------- |
| T001, T002, T003                   | INFRA | FR-006, FR-008                                 | SC-002, SC-003 |
| T004                               | US3   | FR-007                                         | SC-002         |
| T005, T006, T007, T008, T009, T010 | US1   | FR-001, FR-002, FR-003, FR-004, FR-009, FR-010 | SC-001, SC-003 |
| T011, T012, T013, T014             | US2   | FR-005, FR-009                                 | SC-005         |

## Notes

- Tests precede implementation; verify they fail before the implementation lands.
- Hidden_at on a deleted row is moot — delete removes the whole row regardless of state.
- The audit log uses the same `[admin]` prefix as slice 001 so logs are greppable together.

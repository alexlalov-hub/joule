---
description: 'Tasks: Admin Product Management'
---

# Tasks: Admin Product Management

**Input**: Design documents from `specs/001-admin-product-management/`

**Prerequisites**: spec.md, plan.md, checklists/requirements.md (all green)

**Tests**: Required. The project's constitution (Principle III) sets a 85% line coverage gate plus BDD scenarios at the access-control boundary; the relevant test tasks are inline below.

**Organization**: Tasks are grouped by user story so each priority can land as its own commit. Story tags map back to spec.md's user stories.

## Format: `[ID] [P?] [Story] Description`

- `[P]` — can run in parallel with other `[P]` tasks (different files, no shared edits).
- `[Story]` — `US1` (P1 inline price/stock), `US2` (P2 featured toggle), `US3` (P1 access control). `INFRA` covers shared scaffolding.
- Paths are repo-relative.

## Phase 1 — Setup

Nothing project-wide to set up. Spec-Kit, the test runners, and the route conventions are already in place.

## Phase 2 — Foundational (blocking)

**Goal**: Land the access-control rail before any admin write code runs against it. This phase is what makes US3 verifiable from day one and gives US1 / US2 a safe place to build.

- [x] T001 [INFRA] Add `isAdmin()` helper at `src/lib/server/auth.ts` (done in the previous commit slice — confirmed at HEAD).
- [x] T002 [INFRA] Add admin RLS migration at `supabase/migrations/20260519120000_admin_rls_policies.sql` (done — confirmed at HEAD). The migration creates `public.is_admin()` and the `products admin update / insert` policies the plan depends on.
- [ ] T003 [INFRA] **Operator task** — apply migrations `20260518120000_mark_order_paid_rpc.sql` and `20260519120000_admin_rls_policies.sql` to the linked Supabase project (Supabase Studio → SQL editor, or `supabase db push` once the CLI is linked). Not blocked by code; called out so the slice ships with the policy live.
- [ ] T004 [INFRA] Create empty folder `src/lib/server/admin/` with an `index.ts` re-export. Keeps admin server code out of the customer code path.

**Checkpoint**: RLS policies enforce admin-only writes at the database layer; the route layer is the next slice.

## Phase 3 — User Story 3 — Access Control (Priority: P1)

**Goal**: Two-layer access control: a SvelteKit layout guard for `/admin/*`, and the RLS policies from Phase 2 as the safety net. Non-admins get 303'd back to the home page; signed-out visitors get 303'd to login.

**Independent Test**: Run the new BDD scenarios in `tests/bdd/features/admin.feature`. Without admin code yet, only the guard scenarios need to pass; they assert "non-admin visiting `/admin/products` is redirected" and "admin visiting `/admin` sees the shell."

### Tests (write first)

- [ ] T005 [P] [US3] Unit tests for `isAdmin()` in `tests/unit/server/auth.test.ts` — covers null client, null user, profile not found, role `customer`, role `admin`, and Supabase error path.
- [ ] T006 [P] [US3] BDD feature at `tests/bdd/features/admin.feature` with three scenarios: (a) admin loads `/admin` and sees the dashboard, (b) signed-in customer loads `/admin/products` and is redirected to `/`, (c) signed-out visitor loads `/admin` and is redirected to `/login`.

### Implementation

- [ ] T007 [US3] Add `src/routes/admin/+layout.server.ts` with the role-guard `load`: signed-out → `/login?redirect=...`; signed-in non-admin → `/`; admin → `return { adminUser }`.
- [ ] T008 [P] [US3] Add `src/routes/admin/+layout.svelte` — minimal shell (header with "Admin" badge, nav with Dashboard / Products, footer-free). No client state library.
- [ ] T009 [P] [US3] Add `src/routes/admin/+page.server.ts` and `+page.svelte` — small dashboard listing the three quick counts (total products, featured count, low-stock count where `stock_qty < 5`). Server-side only; uses the user-bound `locals.supabase`.

**Checkpoint**: A non-admin cannot reach any admin page. An admin sees the shell and the dashboard. Tests for US3 are green.

## Phase 4 — User Story 1 — Inline Price + Stock Edits (Priority: P1)

**Goal**: An admin can list every product and change `price_cents` or `stock_qty` inline.

**Independent Test**: An admin visits `/admin/products`, edits one row's price from 49900 to 45900 cents, saves, and sees the new value on the public product page on next request.

### Tests (write first)

- [ ] T010 [P] [US1] Unit tests for `listAdminProducts` in `tests/unit/server/admin/products.test.ts` — uses the existing supabase-stub helper; asserts the ordering, the column selection, and behaviour on a null client.
- [ ] T011 [P] [US1] Unit tests for `updateProductScalars` in the same file — happy path (valid patch), validation rejects (negative price, non-integer stock, absurd price), RLS denial path translates to a typed `AdminWriteError` with code `forbidden`.

### Implementation

- [ ] T012 [US1] Add `src/lib/server/admin/products.ts` exporting `listAdminProducts`, `updateProductScalars`, `AdminWriteError`. Include the audit-log helper `logAdminWrite` that writes a JSON line prefixed `[admin]` via `console.info`.
- [ ] T013 [US1] Add `src/routes/admin/products/+page.server.ts` — `load` calls `listAdminProducts(locals.supabase)`; `actions.update` parses the form, calls `updateProductScalars`, returns `{ ok: true, id }` or `fail(400 | 403, { id, error })`.
- [ ] T014 [US1] Add `src/routes/admin/products/+page.svelte` — `<table>` with one `<form method="POST" action="?/update" use:enhance>` per row. Number inputs for price (in pounds — convert to cents server-side) and stock; inline error rendering above each row on a failed save; success state shown for ~2s via a `flash` field.

**Checkpoint**: Admin can change price and stock on every row. Public product page reflects the change on next SSR render.

## Phase 5 — User Story 2 — Featured Toggle (Priority: P2)

**Goal**: An admin can flip a product's `featured` flag from the list view without leaving the page.

**Independent Test**: Toggle one product off-featured, reload `/`, the product is no longer in the featured strip; toggle it back, refresh `/`, it's back.

### Tests (write first)

- [ ] T015 [P] [US2] Extend `tests/unit/server/admin/products.test.ts` with a `toggleFeatured` block (happy path + RLS denial translates to `forbidden`).

### Implementation

- [ ] T016 [US2] Add `toggleFeatured(sb, id, next)` to `src/lib/server/admin/products.ts` (thin wrapper over `updateProductScalars`).
- [ ] T017 [US2] Add `actions.toggleFeatured` to `src/routes/admin/products/+page.server.ts`.
- [ ] T018 [US2] Add a `<form action="?/toggleFeatured" use:enhance>` with a checkbox per row in `+page.svelte`. Optimistic UI is out of scope for v1; the round-trip is fast enough at 50 rows.

**Checkpoint**: All three user stories work independently. The admin slice is feature-complete for v1.

## Phase 6 — Polish & Cross-Cutting

- [ ] T019 [P] Add an ADR row to `docs/architecture-decisions.docx` titled "Admin UI uses request-scoped Supabase client, not service-role" capturing the decision from plan.md Phase 0 Q1.
- [ ] T020 [P] Add a paragraph to `docs/weekly/week-05.docx` under "What I shipped" naming the admin slice and linking back to `specs/001-admin-product-management/spec.md`.
- [ ] T021 Run `npm run check`, `npm test`, `npm run test:coverage`. Confirm: coverage gates green (≥85% lines), all unit tests pass, no typecheck errors.
- [ ] T022 Run `npm run build` to make sure SvelteKit's prerender step survives the new routes.
- [ ] T023 Verify the admin product list page loads in under 1 second locally with `npm run dev` and a logged-in admin session.
- [ ] T024 Commit the slice (one commit, ref `specs/001-admin-product-management/spec.md` in the message); push to `origin/week-05-admin`.

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)** must complete before any phase under "User Stories".
- **Phase 3 (US3)** lands before Phase 4 because the access-control rail is what makes Phase 4's writes safe to test live. The unit tests for US1/US2 do not depend on the layout guard (they go through the stub), so the test-writing tasks for those phases (T010, T011, T015) can be drafted in parallel with Phase 3's implementation.
- **Phase 6 (Polish)** runs after Phases 3–5.

### Within Each Phase

- Tests before implementation (Principle III). For US3, the `auth.test.ts` and `admin.feature` files exist before `+layout.server.ts` is written; the BDD scenarios are expected to fail until the route exists.
- Server helpers (`src/lib/server/admin/products.ts`) land before the page that calls them.

### Parallel Opportunities

- T005 / T006 (US3 tests) — different files, both can be drafted in parallel.
- T008 / T009 (US3 layout shell + dashboard page) — different files; one developer or two parallel agents could split them.
- T010 / T011 / T015 (all under `tests/unit/server/admin/products.test.ts` — these are all in the same file, so they're NOT [P] amongst themselves) — keep sequential within the file.
- T019 / T020 (docs polish) — different files, can run in parallel.

## Implementation Strategy

The MVP increment is Phase 2 + Phase 3 + Phase 4 (US3 + US1). That delivers the smallest thing that's useful: an admin can edit price and stock, and nobody else can. US2 (featured toggle) is an obvious next slice on top of the same surface area.

Stop and validate after each phase. After Phase 4, an admin should have a working "edit price / edit stock" workflow with no leaks at either layer; that's enough to demo before adding the featured toggle in Phase 5.

## Traceability

| Task                  | Story | FR(s)                                                  | SC(s)                  |
| --------------------- | ----- | ------------------------------------------------------ | ---------------------- |
| T005, T007            | US3   | FR-005                                                 | SC-002                 |
| T006                  | US3   | FR-005, FR-006                                         | SC-002                 |
| T012, T013, T014      | US1   | FR-001, FR-002, FR-003, FR-007, FR-008, FR-009, FR-010 | SC-001, SC-003, SC-004 |
| T016, T017, T018      | US2   | FR-004                                                 | SC-001                 |
| T002 (already landed) | US3   | FR-006                                                 | SC-002                 |
| T019                  | —     | (Principle IV)                                         | —                      |

## Notes

- `[P]` tasks: different files, no dependencies on other in-flight tasks.
- `[Story]` label keeps each row traceable back to a user story; the table above keeps each task traceable to a functional requirement.
- Commit after each phase, not after each task; the per-week squash will collapse them anyway, but the intermediate commits make the diff reviewable on the PR.
- Verify each US's tests fail before its implementation lands. If a test passes before the implementation does, the test is wrong.

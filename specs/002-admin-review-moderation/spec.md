# Feature Specification: Admin Review Moderation

**Feature Branch**: `002-admin-review-moderation`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Admin review moderation: list every review, hide or unhide one without deleting, and hard-delete spam from the same UI"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Hide an off-topic or rude review (Priority: P1)

A customer writes a review that's off-topic, rude, or otherwise unsuitable for the public product page — but isn't outright spam. An admin needs to take the review off the customer-facing site immediately, while keeping the record in the database so the decision can be revisited (un-hidden later) or audited.

**Why this priority**: Hiding is the most common moderation action and the lowest-risk one (reversible, no data loss). Without it, the only way to take a review offline today is to delete the row in Supabase Studio, which is a permanent destructive action a developer has to perform. That doesn't scale to a real moderation pool.

**Independent Test**: An admin signed in opens `/admin/reviews`, clicks "Hide" on one review, refreshes the public `/product/<slug>` page, and the review no longer appears in the public list. The admin then clicks "Show" on the same review and the customer side starts displaying it again.

**Acceptance Scenarios**:

1. **Given** an admin is viewing the admin review list, **When** they click "Hide" on a visible review and the action confirms, **Then** the review is marked hidden in the database and stops appearing on the public product page on the next load.
2. **Given** an admin is viewing a hidden review in the admin list, **When** they click "Show" and the action confirms, **Then** the review is marked visible again and reappears on the public product page.
3. **Given** an admin filters the admin list to "Hidden only", **When** the page renders, **Then** only reviews with a non-null hidden timestamp are listed.

---

### User Story 2 — Permanently delete a spam review (Priority: P2)

A clearly spam or malicious review (link bait, obscenity, copy-paste attack) reaches the admin's queue. Hiding is the wrong action — the review should leave the database entirely so it doesn't take up space or risk being unhidden by mistake.

**Why this priority**: Lower than hide because spam is a smaller share of the review volume in practice; most moderation work is on legitimate-but-unsuitable content. Still important because spam-grade content is exactly what shouldn't be soft-deleted (a "Show" mis-click would re-publish it).

**Independent Test**: An admin clicks "Delete" on a review and confirms the confirmation prompt. The row is gone from the admin list, gone from the database, and gone from the public product page on the next load.

**Acceptance Scenarios**:

1. **Given** an admin is viewing the admin review list, **When** they click "Delete" on a review and confirm the prompt, **Then** the row is permanently removed from the database and the admin list re-renders without it.
2. **Given** an admin clicks "Delete" but dismisses the confirmation prompt, **When** the prompt closes, **Then** no request is sent and the review remains intact.

---

### User Story 3 — Non-admins cannot reach or use the review moderation UI (Priority: P1)

A signed-in customer, a signed-out visitor, or a script tries to load `/admin/reviews` or submit a hide/delete request. The system must refuse access at both the route layer (redirect non-admins) and the database layer (RLS policy on the reviews table refuses the write).

**Why this priority**: Same priority tier as P1 because a hidden review re-published or a wrongly-deleted review by a non-admin is a moderation incident, not a polish issue. The "two layers" rule (route guard + database RLS) is the project's standing principle on access control and has to apply here.

**Independent Test**: From a customer session, GET `/admin/reviews` returns a 303 redirect to home; a direct POST to any moderation action returns a non-200 response and the database row is unchanged. From a signed-out session the same routes redirect to login.

**Acceptance Scenarios**:

1. **Given** a signed-in customer (role = `customer`), **When** they navigate to `/admin/reviews`, **Then** they are redirected away from `/admin/*` and see no admin content.
2. **Given** a signed-out visitor, **When** they navigate to `/admin/reviews`, **Then** they are redirected to the login page.
3. **Given** a non-admin that crafts a direct request to the moderation hide or delete action, **When** the request reaches the database, **Then** the row-level security policy refuses the write because the policy requires the admin role, and the review row is unchanged.

---

### Edge Cases

- **Hidden review on a paginated public page** — the existing public reviews list paginates 5 per page. When some reviews on a page get hidden, the page count and the aspect-rating averages recompute on the next load. Acceptable lag: the next request after the moderation action.
- **Review already deleted by another admin** — an admin clicks Delete on a review that another admin deleted seconds earlier. The action should treat "row not found" as a soft success (the desired end state was reached) rather than a hard error.
- **Concurrent hide / show / delete** — last write wins. Two admins acting on the same review at the same time will produce a definite final state (hidden, shown, or deleted) determined by request order; no optimistic locking required for the admin pool size.
- **Audit log volume** — moderation writes are rarer than catalog writes, so the same `console.info('[admin]', ...)` audit pattern from `001-admin-product-management` is appropriate here; no need for a dedicated table.
- **Self-review by an admin** — an admin posting a review of a product and then later trying to moderate it is allowed; the moderation action treats every review the same regardless of who wrote it. (The bias problem belongs in a separate policy doc, not the UI.)
- **Empty hidden filter** — when no reviews are hidden, the "Hidden" filter shows an empty-state row, not a blank page.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose an admin-only listing of every review at a single URL, including reviews that are hidden from the public site.
- **FR-002**: The listing MUST display, for each review, at minimum: product slug or name, reviewer (id or email), rating, aspect, title, body excerpt, created timestamp, and the current hidden / visible state.
- **FR-003**: The system MUST let an admin transition a review from visible to hidden in one action; the hidden timestamp MUST be recorded so the change is auditable.
- **FR-004**: The system MUST let an admin transition a hidden review back to visible in one action; the hidden timestamp MUST be cleared.
- **FR-005**: The system MUST let an admin permanently delete a review in one action, gated by a client-side confirmation prompt; the row MUST be removed from the database when the action succeeds.
- **FR-006**: The customer-facing product page MUST NOT render hidden reviews; the aspect-rating averages MAY include or exclude hidden reviews — the choice MUST be consistent (hidden reviews excluded is the chosen default for v1).
- **FR-007**: The system MUST refuse, at the route layer, any request to the moderation pages from a session whose profile role is not `admin`; non-admins MUST be redirected to a public page rather than shown a 404.
- **FR-008**: The system MUST refuse, at the database layer, any update or delete on reviews initiated by a non-admin session, regardless of how the request reached the database.
- **FR-009**: The system MUST log each moderation action (admin id, action, review id, timestamp, before/after state) at a level that supports after-the-fact audit; reads MAY skip this log.
- **FR-010**: The admin listing MUST support filtering between "All", "Visible only", and "Hidden only" via a query parameter so an admin can jump straight to the hidden queue.

### Key Entities

- **Review** — the existing `public.reviews` row. New mutable field for this feature: `hidden_at` (timestamp; null when visible). Existing fields untouched: `rating`, `aspect`, `title`, `body`, `user_id`, `product_id`, `created_at`.
- **Profile** — read-only for this feature; the `role` field gates access via the existing `isAdmin()` helper and `public.is_admin()` SQL function.
- **Audit log entry** — same shape and storage as the product-moderation feature: `[admin]`-prefixed JSON line on stdout, captured by Vercel logs.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can hide a review from the list view in under 10 seconds, including page load. (Measured: from clicking the list link to seeing the row marked hidden.)
- **SC-002**: 100% of moderation writes are rejected when the calling session lacks the admin role, verified by automated test against both the route and the database layer.
- **SC-003**: After an admin hides a review, the review stops appearing on the public product page within 60 seconds, in 95% of cases, accounting for SSR cache. (Measured: timestamp of hide vs. timestamp of first public request without the review.)
- **SC-004**: Zero SQL queries needed to perform routine review moderation in the month after this feature ships. (Measured: count of admin SQL sessions in Supabase audit log.)
- **SC-005**: A delete confirmation prompt is shown 100% of the time before a destructive action; no automated tests can hard-delete without dismissing or confirming a prompt. (Measured: by inspecting the action handler — the server side accepts the request unconditionally, the client side surfaces the prompt; both layers verified by tests.)

## Assumptions

- The admin role and RLS policies for `reviews admin update` and `reviews admin delete` already exist from migration `20260519120000_admin_rls_policies.sql`. They do.
- The number of reviews per product is small (≤ 50 in steady state). A single-page admin list without pagination is acceptable for v1; pagination is a candidate for the next slice if review volume grows.
- The existing customer-facing reviews query reads from `public.reviews` and is paginated 5 per page. Adding a `hidden_at` column and an RLS-based filter for non-admins is the cleanest way to keep that query unchanged.
- Aspect-rating averages on the public product page currently aggregate across all reviews. With this feature, the aggregation excludes hidden reviews — this is the right behaviour because a hidden review shouldn't affect the visible rating. The change is invisible to customers and to admins.
- The audit log destination (console / Vercel logs) is acceptable for the volume; a queryable audit table is deferred to a separate feature.
- Two admins acting on the same review at the same time is rare enough to skip optimistic locking. Last write wins.

# Feature Specification: Admin Product Management

**Feature Branch**: `001-admin-product-management`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Admin product management: list products, toggle featured, edit price and stock from an in-app admin UI"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Adjust a product's price and stock (Priority: P1)

A staff member who holds the admin role needs to change the listed price of a product or correct its on-hand stock count without filing a ticket with the developer. They open the admin product list, find the product by name or slug, change the price or stock value inline, save, and see the change reflected on the public storefront on the next page load.

**Why this priority**: This is the smallest slice that makes the admin UI useful at all. Price and stock are the two product fields that change most often in operations. Without this, every price tweak is a SQL job, which doesn't scale past the founder.

**Independent Test**: A user signed in with the admin role can open `/admin/products`, change the price of one product from £499.00 to £459.00, save, and verify the change on the public `/product/<slug>` page. No code deploy required.

**Acceptance Scenarios**:

1. **Given** an admin is signed in and viewing the admin product list, **When** they change a product's price from £499.00 to £459.00 and save, **Then** the new price appears in the list, on the public product page, and in the database.
2. **Given** an admin is editing a product's stock value, **When** they enter a non-negative integer and save, **Then** the new stock count is persisted and shown.
3. **Given** an admin enters a negative number or non-numeric value into the stock field, **When** they try to save, **Then** the form rejects the value and explains why; the database is not touched.

---

### User Story 2 — Toggle featured flag from the list (Priority: P2)

A staff member wants to promote a product to the storefront's "featured" slot, or take a tired one off, without an editor. They open the admin product list and flip a toggle next to the product; the change takes effect immediately.

**Why this priority**: The home page surfaces featured products. Curation is part of the operator role, and the current alternative is editing the `products.featured` column directly in Supabase Studio, which is fine for one person but not for a team.

**Independent Test**: An admin can toggle one product's featured flag on, refresh the public home page, and see the product appear in the featured strip; then toggle it off and confirm it disappears.

**Acceptance Scenarios**:

1. **Given** an admin viewing the admin product list, **When** they toggle a product from "not featured" to "featured" and the toggle confirms, **Then** the product appears in the featured strip on the home page on next load.
2. **Given** an admin toggles a featured product off, **When** the toggle confirms, **Then** the product is removed from the featured strip but still appears in the catalog and category pages.

---

### User Story 3 — Non-admins cannot reach or use the admin UI (Priority: P1)

A signed-in customer, a signed-out visitor, or a malicious script tries to load `/admin/products` or submit a write to it. The system must refuse access at both the route layer and the database layer, and must not leak the existence of admin features in error messages.

**Why this priority**: Same priority tier as P1 because a missing access control here is a security incident, not a polish item. The "two layers" rule (route guard + database RLS) is the project's standing principle on access control.

**Independent Test**: From a non-admin session, GET `/admin/products` returns a non-200 response (302 to home or 403); a direct POST to any admin form action returns a non-200 and the database row is unchanged. From a logged-out session, the same routes redirect to login or return 401.

**Acceptance Scenarios**:

1. **Given** a signed-in customer (role = `customer`), **When** they navigate to `/admin/products`, **Then** they are redirected to the home page (or shown a 403) and do not see any admin content.
2. **Given** a signed-out visitor, **When** they navigate to `/admin/products`, **Then** they are redirected to the login page.
3. **Given** a signed-in customer who crafts a direct write to the admin's update endpoint, **When** the request reaches the database, **Then** the database refuses the write because the row-level security policy requires the admin role, and the product row is unchanged.

---

### Edge Cases

- **Stale featured strip** — the public home page caches the featured list for performance. Acceptable lag: under one minute. Documented in the plan; no real-time push required.
- **Concurrent edits** — two admins editing the same product at the same time. Last write wins. The form does not need optimistic-locking for the first release; this is acceptable for a single-store admin pool of two or three people.
- **Stock change while the product is in a customer's cart** — out of scope for this feature. The cart's read of `stock_qty` happens at checkout, not at admin save time, so a stock cut to zero will surface as "out of stock" at the next checkout step.
- **Empty result on filter** — admin types a search term that matches no product. The list shows an empty-state row, not a blank screen.
- **Negative or absurd input** — negative stock, negative price, price above £100,000. Form-level validation rejects with a clear message; the database CHECK constraint is the second line of defence.
- **Role change mid-session** — a user is demoted from admin to customer while their tab is open. The next admin write fails at the RLS layer; the UI surfaces the failure as "your session no longer has admin access; please sign in again."

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose an admin-only listing of all products at a single URL, paginated or scrollable to handle the current 50-product catalog without performance loss.
- **FR-002**: The system MUST let an admin change a product's price (in the store's currency, two-decimal precision) inline in the list, with form-level validation that the value is a non-negative number under £100,000.
- **FR-003**: The system MUST let an admin change a product's stock count inline, with form-level validation that the value is a non-negative integer.
- **FR-004**: The system MUST let an admin toggle a product's "featured" flag inline, with the change confirmed visually in the list within one second of the save round-trip.
- **FR-005**: The system MUST refuse, at the route layer, any request to the admin pages from a session whose profile role is not `admin`; non-admins MUST be redirected to a public page rather than shown a 404 or admin shell.
- **FR-006**: The system MUST refuse, at the database layer, any write to products initiated by a session whose profile role is not `admin`, regardless of how the request reached the database.
- **FR-007**: The system MUST persist each price, stock, or featured change immediately on save and reflect the change on public storefront pages within one minute (or sooner, allowing for cached pages).
- **FR-008**: The system MUST log each admin write (who, when, which product, which field, before/after values) at a level that allows after-the-fact audit; pure reads MAY skip this log to keep volume manageable.
- **FR-009**: The system MUST surface a clear error message when a write fails at validation, at RLS, or at the database CHECK constraint; the message MUST NOT leak the underlying SQL or row IDs of other tenants.
- **FR-010**: The admin listing MUST display, for each product, at minimum: slug, name, brand, current price, current stock, featured flag. Other fields MAY appear if they fit the layout.

### Key Entities

- **Product** — the catalog row. Mutable fields admins touch: `price_cents`, `stock_qty`, `featured`. Read-only in this feature: `slug`, `name`, `brand`, `description`, `embedding`, `created_at`. Other product fields (specs, images) are out of scope for this feature.
- **Profile** — the per-user row that carries the `role` field (`customer` or `admin`). This feature reads it to gate access; it does not write to it. Promote/demote of admins is a separate feature.
- **Audit log entry** — a per-write record with admin user id, timestamp, product id, field, old value, new value. The first release MAY use server console logs rather than a dedicated table; a follow-up feature can promote it to a queryable table if the volume justifies it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can change a product's price from the list view in under 15 seconds, including page load. (Measured: from clicking the list link to seeing the new price in the row.)
- **SC-002**: 100% of admin writes are rejected when the calling session lacks the admin role, verified by automated test against both the route and the database layer.
- **SC-003**: After an admin saves a price change, the new price is visible on the public product page within 60 seconds, in 95% of cases, accounting for SSR cache. (Measured: timestamp of save vs. timestamp of first public request showing the new value.)
- **SC-004**: Zero SQL queries needed to perform routine catalog edits in the month after this feature ships. (Measured: count of admin SQL sessions in Supabase audit log.)
- **SC-005**: An operator unfamiliar with the codebase can perform the three core actions (edit price, edit stock, toggle featured) on their first attempt without reading documentation, in 90% of cases. (Measured: usability check with two test users, currently informal.)

## Assumptions

- The admin role already exists in the schema (`profiles.role` enum includes `'admin'`). It does. The `handle_new_user` trigger creates new profiles with `role = 'customer'`; promotion to `'admin'` is manual via SQL in Supabase Studio for now.
- Two or three people will hold the admin role at any time. No need for optimistic locking, pessimistic locking, or per-field permissions for the first release.
- The admin UI is desktop-first. A responsive mobile layout is nice-to-have, not in scope; admins doing field work is not the target use case.
- The same Supabase auth cookie that gates the customer-facing app gates the admin UI. No separate admin session, no separate sign-in URL.
- The existing `getSupabaseAdmin` (service-role) client stays reserved for system jobs (Stripe webhooks, seed scripts, the AI rate-limiter). The admin UI must not use it; it must run under the user's auth cookie so RLS applies.
- The current catalog is small enough (50 rows) that pagination is not required. Search and filter are out of scope; a simple alphabetical list is fine for the first release.
- Audit logging to console is acceptable for the first release because the volume is low (a few writes a day) and the team has access to Vercel logs. A queryable audit table is a candidate for a follow-up feature.

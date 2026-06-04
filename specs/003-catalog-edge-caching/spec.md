# Feature Specification: Catalog Edge Caching

**Feature Branch**: `003-catalog-edge-caching`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "Catalog edge caching: cache the catalog read pages at the Vercel edge with tag-based invalidation triggered by admin writes, to drop p95 latency on the hot routes"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Returning visitor hits a warm cache (Priority: P1)

A returning customer visits the home page, a category page, or a product page they've seen before — or one that any earlier visitor has hit since the last admin change. The page renders from the Vercel edge cache without touching Supabase. p95 latency on these routes drops from "Supabase round-trip plus SSR render" to "edge response", which is roughly an order of magnitude.

**Why this priority**: This is the entire reason for the feature. The cacheable catalog routes are responsible for the lion's share of customer-facing traffic (per the weighted mix in `tests/load/sustained.js`, the home page alone is ~24% of requests); making them edge-served is the largest available performance win without rearchitecting.

**Independent Test**: Run `tests/load/sustained.js` against the deployed Vercel URL twice — once before this feature lands and once after. The "before" baseline goes in `docs/load-test-results.md`; the "after" run should show p95 latency on the `catalog` and `product` tag groups dropping by at least 50%.

**Acceptance Scenarios**:

1. **Given** a customer visiting the home page for the second time in a session (or any second visitor after the first), **When** the page renders, **Then** the response headers include a Vercel cache hit indicator (`x-vercel-cache: HIT`) and the response time is under 100 ms from a warm region.
2. **Given** the `tests/load/sustained.js` k6 run against the deploy, **When** measured at the 20-VU hold phase, **Then** the `http_req_duration{route:catalog}` p95 is < 800 ms (current p95 is around 2 s based on the recent journey-test runs).
3. **Given** an anonymous visitor, **When** they hit `/`, **Then** the cached page contains the same HTML every other anonymous visitor sees — no per-user content leaks into the cache.

---

### User Story 2 — Admin edit invalidates the cache immediately (Priority: P1)

An admin opens `/admin/products`, changes a product's price or featured flag, and saves. The change must appear on the public side **immediately on the next request**, not after the cache TTL expires. Without correct invalidation, the cache is worse than no cache — admins would change values and watch the storefront keep showing the old number for minutes or hours.

**Why this priority**: Same priority tier as US1 because a cache without invalidation is broken-by-default for an admin-edited product catalog. The two stories ship together; one without the other isn't usable.

**Independent Test**: An admin signed in opens `/admin/products`, edits a product's price, saves. A second tab (or `curl`) hits `/product/<that-slug>` immediately afterwards — the response must show the new price (and `x-vercel-cache: MISS` on the first request after the edit, `HIT` on the second).

**Acceptance Scenarios**:

1. **Given** a cached product page showing price £499, **When** an admin updates the price to £459 via `/admin/products`, **Then** the next public request to that product page returns £459 (with `x-vercel-cache: MISS` on the first request after the invalidation).
2. **Given** a cached home page showing a featured product, **When** an admin toggles featured off on that product, **Then** the next request to `/` no longer shows the product in the featured strip.
3. **Given** an admin hides a review via `/admin/reviews`, **When** the next public request hits the product page that review was on, **Then** the review no longer appears (RLS already handles this at the DB layer, but the cache must invalidate too, otherwise the cached HTML still includes the now-hidden review).

---

### User Story 3 — A cache miss never breaks the page (Priority: P2)

The cache layer is an optimisation. When a request hits a cold edge node, when Vercel restarts the function, when the TTL expires, when an invalidation just fired — the page must still render correctly from the origin (Supabase + SSR), just slower. No request ever fails because the cache didn't have something.

**Why this priority**: Lower than P1 because Vercel's caching primitive already handles fallback by design — if the cache is empty, the request flows through to the function. The story exists to make this an explicit verified property rather than an assumption.

**Independent Test**: Manually trigger an invalidation (or wait through a TTL), then hit each cached route. Every route must return the same 200 + correct HTML it did before the cache was introduced.

**Acceptance Scenarios**:

1. **Given** the cache has just been invalidated for a product, **When** the next request hits that product page, **Then** the page renders correctly (with `x-vercel-cache: MISS`) and the response is functionally identical to the page rendered with no cache layer at all.
2. **Given** Vercel restarts the function (cold start), **When** the first request after the restart hits any catalog route, **Then** the page renders correctly even though the cache is empty.

---

### Edge Cases

- **Personalised content** — the customer header shows "Sign in" or "Account" based on session state. The cached HTML must NOT include the signed-in state, or anonymous visitors would see one user's name on their page. The header personalisation has to happen client-side or via a non-cached partial. (Implementation: the cookies that gate the user session must NOT be part of the cache key, so anonymous-state HTML is served to everyone and the header re-hydrates client-side.)
- **Cart count badge** — the header shows a cart count for signed-in users. Same constraint as above; must not be in the cached HTML.
- **AI streaming endpoints** — `/assistant`, `/compare` (the verdict route), and review-intelligence are explicitly NOT cached. They're rate-limited, personalised, and produce different outputs for the same input.
- **404 pages** — a product slug that doesn't exist should NOT be cached as a 404, or admins adding new products would see the negative cache for the TTL. 404 responses skip the cache.
- **Search results** — `/search?q=...` is cacheable per-query-string but the cardinality of distinct queries is high. Cache with a short TTL (e.g. 60 seconds) and no admin-write invalidation; the cost of staleness is "search results are 60 s old" which is acceptable.
- **Compare page** — `/compare?slugs=a,b,c` similarly cacheable per-query-string. Same short-TTL approach as search.
- **Admin pages** — `/admin/*` is NEVER cached. Personalised, role-gated, write-heavy. Explicit exclusion.
- **First request to a new product** — admin adds a product, anonymous visitor hits the product page that never existed in cache. Origin renders, cache fills. No special handling needed.
- **Invalidation race** — two admins edit two different products at the same time. Each fires its own invalidation; both products get fresh caches on next request. No coordination needed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The public catalog routes (`/`, `/categories`, `/category/<slug>`, `/product/<slug>`) MUST be served from Vercel's edge cache when a valid cached response exists.
- **FR-002**: The cache MUST NOT vary by user session — every anonymous and signed-in visitor sees the same cached HTML; per-user state (header username, cart count) is hydrated client-side.
- **FR-003**: The system MUST invalidate the catalog cache when an admin writes to `products` (update or insert), so the next public request after an admin save renders fresh HTML.
- **FR-004**: The system MUST invalidate the cache for affected pages when an admin writes to `reviews` (hide / show / delete), so hidden reviews stop appearing on public pages on the next request.
- **FR-005**: The cache MUST NOT serve negative responses (404s, 5xxs) — if the origin returns a non-2xx, that response is not cached.
- **FR-006**: The admin routes (`/admin/*`) MUST NOT be cached at the edge under any circumstance, even with the cache layer enabled globally.
- **FR-007**: The AI endpoints (`/assistant`, `/compare`, `/api/*` for AI features) MUST NOT be cached. They are personalised, rate-limited, and stream-bodied.
- **FR-008**: Cache invalidation MUST execute within the admin action handler — the admin's "Save" round-trip is the point at which the cache becomes stale, not a separate scheduled job.
- **FR-009**: The system MUST measure the latency improvement: a recorded `tests/load/sustained.js` run before and after enabling caching, with results captured in `docs/load-test-results.md`.
- **FR-010**: Cache behaviour MUST be observable — the `x-vercel-cache` response header is present and accurate (`HIT` / `MISS` / `STALE`) on cached routes, so we can verify it's working without instrumentation.

### Key Entities

- **Cache tag** — a string that identifies a group of cached pages. Used by invalidation. For Joule: one tag per affected page-class. Initial design uses three tags: `catalog` (home, categories, category pages), `product:<slug>` (per-product pages), and `reviews:<product-slug>` (reviews fragment on a product page). Admin product writes invalidate `catalog` and `product:<slug>`; admin review writes invalidate `product:<slug>` and `reviews:<product-slug>`.
- **Cache key** — the URL plus the cache-relevant request headers. Joule sets the cache key to "URL only" — no cookies, no user-agent variance, no session.
- **Cache entry** — a stored response. Has a TTL (default 1 hour for catalog pages, 60 s for search/compare); can be evicted by tag invalidation before TTL.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After this feature ships, the `tests/load/sustained.js` k6 run against the deployed URL shows `http_req_duration{route:catalog}` p95 < 800 ms (current p95 is around 2 s).
- **SC-002**: `tests/load/sustained.js` p95 on `route:product` drops to < 1 s (current is around 1.8 s).
- **SC-003**: 100% of admin product writes invalidate the cache for the affected product page within one second, verified by automated test (action runs, request that follows shows updated value).
- **SC-004**: Zero personalised content (user name, cart count, "Sign in" vs avatar) appears in any cached HTML response, verified by inspecting the cached response body — only the anonymous-state header is present, header re-hydrates client-side.
- **SC-005**: The smoke test (`tests/load/smoke.js`) continues to pass — no functional regression from the cache layer.
- **SC-006**: The journey test's `journey_duration{journey:browse}` p95 drops by at least 30%, reflecting the cumulative win of caching every page in the journey rather than just the headline route.

## Assumptions

- Vercel provides edge caching via the `Cache-Control: s-maxage=...` response header. SvelteKit's `event.setHeaders()` is the integration point.
- Admin pool stays small (2-3 admins, < 10 writes per day) so cache hit rates stay high (> 95% on the hot routes).
- The catalog is read-heavy: ~99% of requests are reads, ~1% are admin writes. This is the assumption that makes caching worthwhile.
- The `src/lib/cache.ts` in-memory request cache from earlier weeks is complementary to (not replaced by) the edge cache. Edge cache cuts the function invocation entirely; the request cache reduces Supabase round-trips inside a single function invocation.
- Customers are tolerant of "the home page shows the same as someone else's home page" because the home page IS the same — it's anonymous catalog content. Personalisation is in the header, not in the cached page body.

## What actually shipped (v1)

The spec above was written before implementation. Two adjustments landed when the code actually went in; recording them here so the doc stays honest rather than aspirational.

### Adjustment 1 — TTL-only invalidation, no programmatic tag purge

US2 (admin edit invalidates the cache immediately) was relaxed from **immediate** to **within ~60 seconds** in v1.

Vercel's CDN tag-purge API does exist (`POST /v1/data-cache/purge-by-tag`) but requires a deployment-scoped API token in env (`VERCEL_API_TOKEN` + `VERCEL_TEAM_ID`). That's exactly the same "env-var brittleness" pattern that pushed PostHog out in ADR 0007 — a missing token would silently leave stale pages live and the build would not fail to catch it.

v1 chose **`s-maxage=60` + `stale-while-revalidate=300`** on the catalog routes (and `60 / 120` on search and compare). Admin writes appear on the public side within ~60 s; the SWR window keeps subsequent requests fast while the cache refreshes in the background. Zero new env vars.

The trade-off: SC-003 ("100% of admin product writes invalidate the cache for the affected product page within one second") is **not met** in v1. It's softened to "within 60 seconds" and re-evaluated when (if) traffic patterns make the tighter latency worth the operational cost of the env-var pair.

### Adjustment 2 — product page deferred from caching

US1's scope listed `/product/<slug>` as cacheable. In implementation the product page's server load reads `locals.user` (for `wishlisted` and `userReviewed`), so caching the response would leak per-user signals to other visitors.

v1 leaves `/product/<slug>` on origin. Five of six originally-cacheable routes are cached (`/`, `/categories`, `/category/<slug>`, `/search`, `/compare`); the sixth needs a small refactor to move `wishlisted` and `userReviewed` to client-side fetches (similar to the header personalisation) before it can join the cached set.

SC-002 ("`route:product` p95 drops to < 1 s") is therefore not in scope for v1 — moved to a follow-up. SC-001 (catalog routes) remains the load-bearing measurement target.

### Adjustment 3 — assumed baseline was wrong; SCs reframed from improvement to regression-prevention

The spec's "current p95 ~2 s" / "drop p95 to < 800 ms" framing was based on an estimated baseline, not a measured one. Before opening the PR, the actual baseline was captured against the live deploy (uncached state) via `tests/load/sustained.js` and `tests/load/journey.js` — output saved under `docs/k6-runs/before-*.txt`. Key numbers:

| Metric               | Spec assumption |        **Actual measured** |
| -------------------- | --------------: | -------------------------: |
| `route:catalog` p95  |       ~2 000 ms |                 **327 ms** |
| `route:product` p95  |       ~1 800 ms |                 **453 ms** |
| `route:search` p95   |      (unstated) |                     251 ms |
| `route:compare` p95  |      (unstated) |                     272 ms |
| Aggregate p95        | (implied 2–3 s) |                 **383 ms** |
| `journey:browse` p95 |      (unstated) | 6.13 s (mostly think-time) |
| `http_req_failed`    |      (unstated) |                     0.00 % |

The site was already extremely fast for an uncached state — Vercel serverless cold starts on a small catalog over a fast Postgres query simply don't cost much. **SC-001 and SC-002's "drop p95 by ≥ 50 %" targets are not achievable because there isn't 50 % of headroom; the catalog is already 4× under the original 800 ms target.**

**The feature still ships, but the framing changes**:

- **SC-001 reframed** — instead of "`route:catalog` p95 < 800 ms", the target becomes "`route:catalog` p95 stays under 400 ms while function invocation count drops by ≥ 90 % vs. the no-cache baseline." The latency was already fine; the win is now about cost (fewer function invocations = lower Vercel bill) and resilience (TTL + SWR means a Supabase outage doesn't take the catalog offline for the duration of the TTL window).
- **SC-006 reframed** — `journey:browse` p95 was already 6.13 s in baseline and most of that is the script's simulated `sleep()` think-time, not HTTP. The 30 % improvement target was unreachable from the start. New target: journey-mean HTTP time per page < 200 ms in the cached state.
- **SC-002, SC-003, SC-004, SC-005** — unchanged but expected to be near-no-ops on the latency axis; main benefit is now operational (cost + resilience).

**Why ship anyway**: the cache is still load-bearing for spike resilience (the `spike.js` k6 script now finds an easier path) and for cost as traffic grows. The personalisation move-out (`/api/me` hydration, anonymous SSR) is also a correctness improvement independent of latency — without it, a future cached deploy would leak user state.

**Methodological note for the retro**: the failure mode here was writing measurable targets without measuring the baseline first. The constitution's Principle III calls for "real coverage gates" — this experience generalises to "real measurement gates for any performance claim." Future perf specs run the before-baseline as task T000 before the SCs are finalised.

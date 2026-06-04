# Feature Specification: Image Optimization

**Feature Branch**: `004-image-optimization`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "Image optimization: serve product images in modern formats at the right resolution, lock width/height to eliminate CLS, lazy-load off-screen images"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Page stops jumping around while images load (Priority: P1)

A customer opens a product page on mobile. Today the text loads first; a second later the product image arrives and shoves the price and description down the screen. The customer who'd already moved their thumb to tap "Add to cart" now taps something else. This is the textbook Cumulative Layout Shift problem and Vercel Speed Insights will be flagging it.

**Why this priority**: CLS is one of the three Web Vitals Google uses for ranking. It's also the most annoying perceived-quality issue on a mobile catalog. Fixing it is mechanically tiny (add `width` and `height` attributes) so the cost-benefit ratio is dramatic.

**Independent Test**: Open `/product/<slug>` on a throttled connection in Chrome DevTools. Watch the layout while images load. After this feature: every image box reserves its space immediately, nothing jumps. Vercel Speed Insights' CLS metric on the route drops to near zero.

**Acceptance Scenarios**:

1. **Given** a customer on a slow connection loads `/product/<slug>`, **When** the image is still downloading, **Then** the price and the "Add to cart" button stay in their final position — no layout shift when the image arrives.
2. **Given** a customer scrolls through `/category/<slug>` with 30 product cards, **When** each card's image loads, **Then** none of the surrounding cards reflow.
3. **Given** Vercel Speed Insights collects real-user metrics after this feature ships, **When** a week of data accumulates, **Then** the CLS score for `/` and `/category/<slug>` drops below 0.1 (the "Good" threshold).

---

### User Story 2 — Mobile users download a lot less data (Priority: P1)

A customer on mobile data hits the home page. Today the browser downloads the full-resolution product photos — typically 200–300 KB each as JPGs, served regardless of the actual display size. With 8 featured products, that's 1.5–2 MB of images alone, before any HTML / CSS / JS. The page feels slow and burns through the data plan.

**Why this priority**: This is the largest available payload reduction for the customer-facing pages. AVIF / WebP at the right resolution shrinks each image by 60–80%; lazy loading defers off-screen images entirely. The win shows up directly in LCP (Largest Contentful Paint), which Vercel Speed Insights will track.

**Independent Test**: Load `/` with Chrome DevTools network throttling on "Fast 4G". Record total image bytes downloaded. After this feature: total drops by at least 60% on the same page.

**Acceptance Scenarios**:

1. **Given** a customer on a modern browser (Chrome, Safari, Firefox) loads any catalog page, **When** images are requested, **Then** the responses come back as AVIF (preferred) or WebP, not the original JPG.
2. **Given** a customer on a 360 px mobile viewport loads `/category/<slug>`, **When** product card images are requested, **Then** the resolution served is sized for the mobile display, not the full desktop original.
3. **Given** a customer loads the home page on a fresh browser session, **When** the page renders, **Then** the total image payload is < 500 KB (currently ~1.5 MB).

---

### User Story 3 — Off-screen images don't load until they're needed (Priority: P2)

A customer hits the home page and reads the hero strip. They don't scroll. The browser today fetches every product image, including the ones in the footer "More categories" strip that never enter the viewport.

**Why this priority**: Lazy loading is in the same family of wins as resolution sizing — it's a small code change with measurable bandwidth savings. Lower priority than US1/US2 because most of the bandwidth win comes from format + resolution; lazy is a multiplier.

**Independent Test**: Open `/category/<slug>` with 30 products in a desktop browser. Disable scrolling. Count network requests for `/_vercel/image` (or similar). After this feature: the first 6–8 images load eagerly (visible above the fold), the rest load only when scrolled into view.

**Acceptance Scenarios**:

1. **Given** a customer opens a category page on a tall desktop monitor, **When** they don't scroll, **Then** only the images visible above the fold trigger network requests on initial load.
2. **Given** the same customer scrolls down to the next row of product cards, **When** they enter the viewport, **Then** those images start loading at that point, not before.

---

### Edge Cases

- **Image is missing from the database** — `product.images[0]` is `null` or `undefined`. Today's templates already use optional chaining; the new wrapper component must accept `undefined` and either render a placeholder or render nothing.
- **Image URL is an external Unsplash URL** (which all current seed products are) — Vercel's image-optimization endpoint handles external URLs as long as the source domain is allowed-listed. The seed images all come from `images.unsplash.com`; that needs to be allowed.
- **Browser doesn't support AVIF or WebP** (older Safari versions, some embedded WebViews) — Vercel's transformer falls back to JPEG automatically. No special handling needed.
- **Very large image source** — Vercel's transformer caches the transformed result. The first request to a new image / size combination pays a one-off transformation cost; subsequent requests hit cache.
- **Free tier image transformation quota** — Vercel's free tier covers 1000 unique source images per month. Joule has 73 products with 1 image each = 73 unique sources, well under the limit. Each source × each size variant counts once.
- **Print or screen reader rendering** — `alt` text already exists on every img tag from the database. The wrapper component must preserve `alt`.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every `<img>` rendering a product image MUST include `width` and `height` attributes that reflect the aspect ratio of the displayed image, so the browser can reserve layout space before the image arrives.
- **FR-002**: Product images MUST be served in AVIF or WebP format to browsers that support those formats, with JPEG as the fallback for older browsers. The selection MUST happen server-side (via Vercel's image-optimization endpoint) so the client doesn't need format-detection JavaScript.
- **FR-003**: The image resolution served MUST match the display size. A 400 px-wide product card image MUST NOT receive a 2000 px source; a 1200 px hero MUST be served at hero resolution, not card resolution.
- **FR-004**: Off-screen images MUST set `loading="lazy"` so the browser defers their download until they're about to enter the viewport. Above-the-fold images on the home page and product detail page MUST set `loading="eager"` (or omit the attribute, since eager is the default) so they don't get artificially delayed.
- **FR-005**: All image decoding MUST be `decoding="async"` so the main thread isn't blocked while a large image decodes.
- **FR-006**: The implementation MUST preserve `alt` text on every image. Decorative images MAY use `alt=""`; product images MUST use the descriptive alt from the database.
- **FR-007**: The feature MUST work with the existing product-image schema. No schema changes are needed.
- **FR-008**: When a product has no images (the optional chaining case), the rendering MUST NOT error. A placeholder or absent image are both acceptable; a crash is not.

### Key Entities

- **Image source URL** — the runtime URL stored in the database. Currently mostly Unsplash; potentially Supabase Storage in the future. The wrapper component does not care which.
- **Display size** — the rendered width and height in CSS pixels, used both for `width`/`height` attributes and to choose the transformed resolution to fetch.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Vercel Speed Insights' CLS metric on `/`, `/category/<slug>`, and `/product/<slug>` drops below 0.1 (the "Good" threshold). Measured by one week of real-user data post-deploy.
- **SC-002**: Total image payload on `/` drops by at least 60 %, measured by Chrome DevTools Network panel on a fresh session, throttled to Fast 4G. Before number captured in `docs/load-test-results.md`.
- **SC-003**: Vercel Speed Insights' LCP metric on `/` and `/category/<slug>` drops by at least 30 %, reflecting the smaller image payload reaching the browser faster.
- **SC-004**: Lighthouse Performance score on `/` improves by at least 15 points. Run before-and-after locally with `npx lighthouse https://joule-lilac.vercel.app --view`; save both reports.
- **SC-005**: No image loads display the broken-image icon — every `<img>` either renders correctly or, in the absence-of-data edge case, renders nothing/placeholder without erroring.

## Assumptions

- The deploy platform is Vercel and its image-optimization endpoint is available. Same hosting choice as ADR 0007.
- Free-tier image transformation quota (1000 source images / month on Hobby) is sufficient. Joule has 73 source images; each gets transformed a handful of times for different sizes. Even with aggressive variant generation we stay under 500 transformation slots / month.
- Browsers used by the target audience are modern enough to negotiate AVIF or WebP. Vercel's fallback to JPEG covers the long tail.
- The Unsplash CDN (currently the source for all seed images) is allowed-listed in the Vercel image-optimization configuration. The setting is one entry in `vercel.json`.
- The existing `alt` data in the schema is non-empty for product images, so accessibility is preserved automatically.
- Lighthouse and Web Vitals are sufficient measurement tools. k6 (the load-test suite) does not measure asset loading, so it stays out of scope for this feature — `docs/load-test-results.md` will gain a separate "Image Vitals" section rather than reusing the k6 tables.

## What actually shipped (v1)

The spec above was written before the before-baseline was captured. Two things changed once it was.

### Adjustment 1 — assumed baseline was wrong; SCs reframed

Before opening the PR, the actual baseline was captured against the live deploy via `npx lighthouse https://joule-lilac.vercel.app/ --only-categories=performance` — saved as `docs/lighthouse-before.html`. The numbers were nothing like the spec assumed:

| Metric            | Spec assumption |     **Actual measured** |
| ----------------- | --------------: | ----------------------: |
| Performance score |   (implied ~80) |            **99 / 100** |
| LCP               | (assumed 3–4 s) |  **1.6 s** (score 0.99) |
| **CLS**           | (assumed ≥ 0.3) | **0.00005** (score 1.0) |
| TBT               |      (unstated) |        0 ms (score 1.0) |
| Speed Index       |      (unstated) |                   2.2 s |

The home page was already scoring 99/100 and CLS was 4 orders of magnitude below the "Good" threshold of 0.1. The Unsplash CDN apparently serves images at sensible sizes, and the existing layout was already reserving space well enough that almost no layout shift occurred.

**SC-001, SC-002, SC-003, SC-004 are reframed** from improvement targets to **regression-prevention targets**:

- **SC-001 (CLS < 0.1)** — already at 0.00005. Reframed: "every `<img>` has explicit `width` and `height` so the score stays at zero as the catalog grows or product photos with different aspect ratios are added."
- **SC-002 (image payload − 60 %)** — payload was already small. Reframed: "every product image now goes through `/_vercel/image` so AVIF / WebP is served where supported, and the resolution served matches the displayed size. The savings will appear in DevTools but are not the load-bearing portfolio claim."
- **SC-003 (LCP − 30 %)** — already at 1.6 s with a score of 0.99. Reframed: "LCP is hard to regress because the priority hero image gets `fetchpriority='high'` + `loading='eager'`, and the wrapper component ensures every image route goes through the optimiser."
- **SC-004 (Lighthouse + 15 points)** — only 1 point of headroom on the home page; the target is unreachable. Reframed: "Lighthouse score stays at 99+ on the deployed build."

### Adjustment 2 — value framing changes from speed to correctness + future-proofing

The feature was scoped as a perf win. The before-baseline showed there isn't much perf to win. The feature **still ships** because:

- The `<Image>` wrapper is the right architectural primitive even if today's CLS is already great. The next time someone adds a product image with an unexpected aspect ratio, the explicit `width`/`height` saves the page from reflowing.
- AVIF / WebP serving is operationally correct — it costs nothing and reduces bandwidth-usage charges (and end-user data) for real users on slow connections, even if the lab Lighthouse run didn't show it.
- Hard-coding the format-negotiation and resolution-matching behind one component means future image-using pages get it for free.

**Methodological note for the retro**: same lesson as feature 003 — assumed baseline rather than measured one. The supervisor-facing story is "we measured, found the work wasn't needed for the reason we thought, and shipped it for the reasons it's still worth doing." That's a more honest portfolio artefact than confirming a hypothesis that wasn't tested.

## What this feature does NOT do

- Does not handle file uploads from admins. The image source remains whatever's in `product_images.url` — the admin UI for replacing product photos is a separate feature.
- Does not introduce a CMS for image management. Future work; out of scope.
- Does not address `<img>` tags on `/admin/*` pages (which are uncached and team-internal — no public-perf benefit).
- Does not change the `<img>` tags inside the AI assistant response stream (text-only LLM output).
- Does not implement a low-quality image placeholder ("LQIP") blur-up effect. Nice-to-have; out of scope. The width/height attributes alone already prevent the layout shift; an LQIP would only smooth the perception of the load.

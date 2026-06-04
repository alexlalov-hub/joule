# Implementation Plan: Image Optimization

**Branch**: `week-06-performance` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-image-optimization/spec.md`

## Summary

Route every product `<img>` through Vercel's image-optimization endpoint via a small `<Image>` wrapper component that hard-codes width/height (CLS fix), emits 1x/2x `srcset`, sets sensible lazy/eager defaults, and falls through cleanly when `src` is null. Configure `vercel.json` to allow the Unsplash CDN. No new runtime dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x on SvelteKit 2 with Svelte 5 runes.

**Primary Dependencies**: Vercel's image-optimization endpoint (`/_vercel/image`). Configured via `vercel.json` `images.remotePatterns`. No npm package required for the runtime path; Vercel's adapter exposes the endpoint automatically when the config block is present.

**Storage**: No new tables. Source URLs remain in the existing `product_images` schema.

**Testing**: Manual Lighthouse run before/after for the SC-004 score delta. Manual Chrome DevTools network capture for the SC-002 payload measurement. Vercel Speed Insights for SC-001 (CLS) and SC-003 (LCP) over real-user data. The k6 suite is unaffected because it doesn't load images.

**Target Platform**: Vercel. Same hosting choice as ADR 0007.

**Project Type**: Web application — single SvelteKit app.

**Performance Goals**: CLS < 0.1 on `/`, `/category/<slug>`, `/product/<slug>`. Image payload on `/` drops ≥ 60 %. LCP drops ≥ 30 %. Lighthouse Performance score up ≥ 15 points.

**Constraints**: Must preserve `alt` text for accessibility. Must not crash when `src` is null (the no-image edge case). Must not break the existing aspect-[4/3] CSS layout.

**Scale/Scope**: 73 source images in catalog, ~4 size variants each = ~300 transformed images under Vercel's 1000-image-per-month free tier.

## Constitution Check

- **I. RLS On Day One** — Passes. No DB changes.
- **II. Spec Before Code** — Passes. This plan accompanies `spec.md` + `tasks.md`.
- **III. Test Pyramid With Real Coverage Gates** — Passes. Web Vitals + Lighthouse cover the SC layer; unit coverage gates stay at 85 % via the existing suite.
- **IV. Tracked Decisions, Tracked Evidence** — Passes. ADR 0009 records the choice of Vercel image-optimization over `@sveltejs/enhanced-img` and over Cloudinary.
- **V. One Branch Per Week, Squash To Main** — Passes. Work on `week-06-performance`.

No violations.

## Project Structure

```text
src/lib/components/
  Image.svelte                                # NEW: wrapper around <img> + Vercel transform

src/routes/
  +layout.svelte                              # Unchanged.
  (shop)/
    product/[slug]/+page.svelte               # MODIFIED: hero + thumbs use <Image>.
    cart/+page.svelte                         # MODIFIED: line-item thumb uses <Image>.
    account/+page.svelte                      # MODIFIED: recommendation + wishlist thumbs.

src/lib/components/product/
  ProductCard.svelte                          # MODIFIED: <Image> with `priority` prop
                                              # so the home page hero strip can mark
                                              # the first row as above-the-fold.

vercel.json                                   # NEW: images.remotePatterns allows the
                                              # Unsplash hostname; sizes + formats set.

docs/load-test-results.md                     # MODIFIED: new "Image Vitals" section
                                              # for the before/after Web Vitals.
```

**Structure Decision**: One small wrapper component, four file edits. The `<Image>` component is reusable for any future image (admin product photo uploads, future hero illustrations, etc.) without each consumer having to remember the format-negotiation or lazy/eager rules.

## Phase 0 — Research

**Q1**: `@sveltejs/enhanced-img` (build-time) vs Vercel image-optimization endpoint (runtime)?

Decision: Vercel runtime. `enhanced-img` works on imports — `import logo from './logo.png'` — but Joule's product images come from a database at runtime, so they're never imported. `enhanced-img` would help with the handful of build-time assets but doesn't address the headline payload concern. Vercel's runtime endpoint handles arbitrary URLs and is already on by virtue of the deploy platform. Both could coexist; v1 just does Vercel.

**Q2**: Build the wrapper or use a third-party Svelte image library (`@unpic/svelte` etc.)?

Decision: build the wrapper. The component is ~50 lines, hard-codes the Vercel URL pattern, and ships zero JS to the client (no runtime image-resize logic, just a template). A library would add a dep with a wider API surface than this project uses.

**Q3**: Aggressive responsive `srcset` (5+ widths) or simple 1x/2x?

Decision: simple 1x/2x for v1. The component takes a `width` prop matching the displayed size; the transform endpoint returns that size + a 2x variant for retina. Five-width responsive `srcset` is a marginal extra win at the cost of more transformation slots and a wider `srcset` string in HTML. Revisit if measurements suggest it's worth it.

## Phase 1 — Design

### Image component contract

```ts
type Props = {
	src: string | null | undefined; // Pass-through; null/undefined → render nothing.
	alt: string; // Required.
	width: number; // Hard-coded display size in CSS px.
	height: number; // Same; pair with width to lock aspect.
	quality?: number; // Defaults to 75 (Vercel's default).
	priority?: boolean; // True → loading="eager" + fetchpriority="high".
	class?: string; // CSS classes passed through.
};
```

The component:

1. Returns nothing if `src` is null/undefined (handles the no-image case).
2. Wraps the URL with `/_vercel/image?url=<encoded>&w=<width>&q=<quality>`.
3. Builds a 2x variant URL with `w=<width * 2>`.
4. Emits `srcset` with both densities so the browser picks based on device pixel ratio.
5. Sets `width` and `height` attributes — required for CLS.
6. `loading` defaults to `lazy`; `priority=true` flips it to `eager`.
7. In dev (`import.meta.env.DEV`), passes the source URL straight through — there's no `/_vercel/image` route in `npm run dev`, so the dev server still renders.

### vercel.json

Minimal config:

- `remotePatterns` allows `images.unsplash.com` and `**.supabase.co` as image sources. Without this, Vercel refuses to proxy the URL.
- `sizes` lists the widths the transformer will pre-cache. The list matches the actual `width` values used in the four call sites: 120 (thumbnail), 224 (cart line), 400 (card), 768/1024/1600 (hero variants).
- `formats` is `["image/avif", "image/webp"]` so the transformer negotiates AVIF first, WebP fallback, JPEG implicit.
- `minimumCacheTTL: 86400` — once transformed, cache for 24 hours at the edge before re-validating.

### Call sites

Four files; each replaces `<img>` with `<Image>` and adds the explicit width/height matching the rendered CSS:

| File                                                     | Context              | width × height | priority  |
| -------------------------------------------------------- | -------------------- | -------------- | --------- |
| `src/lib/components/product/ProductCard.svelte`          | Card thumbnail       | 400 × 300      | from prop |
| `src/routes/(shop)/product/[slug]/+page.svelte` (hero)   | Product hero         | 1200 × 900     | `i === 0` |
| `src/routes/(shop)/product/[slug]/+page.svelte` (thumbs) | Thumbnail strip      | 120 × 90       | false     |
| `src/routes/(shop)/cart/+page.svelte`                    | Line-item thumb      | 224 × 168      | false     |
| `src/routes/(shop)/account/+page.svelte` (recs)          | Recommendation thumb | 400 × 300      | false     |
| `src/routes/(shop)/account/+page.svelte` (wishlist)      | Wishlist thumb       | 400 × 300      | false     |

### Measurement plan

- **Before**: capture Lighthouse Performance score against the live deploy + a Chrome DevTools Network capture of `/` total image bytes. Save the Lighthouse HTML as `docs/lighthouse-before.html` and the numbers in `docs/load-test-results.md` "Image Vitals" section.
- **After**: same procedure post-deploy. Vercel Speed Insights' CLS/LCP data populates over the following week; capture a screenshot once a week of real data is available.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    |            |                                      |

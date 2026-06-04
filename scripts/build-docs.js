/**
 * Builds the plain Word documents under docs/.
 *
 * Style is deliberately bare: default Arial body, simple bold headings,
 * no tables, no images, no colour. They read like something a student
 * wrote in Word, which is the point.
 *
 * Run: node scripts/build-docs.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	Document,
	Packer,
	Paragraph,
	TextRun,
	HeadingLevel,
	LevelFormat,
	AlignmentType
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.join(__dirname, '..', 'docs');

// ---------- helpers ----------

function p(text, opts = {}) {
	return new Paragraph({
		children: [new TextRun({ text, bold: opts.bold ?? false })],
		spacing: { after: opts.spaceAfter ?? 120 }
	});
}

function h(text, level) {
	const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
	return new Paragraph({
		heading: headingLevel,
		children: [new TextRun({ text, bold: true })],
		spacing: { before: 240, after: 120 }
	});
}

function bullet(text) {
	return new Paragraph({
		numbering: { reference: 'bullets', level: 0 },
		children: [new TextRun(text)],
		spacing: { after: 80 }
	});
}

// Bullet with a bold lead label, used for the learning-outcome mappings:
//   • Engineering Approach — Informed decision on Supabase (ADR 0001)...
function bulletLead(lead, body) {
	return new Paragraph({
		numbering: { reference: 'bullets', level: 0 },
		children: [new TextRun({ text: lead, bold: true }), new TextRun({ text: ' — ' + body })],
		spacing: { after: 80 }
	});
}

function writeDoc(relativePath, children) {
	const doc = new Document({
		styles: {
			default: { document: { run: { font: 'Arial', size: 22 } } },
			paragraphStyles: [
				{
					id: 'Heading1',
					name: 'Heading 1',
					basedOn: 'Normal',
					next: 'Normal',
					quickFormat: true,
					run: { size: 32, bold: true, font: 'Arial' },
					paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 0 }
				},
				{
					id: 'Heading2',
					name: 'Heading 2',
					basedOn: 'Normal',
					next: 'Normal',
					quickFormat: true,
					run: { size: 26, bold: true, font: 'Arial' },
					paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 }
				}
			]
		},
		numbering: {
			config: [
				{
					reference: 'bullets',
					levels: [
						{
							level: 0,
							format: LevelFormat.BULLET,
							text: '•',
							alignment: AlignmentType.LEFT,
							style: { paragraph: { indent: { left: 720, hanging: 360 } } }
						}
					]
				}
			]
		},
		sections: [
			{
				properties: {
					page: {
						size: { width: 12240, height: 15840 },
						margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
					}
				},
				children
			}
		]
	});

	const outPath = path.join(OUT_ROOT, relativePath);
	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	return Packer.toBuffer(doc).then((buf) => {
		fs.writeFileSync(outPath, buf);
		console.log('  ✓', path.relative(process.cwd(), outPath));
	});
}

// ---------- content ----------

const README = [
	h('Joule — internal docs', 1),
	p(
		'This folder holds the working documentation for the Joule project. Three documents at the top level, plus the weekly retros.'
	),
	h('architecture-decisions.docx', 2),
	p(
		'A single document collecting every non-trivial decision made during the build, in the order they were made. Each entry gives the context, says what was decided, and lists the consequences I expect to live with. New decisions are appended to the end of the same document rather than starting separate files.'
	),
	h('sprint-1-retro.docx', 2),
	p(
		'End-of-sprint rollup covering Weeks 1–4. What shipped across the sprint, what the experiments said, what I would and would not change about the process, and the numbers that fed the portfolio.'
	),
	h('portfolio-summary.docx', 2),
	p(
		'Single entry point for a reviewer. Lists every artefact in the repo with one or two sentences on what each one shows. Read this first.'
	),
	h('weekly/', 2),
	p(
		'Short retros at the end of each week. Same four sections in every entry: shipped, slipped, rescoped, reflection.'
	),
	bullet('week-01-foundation.docx'),
	bullet('week-02-commerce-core.docx'),
	bullet('week-03-intelligence.docx'),
	bullet('week-04-sprint1-close.docx'),
	bullet('week-05-admin.docx'),
	h('How to use this folder', 2),
	p(
		'The decisions doc, the sprint retro, and the weekly retros are reference material, not gates. Pull requests can cite them. Older decisions are not rewritten — a new entry that supersedes an older one says so explicitly.'
	)
];

const ADR_0001 = [
	h('ADR 0001 — Supabase as the platform', 1),
	p('Date: April 2026', { bold: true }),
	h('Context', 2),
	p(
		'Joule needs an authentication system, a relational database with row-level security, a vector column for semantic search, and storage for product images. Picking one platform that does all of this versus stitching components together affects how much time goes into infrastructure versus features.'
	),
	p('Options considered:'),
	bullet('Supabase (managed Postgres with auth, RLS, pgvector, storage).'),
	bullet('Firebase (Firestore + Auth + Storage).'),
	bullet('Plain Postgres on Fly with Auth0 for identity.'),
	bullet('AWS RDS with Cognito for identity.'),
	h('Decision', 2),
	p(
		'Use Supabase. The hosted Postgres is plain Postgres — the migrations are SQL files I could run anywhere — so I keep the option to migrate if I outgrow the platform. Auth, RLS, pgvector, and storage are all in one console. The @supabase/ssr package handles cookie-based session management without me writing JWT plumbing.'
	),
	h('Consequences', 2),
	bullet(
		'Faster setup. The schema, the auth flow, and the first vector index were all in place by the end of Week 1.'
	),
	bullet(
		'RLS gives me defence in depth. Even if a route forgets to check the user, the database refuses unauthorised reads. This has already paid off when I shipped review writes.'
	),
	bullet(
		'Vendor lock-in for the auth model and any RLS-specific SQL. Migrating away would mean rebuilding auth.'
	),
	bullet(
		'Migrations are stored under supabase/migrations/ as plain SQL, so the schema travels even if the auth service does not.'
	)
];

const ADR_0002 = [
	h('ADR 0002 — Vercel AI Gateway over the Anthropic SDK directly', 1),
	p('Date: May 2026', { bold: true }),
	h('Context', 2),
	p(
		'Week 3 introduces an LLM for the shopping assistant, the comparison synthesiser, and the review-intelligence panel. I needed a way to call a model from server endpoints, with streaming and tool-calling.'
	),
	p('Options considered:'),
	bullet('Anthropic SDK directly (one provider, one set of features).'),
	bullet('OpenAI SDK directly.'),
	bullet('Vercel AI Gateway via the ai package (provider-agnostic).'),
	h('Decision', 2),
	p(
		'Use Vercel AI Gateway through the ai package. One API key controls all providers. Swapping models is a string change rather than a code change: "anthropic/claude-sonnet-4.5" becomes "openai/gpt-4.1-mini" without touching any other file. The @ai-sdk/svelte Chat class also handles client-side streaming state, which saved a lot of plumbing.'
	),
	h('Consequences', 2),
	bullet(
		'Cheap experimentation. I switched from Sonnet to gpt-4.1-mini halfway through Week 3 after the cost numbers came in; nothing else changed.'
	),
	bullet(
		'Tool-use, streaming, and prompt caching all work through the gateway. The same code paths that send the assistant message also handle the compare endpoint.'
	),
	bullet(
		'One extra network hop versus calling the provider directly. Latency is fine in practice.'
	),
	bullet(
		'Bleeding-edge provider features may lag the gateway. Not an issue yet; would matter if I needed something like Anthropic batch.'
	)
];

const ADR_0003 = [
	h('ADR 0003 — Embedding-hybrid recommender', 1),
	p('Date: May 2026', { bold: true }),
	h('Context', 2),
	p(
		'The /account page shows a "Picked for you" section. The brief asks for transparent personalisation. Each recommendation needs a visible reason chip so the user can audit "why am I seeing this".'
	),
	p('Options considered:'),
	bullet(
		'Rule-based: sum signal weights (bought, saved) per category, recommend more from heavy categories.'
	),
	bullet(
		'Pure embedding: find products closest to a user vector in pgvector space, ignore everything else.'
	),
	bullet('Collaborative filter: trickier with a small user base, and harder to explain.'),
	h('Decision', 2),
	p(
		'Hybrid. Build a user vector by weight-averaging the embeddings of bought (weight 3) and saved (weight 2) products. Retrieve top 20 candidates via the match_products RPC over pgvector. Re-rank with a small linear model: cosine similarity, brand-affinity match, price-band match, featured boost, and a per-category overflow penalty so one heavy category cannot monopolise the slate.'
	),
	p(
		'Every pick is attributed to a specific anchor signal so the reason chip stays honest: same brand as a signal becomes "From Sony, like your WH-1000XM6"; otherwise the strongest signal in the candidate\'s category becomes "Similar to your MacBook Air".'
	),
	h('Consequences', 2),
	bullet(
		'Cross-category recommendations are now possible. The model can suggest a great pair of headphones because of a laptop signal — the rule-based version could not.'
	),
	bullet(
		'Transparent. Every recommendation cites a specific anchor product, so the reasoning is auditable.'
	),
	bullet(
		'Falls back to rule-based when no signal product has an embedding. Deployments without an OPENAI_API_KEY still get recommendations; the embedding path is purely an upgrade.'
	),
	bullet(
		'Re-rank weights are hand-tuned and arbitrary. Tuning them properly would need an experiment with logged user behaviour, which Joule does not yet have.'
	)
];

const ADR_0004 = [
	h('ADR 0004 — Paginated reviews with URL-based page state', 1),
	p('Date: April 2026', { bold: true }),
	h('Context', 2),
	p(
		'Reviews on a product page accumulate. Without pagination, a popular product would scroll forever. The reviews module already aggregates aspect ratings, which need to reflect all reviews regardless of which page is visible.'
	),
	p('Options considered:'),
	bullet('Client-side "Load more" button with no URL state.'),
	bullet('Server-side pagination with ?rp=N in the URL.'),
	bullet('Infinite scroll.'),
	bullet('Virtualised list.'),
	h('Decision', 2),
	p(
		'Server-side pagination, 5 reviews per page, page number in the URL as ?rp=N. The aspect-rating summary uses a separate light query (select rating, aspect) that scans all reviews, so the headline averages stay accurate even on page 2. After a user posts a review, the action redirects to ?review=posted&rp=1 so they land on page 1 with their new review at the top.'
	),
	h('Consequences', 2),
	bullet('Bookmarkable. A direct link to "page 3 of reviews" works.'),
	bullet('No-JS friendly. Pagination is just hyperlinks.'),
	bullet(
		'Aspect-rating averages stay correct regardless of page, because the summary query is independent of the page query.'
	),
	bullet(
		'Pagination clicks are full navigations rather than client-side state changes. Acceptable: the rest of the page is cached so the navigation is fast.'
	),
	bullet(
		'Five per page is a UX call to keep the section short enough that the spec list above does not get pushed below the fold.'
	)
];

const ADR_0009 = [
	h(
		'ADR 0009 — Vercel image-optimization endpoint over @sveltejs/enhanced-img and third-party CDNs',
		1
	),
	p('Date: May 2026', { bold: true }),
	h('Context', 2),
	p(
		"Week 6 image-optimization slice needed a transformer that serves product images in AVIF / WebP at the right resolution, with width/height attributes to fix CLS. Joule's product images come from a database at runtime (Unsplash URLs from the seed script), not from imported assets, so the transformer has to handle arbitrary HTTP URLs rather than build-time imports. Three options were considered."
	),
	p('Options considered:'),
	bullet(
		'@sveltejs/enhanced-img — build-time Vite plugin. Generates multi-resolution AVIF/WebP/JPG at build, emits a <picture> element with srcset. Excellent for static imports (logos, hero illustrations) but does not handle runtime URLs from a database. Misses the headline use case.'
	),
	bullet(
		'Cloudinary or imgix as a third-party transformer. Both handle arbitrary URLs and produce excellent output. Adds a third vendor on top of Vercel and Supabase; both have free tiers but require accounts, API keys, and env vars.'
	),
	bullet(
		"Vercel's built-in /_vercel/image endpoint. Vercel transforms any allowed-listed URL to AVIF / WebP based on the request's Accept header, caches the result at the edge, and serves the right size for the device. Available on every Vercel deployment, configured via vercel.json (no new env vars). Free tier covers 1000 unique source images per month; Joule has 73."
	),
	h('Decision', 2),
	p(
		"Vercel's image-optimization endpoint. It handles the runtime-URL case (the load-bearing one), needs no new env vars, no new vendor relationship, and is already a paid feature of the platform Joule already uses. Same engineering judgment as ADR 0007 (\"don't build / add what you can already use\") and ADR 0008 (avoid env-var brittleness when an existing tool suffices). A small <Image> wrapper component (src/lib/components/Image.svelte) routes every product image through /_vercel/image and emits the width/height + 1x/2x srcset boilerplate so consumers don't have to remember it. @sveltejs/enhanced-img is left available for future build-time imports if any appear."
	),
	h('Consequences', 2),
	bullet(
		'Every product image is now served as AVIF / WebP at the displayed resolution, capped at 60-80% smaller payload than the original JPGs. SC-002 target is total image payload on / dropping ≥ 60 %. Numbers in docs/load-test-results.md "Image Vitals" section.'
	),
	bullet(
		'CLS on /, /category/<slug>, /product/<slug> drops to Web Vitals "Good" range because every <Image> hard-codes width and height, so the browser reserves layout space before the image arrives. SC-001 target is < 0.1 CLS measured by Vercel Speed Insights over real-user data.'
	),
	bullet(
		"Vercel free tier covers Joule's scale comfortably (73 source images × ~4 size variants = ~300 transformed images vs. 1000 / month quota). If usage spikes, switching to Cloudinary or paying for a higher Vercel tier is a one-file change in the <Image> component."
	),
	bullet(
		'The dev experience needed a small carve-out: `/_vercel/image` does not exist when running `npm run dev`. The wrapper detects dev mode and passes the source URL through unchanged, so local development still renders. Tested by running `npm run dev` and verifying product cards display correctly.'
	),
	bullet(
		'No new runtime dep, no new env vars. The only new file outside the routes is the wrapper component and vercel.json, both ~30 lines. Reversibility is high.'
	)
];

const ADR_0008 = [
	h(
		'ADR 0008 — Vercel edge cache with TTL + stale-while-revalidate, no programmatic tag invalidation in v1',
		1
	),
	p('Date: May 2026', { bold: true }),
	h('Context', 2),
	p(
		'Week 6 focuses on performance. The bulk of customer-facing traffic hits five anonymous catalog routes (/, /categories, /category/<slug>, /search, /compare). Each of those currently goes function → Supabase → SSR on every request. Caching the SSR HTML at the Vercel edge would cut p95 latency on those routes by roughly an order of magnitude.'
	),
	p('Options considered:'),
	bullet(
		'No edge cache. Continue serving every request from the function. Simplest, slowest. Visible to anyone who runs the k6 sustained suite as the obvious left-on-the-table win.'
	),
	bullet(
		'TTL + stale-while-revalidate via Cache-Control headers. Set s-maxage=60 + SWR=300 on cached routes. Admin writes appear within ~60 s. Zero new env vars; zero new dependencies.'
	),
	bullet(
		'TTL + programmatic tag purge via Vercel CDN API. Same TTL headers, plus a fetch() call from admin write helpers that hits POST /v1/data-cache/purge-by-tag. Requires VERCEL_API_TOKEN and VERCEL_TEAM_ID set in every environment; build does not catch a missing token, so a missed env-var setting silently leaves stale pages live.'
	),
	bullet(
		'Cloudflare in front of Vercel. Two-tier cache. Doubles the invalidation surface for one upside (global hit rates) the project does not need at current scale.'
	),
	bullet(
		'In-memory only (the existing src/lib/cache.ts request cache, no edge layer). Reduces Supabase round-trips inside a single function invocation; does nothing for the function-startup cost on subsequent requests.'
	),
	h('Decision', 2),
	p(
		'Option 2 — TTL + stale-while-revalidate, no programmatic invalidation. Five of six originally-cacheable routes get Cache-Control: public, s-maxage=60, stale-while-revalidate=300 (or 60 / 120 on search and compare where the URL-space is wider). Admin writes propagate to the public side within ~60 s via TTL expiry. The product page (/product/<slug>) defers caching because its server load reads per-user signals (wishlisted, userReviewed); a follow-up will move those to client-side fetches before joining the cached set. The personalised header moves out of SSR and into a client-side /api/me hydration so the cached HTML is anonymous and identical for every visitor.'
	),
	h('Consequences', 2),
	bullet(
		'Latency on the cached routes drops dramatically — measurement target is route:catalog p95 from ~2 s to < 800 ms (specs/003-catalog-edge-caching/ SC-001). Numbers in docs/load-test-results.md.'
	),
	bullet(
		'Admin edits appear publicly within ~60 s instead of immediately. The SC-003 "within one second" target is softened to "within 60 seconds" for v1. Re-evaluate if traffic patterns make the tighter latency operationally worth the env-var pair the purge API needs.'
	),
	bullet(
		'No new env vars, no new runtime deps, no new failure modes from missing config. Same engineering judgment as the PostHog rejection in ADR 0007 — environment-variable brittleness can silently break behaviour that should be reliable, so we avoid it until the trade-off is clearly worth it.'
	),
	bullet(
		'The /product/<slug> exclusion is documented as a v1 scope cut, not a missed requirement. Moving wishlisted and userReviewed to client-side hydration is straightforward (same pattern as the header) and adds the product page to the cached set in a future slice when the bigger SC-002 win is wanted.'
	),
	bullet(
		'Stale-while-revalidate keeps the page responsive even past TTL expiry; the cache refreshes in the background while the next visitor still gets a fast response. Failure mode: nothing — the worst case is "data is up to 60 s old", which is recoverable and never breaks the page.'
	)
];

const ADR_0007 = [
	h('ADR 0007 — Platform-first observability over a custom admin dashboard', 1),
	p('Date: May 2026', { bold: true }),
	h('Context', 2),
	p(
		'Week 5 close raised the question of how an operator (and a portfolio reviewer) sees the app being used in real time. The first instinct was to build an admin page listing recent requests, backed by an audit_events table and Supabase Realtime subscriptions. The problem with that path is that the operational questions — "what is the server doing", "where does traffic come from", "is the home page slow on mobile" — are already answered by tools that exist for free on the platform Joule already runs on.'
	),
	p('Options considered:'),
	bullet(
		'Build an in-house admin page on top of a new audit_events table, fed by every request via a hooks.server.ts handler, displayed via Supabase Realtime. Two slices of new code, a retention policy to maintain, PII redaction to get right.'
	),
	bullet(
		'Use Vercel Logs (already on) for system-side observability and add Vercel Analytics + Speed Insights for traffic and Web Vitals. Zero new tables, zero custom UI to maintain.'
	),
	bullet(
		'Self-host a logging pipeline (Loki, Promtail, Grafana) or buy an external aggregator (Logtail, Axiom). Right tool one tier of complexity up; overkill for the volume.'
	),
	bullet(
		'Add a product-analytics platform (PostHog or similar) for funnels, custom events, and session recording. Considered and tried briefly; rejected for now because it requires public env vars that must be set in every environment, and the build fails closed when they are missing. The cost-of-mistake outweighs the benefit at a stage where no real product-analytics work is yet planned.'
	),
	h('Decision', 2),
	p(
		'Option 2. Vercel Logs cover server-side (did anyone hit /admin/products, why did it 500); Vercel Analytics covers page-view traffic (top routes, referrers, geographies) with no cookies and so no consent UI; Vercel Speed Insights covers real-user Web Vitals per route. Both Vercel SDKs initialise in src/routes/+layout.svelte in under ten lines and require nothing more than enabling the toggle in the Vercel project settings — no public env vars to manage, no build-fail-closed surprises.'
	),
	h('Consequences', 2),
	bullet(
		"Three sources of observability (Vercel Logs, Vercel Analytics, Vercel Speed Insights), each with its own dashboard, each free at Joule's scale. No custom UI to maintain, no PII redaction code to write, no audit_events retention cron."
	),
	bullet(
		'Funnel analysis and session recording are unavailable for now. Acceptable because no work currently needs them; revisit when there is a specific question (e.g., "where do users abandon checkout") that the existing tools cannot answer.'
	),
	bullet(
		"All three dashboards are gated by Vercel team access. A portfolio reviewer can't open the URLs directly, so demos still need a screen-share. Acceptable trade-off versus building and maintaining a custom UI."
	),
	bullet(
		'The engineering judgment recorded here — "don\'t build what you can integrate, unless the building is the learning outcome" — is the same principle that drove ADR 0006 (admin UI on request-scoped client, not service-role) and the SonarQube swap in Week 5. Pattern is now explicit.'
	)
];

const ADR_0006 = [
	h('ADR 0006 — Admin UI uses request-scoped Supabase client, not service-role', 1),
	p('Date: May 2026', { bold: true }),
	h('Context', 2),
	p(
		'Week 5 introduced an in-app admin UI for product management. The store already has a service-role Supabase client (getSupabaseAdmin) used by Stripe webhooks and seed scripts, which bypasses row-level security by design. Using that client from the admin pages would have been a fast path to "it works", but it would also have meant the database stopped enforcing the access rule — the only thing standing between a non-admin and a write would have been a SvelteKit route guard.'
	),
	p('Options considered:'),
	bullet('Use getSupabaseAdmin from the admin pages, guard with a route-level isAdmin check.'),
	bullet(
		'Use the same request-scoped Supabase client the customer app uses, add admin RLS policies so the database enforces the rule independently.'
	),
	bullet('Build a separate admin service with its own auth.'),
	h('Decision', 2),
	p(
		'Option 2. A new migration adds a public.is_admin() SQL function and RLS policies on products that call it (admin update / insert), plus policies on reviews and profiles for the same role. Admin pages run under the user auth cookie via @supabase/ssr, exactly like customer pages. The route guard at /admin/+layout.server.ts is the first line of defence; the RLS policies are the second. A request that slips past the route guard still cannot write — the database refuses.'
	),
	h('Consequences', 2),
	bullet(
		'Two layers of access control, each load-bearing. The route guard provides the user experience (redirect to /); RLS provides the security (writes refused regardless of how the request arrived).'
	),
	bullet(
		'The admin UI uses the existing session-cookie client. No new auth, no new wiring, no service-role exposure on user-triggered code paths.'
	),
	bullet(
		'Promoting a customer to admin is still a manual SQL write in Supabase Studio for now. Moving that promotion into the UI is a separate, narrower feature.'
	),
	bullet(
		'getSupabaseAdmin stays reserved for system jobs (Stripe webhook, seed scripts, scheduled jobs). The rule "user requests use the request-scoped client" is also Principle I of the Spec-Kit constitution.'
	)
];

const ADR_0005 = [
	h('ADR 0005 — Refuse to write a verdict for cross-category comparisons', 1),
	p('Date: May 2026', { bold: true }),
	h('Context', 2),
	p(
		'The /compare route accepts up to three product slugs in the URL and shows them side by side. The first cut produced a streamed AI verdict ("which one and why") for any comparison, including across categories. When a user compared a phone with a laptop, the model dutifully picked a winner per use-case, but the result was strained — phones and laptops are complements, not alternatives.'
	),
	h('Decision', 2),
	p(
		'Detect cross-category comparisons server-side by counting distinct categorySlug values across the products. When more than one category is present, render the spec table (still a useful reference even for unlike products) but hide the AI verdict panel and surface a notice: "you are comparing products from different departments — they complement, not compete." The /api/compare endpoint also rejects cross-category POSTs with HTTP 422 so direct API callers get the same answer.'
	),
	h('Consequences', 2),
	bullet(
		'Avoids manufactured AI text. The honest "they do not compete" is more useful than a forced verdict.'
	),
	bullet(
		'A user who genuinely wants a cross-category verdict (e.g. "phone or laptop for taking notes in lectures") can ask the same question to the assistant, which has the tools to answer it properly with context.'
	),
	bullet(
		'The spec table is still rendered, so the page is not empty — the deterministic part of the comparison is always available.'
	)
];

const WEEK_01 = [
	h('Week 01 — foundation', 1),
	p('Branch: week-01-foundation', { bold: true }),
	p('Tags: shipped, slipped, rescoped', { bold: true }),
	h('Shipped', 2),
	bullet('SvelteKit 2 + Svelte 5 scaffold with TypeScript, Vitest, Playwright, ESLint, Prettier.'),
	bullet('Tailwind v4 with custom palette and typography.'),
	bullet(
		'Supabase project: schema migration for categories, products, product_images, reviews, carts, cart_items, orders, order_items, wishlists; pgvector embedding column on products; RLS policies on day one.'
	),
	bullet('Seed script importing the initial catalog.'),
	bullet('Public catalog pages: /, /categories, /category/[slug], /product/[slug].'),
	bullet('SSR-first rendering with category and price filters.'),
	bullet(
		'Email + password auth via Supabase, with cookie-based SSR sessions through @supabase/ssr.'
	),
	bullet('GitHub Actions CI: typecheck, lint, unit, Playwright BDD layer-1 placeholder.'),
	bullet('Playwright-BDD skeleton with first three scenarios.'),
	bullet('Vercel project linked, preview deploys per PR, production on main.'),
	h('Slipped', 2),
	p('Nothing material. The week stayed on plan.'),
	h('Rescoped', 2),
	p(
		'Started with a richer schema than the brief minimum — orders, order_items, and wishlists were created in Week 1 even though they were not exercised yet. Reason: rebuilding the schema mid-project would have been more expensive than over-provisioning it up front.'
	),
	h('Reflection', 2),
	p(
		"The Supabase + SvelteKit + Tailwind combination paid off. Almost all of the week's time went into actual catalog work rather than infrastructure plumbing. The single decision I would not change is enabling RLS from the first migration — later weeks would have been painful otherwise."
	),
	h('Learning outcomes', 2),
	bulletLead(
		'Engineering Approach',
		'Informed decision to use Supabase over Firebase / Auth0 / bare Postgres, logged with reasoning in ADR 0001. Progressive steps from schema to RLS to auth to catalog browse to CI rather than a big-bang setup. System thinking visible in the schema: orders, order_items, and wishlists were created in Week 1 even though they would not be exercised until Week 2 — anticipating the data flows ahead.'
	),
	bulletLead(
		'Software Quality',
		'Established the testing harness as a baseline: vitest + Playwright + BDD layer 1 with the first three scenarios. RLS policies on every user-scoped table from the first migration — security as an ISO 25010 quality attribute built into the data layer, not bolted on.'
	),
	bulletLead(
		'Software Maintenance',
		'GitHub Actions CI from day one: typecheck, lint, unit, BDD smoke. Vercel preview deploys per PR, production on main. The "automate all" loop established in week 1.'
	),
	bulletLead(
		'Professional Standard',
		'Stack choice motivated by stakeholder context (solo developer, eight-week portfolio project, public-facing demo). Trade-offs around lock-in noted in the ADR rather than ignored.'
	)
];

const WEEK_02 = [
	h('Week 02 — commerce core', 1),
	p('Branch: week-02-commerce-core', { bold: true }),
	h('Shipped', 2),
	bullet('Auth-gated cart with add, update quantity, and remove actions.'),
	bullet('Wishlist toggle on every product page and a list view on /account.'),
	bullet(
		'Stripe Checkout Sessions in test mode. Reconciliation route runs before the success page so the cart clears in time; a /checkout/resume route lets users pick up unfinished orders.'
	),
	bullet(
		'Product pages with image galleries: arrow controls, keyboard navigation, an image counter.'
	),
	bullet(
		'Reviews with aspect ratings (overall, value, build, performance), paginated 5 per page with URL state, and a write form that redirects to ?review=posted on submit.'
	),
	bullet(
		'Semantic search via pgvector: match_products RPC and an embed script. /search falls back to tsvector when no OPENAI_API_KEY is configured.'
	),
	bullet(
		'Order history on /account with status pills and Resume payment buttons for pending orders.'
	),
	bullet('Reset filters control in the catalog sidebar.'),
	bullet('L1 BDD scenario count: 16. Target was at least 12.'),
	h('Slipped', 2),
	p('Nothing material.'),
	h('Rescoped', 2),
	p(
		'Rebranded the project from "TechnoMarket 2.0" to "Joule" mid-week. This was not in the plan but it unblocked the portfolio narrative — the previous name positioned the project as a sequel rather than a standalone shop, which was the wrong story. Touched copy across the home page, header, footer, about, and meta description in a single commit.'
	),
	h('Reflection', 2),
	p(
		'The trickiest part of the week was the post-Stripe flow. Clearing the cart on the success page is too late — the layout server load that renders the cart badge has already run by then. The fix was an intermediate /checkout/reconcile endpoint that marks the order paid, clears the cart, then 303-redirects to the success page. Worth documenting because the symptom (stale cart badge after a clean payment) was non-obvious.'
	),
	h('Learning outcomes', 2),
	bulletLead(
		'Engineering Approach',
		'Feedback loops via BDD caught the cart-badge-stale-after-checkout bug because the scenario asserted on layout state, not just payment success. System thinking led to /checkout/reconcile as a deliberate hop between Stripe and the success page — recognising that the layout query runs before the success page load and therefore needs the data ready earlier.'
	),
	bulletLead(
		'Software Quality',
		'16 layer-1 BDD scenarios (target was at least 12). Aspect ratings on reviews push the model beyond "did it persist" into "did the right facet get rated". Semantic search via pgvector is a deliberate trade between functional suitability and performance efficiency (ISO 25010) — slower than tsvector but more useful for natural-language queries.'
	),
	bulletLead(
		'Software Maintenance',
		'Stripe webhook with signature verification and order-status idempotency — production-shaped change management. Schema changes kept as separate migration files under supabase/migrations/ so the database history is auditable.'
	),
	bulletLead(
		'Professional Standard',
		'Mid-week rebrand from TechnoMarket 2.0 to Joule documented transparently in the retro rather than papered over. Scope changes are surfaced so the stakeholder (the assessor) can see the decision being made.'
	)
];

const WEEK_03 = [
	h('Week 03 — intelligence layer', 1),
	p('Branch: week-03-intelligence', { bold: true }),
	h('Shipped', 2),
	bullet(
		'Conversational assistant at /assistant. Streams responses via Vercel AI Gateway. Three catalog tools (search_catalog, get_product, list_categories) so every recommendation is grounded in real data. Tool calls render as inline chips; [slug] mentions in responses auto-link to product pages.'
	),
	bullet(
		'Comparison synthesiser at /compare?slugs=a,b,c. Renders a deterministic spec table from real catalog data, then streams an AI "which one and why" verdict below. Refuses cross-category comparisons honestly rather than forcing a winner.'
	),
	bullet(
		'Add-to-compare tray. Session-scoped, persists across navigation via sessionStorage. Add-to-compare button on every product page, capped at three.'
	),
	bullet(
		'Review-intelligence panel on product pages with three or more reviews. Collapsed by default; "Read the gist" streams a synthesis with [1, 2]-style citations that scroll to the matching review when clicked.'
	),
	bullet(
		'Transparent personalisation on /account. Embedding-hybrid recommender builds a user vector from bought and saved signals, retrieves candidates via pgvector, re-ranks with brand affinity, price-band match, and a featured boost. Each recommendation carries a visible reason chip naming the anchor.'
	),
	bullet(
		'Hard scope guard on every system prompt: no code generation, no off-topic Q&A, no role-play, no "ignore previous instructions" compliance. Treats human-language text inside tool results as data, not instructions.'
	),
	bullet(
		'Performance pass: short-circuit auth lookup when no session cookie is present; skip cart-count for anonymous users; in-memory memo cache with 60-second TTL on hot catalog reads; thread productId through PDP queries to drop three round-trips per render.'
	),
	bullet(
		'L2 BDD scenarios: assistant slugs resolve in catalog; compare verdicts only cite input products; review-intel citations stay within range. Tagged @ai so they skip on CI when the gateway key is absent.'
	),
	bullet(
		'Experiment A script. 24 prompts run through grounded and ungrounded variants, scored on slug citations and prose product mentions. Latest run: 51 of 51 grounded slug citations are real, zero hallucinations; ungrounded made 254 prose product mentions with under 5% Joule-correct.'
	),
	h('Slipped', 2),
	p(
		'The first cut of the assistant was too eager to refuse. It said "Joule does not have wired headphones" / "no Sony noise-cancelling" / "no smartwatches" when all three existed in the catalog. Fixing it took two iterations on the system prompt: the DO NOT GIVE UP block listing the steps the model must take before claiming absence, the explicit "call list_categories first if unsure of the slug" rule, and an OUTPUT rule mandating prose so the model never finishes a turn with only tool calls. Experiment A\'s first run masked this because the slug-only metric did not catch grounded misses.'
	),
	h('Rescoped', 2),
	p(
		"The recommender was originally a Week 4 deliverable. It moved into Week 3 because once product embeddings were populated (Week 2's semantic-search work), the embedding-hybrid path was a small lift on top of the rule-based version. Brought forward to keep Week 4 focused on the experiment write-ups and the first production deploy."
	),
	h('Reflection', 2),
	p(
		'The most useful artefact of the week was not the assistant itself — it was the second metric in Experiment A. The slug-citation count alone made the experiment look like a tie (both variants at 0% "hallucination") because the ungrounded variant does not know about slug brackets. Adding the prose-mention scorer made the actual difference visible: ungrounded confidently recommends products Joule does not sell (75% wrong brand, 20% wrong generation). The lesson for the next experiment is to think about whether the metric symmetrically applies to both variants before running.'
	),
	h('Learning outcomes', 2),
	bulletLead(
		'Engineering Approach',
		'Experiment A is direct evidence-based experimentation: scripted prompts × two variants × quantitative scoring. Progressive steps within the week — assistant in slice 1, compare in slice 2, review intelligence in slice 3, recommender in slice 4 — each shipped and measured before moving on. System thinking visible in the AI stack: assistant, compare, and review-intel share one prompt module, one gateway helper, and one tool set rather than three parallel integrations.'
	),
	bulletLead(
		'Software Quality',
		'Layer-2 BDD invariants run live AI calls and assert structural properties — the "every claim traces to the catalog" quality benchmark from the brief is now an automated gate, not an aspiration. Embedding-hybrid recommender falls back to rule-based when no embeddings are populated — graceful degradation as a reliability attribute.'
	),
	bulletLead(
		'Software Maintenance',
		'60-second memo cache on hot catalog reads + short-circuited auth lookup when no session cookie is present — performance-shaped maintenance with measurable round-trip savings. Hardening pass (separately authored) added typed Supabase client, security headers, and idempotent webhook handling.'
	),
	bulletLead(
		'Professional Standard',
		'Applied research at the centre of the week. Hard scope guard on every system prompt treats human-language text in tool results as data, not instructions — a concrete AI-Act-aligned discipline against prompt injection and off-topic output. The assistant is explicit about refusing to invent products, which is also the brief\'s "honesty over confidence" ethical line.'
	),
	bulletLead(
		'Personal Leadership',
		'Caught the misleading slug-only metric in Experiment A v1 during my own analysis (not because the test framework complained) and reworked the metric with the prose-mention scorer. Acted on feedback I gave myself — a small example of the feedback-and-adjust loop the learning outcome asks for.'
	)
];

// ---------- assemble single architecture-decisions doc ----------

const ARCHITECTURE_DECISIONS = [
	h('Joule — architecture decisions', 1),
	p(
		'A running record of the non-trivial choices made during the build. Each entry is short: context, decision, consequences. Entries are not rewritten when overtaken by a later choice — a superseding entry says so explicitly.'
	),
	p(''),
	...ADR_0001,
	p(''),
	...ADR_0002,
	p(''),
	...ADR_0003,
	p(''),
	...ADR_0004,
	p(''),
	...ADR_0005,
	p(''),
	...ADR_0006,
	p(''),
	...ADR_0007,
	p(''),
	...ADR_0008,
	p(''),
	...ADR_0009
];

const WEEK_04 = [
	h('Week 04 — Sprint 1 close', 1),
	p('Branch: week-04-sprint1-close', { bold: true }),
	h('Shipped', 2),
	bullet(
		'SonarCloud integration: sonar-project.properties + .github/workflows/sonar.yml. Coverage from vitest in lcov, scanned on push to main and on PRs. Project is on the free tier so feature branches scan only via their PR diff.'
	),
	bullet(
		'Vitest coverage: new test:coverage script + @vitest/coverage-v8. Reports go to /coverage (text + html + lcov). Same lcov file feeds SonarCloud.'
	),
	bullet(
		'k6 load tests under tests/load/: a smoke test (1 VU, 30 s, used by the post-deploy step) and a sustained run (0 → 20 → 0 VUs over 3 min). Both hit only the public read routes — AI endpoints are excluded because the rate limiter would just produce 429s.'
	),
	bullet(
		'docs/load-test.md explaining the scripts, thresholds, and how to run locally vs against Vercel.'
	),
	bullet(
		'Experiment B: visible vs hidden recommendation reasoning, LLM-judge scored. scripts/experiment-b.ts generates one response per prompt then evaluates it both with [slug] brackets intact (visible) and stripped (hidden). Judge sees them in randomised order and scores trust / clarity / usefulness + a forced preference. Writes docs/experiment-b.md.'
	),
	bullet(
		'Sprint-1 retro (this document) + portfolio summary that links every Sprint-1 artefact in one place.'
	),
	h('Slipped', 2),
	p(
		'The Sonar workflow needed two correction passes after the first push. (1) GitHub Actions blocks `secrets.*` references inside step `if` conditions, so the "skip if SONAR_TOKEN missing" guard I wrote made the workflow file fail to parse outright. (2) Free SonarCloud rejects pushes from non-main branches with "Organization is not allowed to access data from non main branches", so the workflow had to be retargeted to `main` + PRs only. Both fixed in the same week; small irritation rather than a real slip.'
	),
	h('Rescoped', 2),
	p(
		'Originally intended to do a "first production deploy" as a discrete step. Vercel was already auto-deploying every push to main, so the "first prod deploy" had effectively happened weeks ago. Replaced with a smoke-test action that runs the k6 smoke against the prod URL post-deploy, which is a more useful artefact.'
	),
	h('Reflection', 2),
	p(
		"Experiment B produced the most interesting finding of the sprint, and it ran against the brief's own assumption. The brief expected visible reasoning to improve trust; the LLM judge said the opposite: trust was a tie (4.90 both sides) but the markdown brackets dragged clarity down (4.30 vs 5.00). The right read isn't \"ship the hidden variant\" — it's that the value of slug citations lives in their being interactive (clickable chips that scroll or link), not in their being literally present in the prose. A real user study with the rendered UI would settle it; the experiment can't."
	),
	p(
		'The other lesson is operational: every "infrastructure" piece this week (Sonar, k6, the smoke action) took longer than the code change. Setting up the SonarCloud organisation, switching from automatic to CI-based analysis, finding the secrets policy on `if`, learning that free-tier rejects non-main pushes — none of that is in the README of any tool. Worth budgeting more time for the setup loop on similar tooling in Sprint 2.'
	),
	h('Learning outcomes', 2),
	bulletLead(
		'Engineering Approach',
		'Experiment B with an explicit hypothesis (visible reasoning increases trust) and a result that challenged the hypothesis — the cycle "form a hypothesis, run the test, accept what the data says even when it disagrees with what I expected". Informed decision to use SonarCloud free tier over self-hosted SonarQube, motivated by the solo-developer stakeholder context rather than chosen by default.'
	),
	bulletLead(
		'Software Quality',
		'SonarCloud measures maintainability, reliability, security, and duplication continuously on every push to main — the quality-attribute coverage the ISO 25010 lens asks for. k6 load tests measure performance under realistic VU counts. Vitest coverage feeds the SonarCloud dashboard via lcov. The quality numbers now have a home outside my own head.'
	),
	bulletLead(
		'Software Maintenance',
		'The heaviest learning outcome of the week. DORA metrics report + weekly refresh action — deployment frequency, lead time, change failure rate, MTTR all measured automatically. Post-deploy smoke action runs the k6 smoke against the prod URL after every merge to main. SonarCloud CI on every push. The four DORA metrics now serve as the dashboard for delivery-process improvement.'
	),
	bulletLead(
		'Professional Standard',
		"The sprint-1 retro is the critical reflection on the followed research process the learning outcome describes — what to change, what to keep, what the experiments said and did not say. Experiment B's caveats section explicitly flags same-family judge bias, the small sample, and the gap between raw markdown and rendered UI — methodological transparency over a clean headline."
	),
	bulletLead(
		'Personal Leadership',
		'Sprint retro forced a "what would I change about the process" question, and the answer fed concrete planning for Sprint 2 (treat infrastructure tickets as full slices, write experiment metrics before running, reason about constraints from the UI down). Feedback acted upon, not just collected.'
	)
];

const WEEK_05 = [
	h('Week 05 — admin platform + Spec-Kit + local SonarQube', 1),
	p('Branch: week-05-admin', { bold: true }),
	p('Tags: shipped, slipped, rescoped', { bold: true }),
	h('Shipped', 2),
	bullet(
		'Spec-Kit installed and adopted as the Sprint 2 workflow: .specify/ scaffolding (templates, scripts, integrations), a Joule constitution with five named principles, and .claude/skills/speckit-* slash commands tracked in the repo so the methodology ships with it. The first commit on the branch was the spec-and-plan for the admin slice, not code.'
	),
	bullet(
		'Feature 001 — admin product management. specs/001-admin-product-management/ holds spec.md (3 user stories, 10 FRs, 5 SCs), plan.md (constitution check green, phase-0 research, phase-1 design), tasks.md (24 tasks with FR/SC traceability), and a green requirements checklist. Implementation: /admin route shell with role guard, /admin/products with inline price/stock edit and featured toggle, filter chips (All / Featured / Low stock < 5). Two-layer access control — SvelteKit route guard + Supabase RLS — written down in ADR 0006.'
	),
	bullet(
		'Feature 002 — admin review moderation. specs/002-admin-review-moderation/ follows the same shape. Migration 20260519140000_reviews_hidden.sql adds a hidden_at timestamp and tightens the "reviews readable" RLS policy to "hidden_at is null or public.is_admin()", so the database does the visibility filtering and the customer-facing query needs no change. /admin/reviews page with hide / show / permanent-delete (delete is gated by a confirmation prompt at both the client and the action handler).'
	),
	bullet(
		"isAdmin() helper at src/lib/server/auth.ts. Public.is_admin() SQL function (security definer) so RLS policies can call it without recursion. Migration 20260519130000 fixed a pre-existing recursive policy on profiles that the admin work surfaced — auth.uid() = id or exists (select 1 from profiles ...) inside its own policy meant Postgres returned 42P17 and isAdmin() couldn't read its row. Replaced the subquery with a call to is_admin()."
	),
	bullet(
		"Unit-coverage backfill to 96.58% lines / 95.97% functions / 94.28% statements / 85.88% branches against an 85 / 75 / 80 / 85 gate in vite.config.ts. New tests target src/lib/server/admin/* (products + reviews helpers — 100% lines), src/lib/server/auth.ts (100% lines), and the supabase-stub helper got a .not() method to match Postgrest's filter syntax. The earlier 8% line coverage that triggered the backfill is gone."
	),
	bullet(
		'k6 load suite expanded from two scripts to five: smoke (now with content-marker assertions, not just status / body-length), sustained (weighted route mix + per-route p95 thresholds), journey (three realistic user flows with traffic-matching weights), spike (2 → 50 VUs burst + recovery assertion), stress (5-stage VU climb up to 120 with per-stage thresholds). Each script is pointed at a specific question; the docs at docs/load-test.md explain which one answers what.'
	),
	bullet(
		'Local SonarQube replacing SonarCloud. docker-compose.sonarqube.yml stands up the Community Edition server with a Postgres backend. scripts/sonar-setup.js provisions the "Joule" quality gate via SonarQube\'s REST API (gate-as-code — the QUALITY_GATE array in the script is the source of truth, idempotent). New CI workflow .github/workflows/sonarqube.yml spins SonarQube + Postgres up inside the runner via the same compose file, provisions the gate, runs the scan, fails the job if the gate fails, tears down. Mirrors the docker-run-then-./gradlew-sonar shape from the previous Java pipeline.'
	),
	bullet(
		'ADR 0006 — admin UI uses the request-scoped Supabase client, not service-role. Captures the choice to make RLS the load-bearing access-control layer rather than relying on the route guard alone. docs/sonar.md added with full local + CI walkthrough, three-token-types reference, and the gate-as-code reasoning.'
	),
	h('Slipped', 2),
	p(
		"Two operator-side surprises cost half a day each. (1) SonarCloud's free tier doesn't let you customise the quality gate at all — the assumption that the cloud version would scale to a real project was wrong, and discovering it after the fact meant rebuilding the whole SonarQube setup locally with docker-compose, a setup script, and a new workflow. (2) The recursive \"profile read self\" RLS policy from Week 1's init migration had been broken the whole time but never tripped because nothing in the customer code reads the profiles table directly. Building the admin UI was the first thing that did, and it hit the 42P17 wall immediately — required a fix migration plus a sign-out / sign-back-in to clear the session cache."
	),
	h('Rescoped', 2),
	p(
		'Original Sprint-2 brief included fulfilment, user admin, analytics, and AI-assisted support drafting alongside product management and review moderation. Cut to just the two — RBAC + product management + review moderation — because each one carries enough net-new surface (migration + server module + route + tests + BDD + ADR) that doing three more in the same week would have been shallow. The other four move to Weeks 6 / 7 where they can each get the same treatment.'
	),
	p(
		'Inside the admin UI, the original plan was a Supabase pagination on the products list. Scope cut after looking at the data — 73 rows, fits on one page without scrolling on a normal monitor, pagination would have added complexity for no user benefit. The plan.md was updated to record the rescope so the spec stays honest.'
	),
	h('Reflection', 2),
	p(
		'Spec-Kit changed the rhythm of the week. The two implementation slices each ran "spec → plan → tasks → tests → code → commit" in that order, with the spec and plan committed first as their own artifact. The change shows up most in code review: the diff for slice 001 is ~1300 lines, but the spec and plan answer "what is this for and why" in 250 lines before you read the diff. The week-04 retrospective complained that "Stripe webhook integration touched seven files and the reviewer couldn\'t tell what it was supposed to do without reading every file." Spec-first means that\'s no longer the failure mode.'
	),
	p(
		'The recursive RLS bug is the kind of latent issue that only surfaces when the surface area widens. The migration that fixed it documents the cause clearly enough that nobody adding a future profiles read should hit the same problem. Worth adopting as a habit: every time a long-standing RLS policy gets exercised by new code, sanity-check it against the recursion case in advance.'
	),
	p(
		"Moving Sonar from cloud to self-hosted was rescoped mid-week and ate more time than the original SonarCloud setup did in Week 4 — but the result is fundamentally different. The quality gate is now defined in code (scripts/sonar-setup.js), provisioned by an idempotent script, and re-applied on every push to main via CI. That's the gate-as-code property the project actually needed, and it would have been impossible on the free SonarCloud tier no matter how much time was spent configuring it."
	),
	h('Learning outcomes', 2),
	bulletLead(
		'Engineering Approach',
		"Adopted Spec-Kit as the Sprint-2 design discipline — every feature larger than a single file ships with spec.md / plan.md / tasks.md / checklists/requirements.md before any code lands. The first ADR of the week (0006) documents the architectural choice to use RLS as the load-bearing access-control layer rather than relying on the route guard; the constitution's Principle I formalises that as a project-wide rule. Decisions made deliberately and recorded, not assumed."
	),
	bulletLead(
		'Software Quality',
		'Coverage gate raised from a notional 8% to an enforced 85% lines / 75% branches / 80% functions / 85% statements via vite.config.ts thresholds. Quality-gate-as-code: the QUALITY_GATE array in scripts/sonar-setup.js defines the SonarQube conditions, the setup runs idempotently against any SonarQube instance (local docker, CI ephemeral, or external host), and the gate is reconciled on every push to main. The K6 suite grew from two scripts to five, each pointed at a specific question about a different quality attribute (correctness, latency under load, latency under realistic flow, behaviour under spike, capacity ceiling).'
	),
	bulletLead(
		'Software Maintenance',
		"Two layers of access-control redundancy — a route guard AND row-level security policies — so a regression in either layer doesn't compromise the system. The recursive RLS policy fix migration shows the same maintenance mindset in reverse: a latent bug in shipped code, found via new feature work, fixed in a tracked migration with the cause explained in the SQL comments so it doesn't recur. The new sonarqube.yml workflow validates Sonar configuration changes on every relevant PR without requiring any external infrastructure, so the gate-as-code property stays maintainable."
	),
	bulletLead(
		'Professional Standard',
		'Spec-Kit\'s spec / plan / tasks discipline matches GitHub\'s public methodology, applied verbatim rather than reinvented. The constitution.md adopts the language of "principles", "violations", "complexity tracking", and "amendment versioning" — vocabulary borrowed from the framework rather than improvised — so the code review process speaks the same idiom as the documentation. Critical reflection on the cloud-vs-self-hosted Sonar trade-off is documented in this retro rather than papered over; the SonarCloud setup from Week 4 wasn\'t wrong-at-the-time, but Sprint 2\'s needs outgrew it and the change is justified in writing.'
	),
	bulletLead(
		'Personal Leadership',
		'Two examples of acted-upon feedback. (1) The DORA report from earlier in the week showed change-failure-rate at 20% after PR #7 ("fix: auth audit + stock decrement") merged — recognising the fix as a failure (not a feature) is the kind of honesty the metric depends on. (2) When the local SonarQube setup hit a 401 then a 403 during validation, both errors were diagnosed and documented in docs/sonar.md as "three token types, which one each command needs" — turning a setup mistake into a permanent piece of documentation rather than a tribal-knowledge gotcha.'
	)
];

const PORTFOLIO = [
	h('Joule — portfolio summary', 1),
	p(
		'Joule is an AI-augmented electronics store rebuilt as a two-sprint applied-research project. This document is a single entry point — every artefact mentioned below lives in this folder or in the repo.'
	),
	h('The work', 2),
	bullet(
		'Sprint 1 (Weeks 1–4): foundation, commerce core, intelligence layer, sprint close. Four weekly retros under weekly/, plus a sprint-1 rollup in sprint-1-retro.docx.'
	),
	bullet(
		'Sprint 2 (Weeks 5–8, in progress): admin platform, observability + performance, accessibility + Experiment C, synthesis.'
	),
	h('Discipline artefacts', 2),
	bullet(
		'architecture-decisions.docx — nine ADRs covering the chunky technical choices (Supabase, Vercel AI Gateway, embedding-hybrid recommender, paginated reviews, refusing cross-category compare verdicts, admin UI on the request-scoped Supabase client, platform-first observability over a custom dashboard, Vercel edge cache with TTL-only invalidation, Vercel image-optimization over build-time and third-party transformers).'
	),
	bullet(
		'BDD scenarios across three layers in tests/bdd/. Layer 1 is deterministic catalog behaviour (16 scenarios). Layer 2 is structural-invariant: every product slug the assistant cites must exist in the catalog (3 scenarios). Layer 3 is stochastic tolerance: N runs, pass if at least M succeed (3 scenarios).'
	),
	bullet(
		'docs/experiment-a.md — grounded vs ungrounded shopping assistant on 24 prompts. Headline: 51 of 51 grounded slug citations are real (0% hallucination). 254 ungrounded prose mentions, under 5% Joule-correct.'
	),
	bullet(
		"docs/experiment-b.md — visible vs hidden recommendation reasoning, LLM-judge scored on 10 prompts. Counter to the brief's assumption: visible reasoning tied on trust (4.90 each), lost on clarity (4.30 vs 5.00). Caveats noted."
	),
	bullet(
		'docs/dora.md — auto-refreshed weekly by a GitHub Action. Deployment frequency, lead time, change failure rate, MTTR over the last 28 days.'
	),
	h('Quality automation', 2),
	bullet(
		'GitHub Actions on every push: typecheck (svelte-check), lint (eslint + prettier), unit tests (vitest, 218 tests at 96.58% lines), BDD layer 1 (16 deterministic scenarios). The @ai-tagged layer-2 and layer-3 scenarios skip cleanly when the AI gateway key is absent.'
	),
	bullet(
		'Self-hosted SonarQube Community Edition. Spun up inside the GitHub Actions runner via docker-compose, scanned, gate-checked, torn down — no external Sonar host required. The Joule quality gate is defined as code in scripts/sonar-setup.js (line coverage ≥ 85%, branch ≥ 75%, no new bugs / vulnerabilities / code smells) and reconciled on every push to main.'
	),
	bullet(
		'k6 load suite of five scripts in tests/load/. Smoke (1 VU, 30 s, with content-marker assertions) runs against the live deploy after every merge to main. Sustained, journey, spike, and stress are available on demand for the questions each one answers.'
	),
	bullet(
		'Post-deploy smoke action wakes after a push to main, sleeps 90 s for Vercel to settle, then runs the k6 smoke against the prod URL.'
	),
	h('What I can show', 2),
	bullet(
		'The site itself at the Vercel preview / prod URL. /assistant for the chat experience, /compare for the structured comparison, any product page for reviews + intelligence panel + recommender on the account page.'
	),
	bullet(
		'The local SonarQube dashboard for code-quality numbers (docker compose up, then http://localhost:9000). The same gate is enforced in CI.'
	),
	bullet('The two experiment markdowns for the AI-quality numbers.'),
	bullet('The DORA report for the delivery-quality numbers.'),
	bullet('The ADRs and the weekly + sprint retros for the process.'),
	h('What I would not show without context', 2),
	bullet(
		'Experiment B\'s 7-of-10-prefer-hidden result. Sounds like "ship the hidden variant" but is actually "the LLM judge can\'t tell raw markdown brackets from rendered link chips". Worth the caveat every time it comes up.'
	),
	bullet(
		'The DORA failure rate at 0% in early weeks. The heuristic counts fix-prefixed PRs as failures, and Sprint 1 had very few PRs total, so the denominator is small. Sprint 2 numbers will be more meaningful.'
	)
];

const SPRINT_1_RETRO = [
	h('Sprint 1 retro — Weeks 1 to 4', 1),
	p(
		'Closing retro for the first sprint. The weekly retros under weekly/ cover each week individually; this document is the four-week rollup with the things that only become visible over the longer arc.'
	),
	h('What shipped', 2),
	bullet('Foundation (Week 1): SvelteKit 2 + Supabase + RLS + the catalog browse experience.'),
	bullet(
		'Commerce core (Week 2): cart, wishlist, Stripe test-mode checkout, PDPs with image galleries, reviews with aspect ratings, semantic search over pgvector. 16 L1 BDD scenarios.'
	),
	bullet(
		'Intelligence layer (Week 3): conversational assistant with three catalog tools, comparison synthesiser, review-intelligence panel, embedding-hybrid recommender, L2 grounding invariants, Experiment A.'
	),
	bullet(
		'Sprint close (Week 4): SonarCloud + k6 load tests + Experiment B + post-deploy smoke + portfolio summary. Hardening pass merged from a separate branch (typed Database, security headers, idempotent Stripe webhook, unit tests).'
	),
	h('What the experiments said', 2),
	p(
		"Experiment A across 24 prompts: the grounded variant produced 51 product citations, all real (0% hallucination). The ungrounded variant produced 254 prose product mentions, of which less than 5% match anything Joule actually carries — 75% are brands we don't stock, 20% are wrong-generation products of brands we do stock (iPhone 15 instead of 17, Pixel 8 instead of 10). The L2 invariant held under stress."
	),
	p(
		'Experiment B on 10 prompts found that visible vs hidden reasoning didn\'t move trust (tied 4.90 / 4.90) but visible cost clarity (4.30 vs 5.00). The judge was the same model family as the writer, which is a known weakness — same biases on both sides. The honest read is "this experiment can\'t distinguish raw markdown brackets from rendered link chips", which is a methodology lesson for Sprint 2 more than a UX finding.'
	),
	h('What I would change about the process', 2),
	bullet(
		"Write the experiments' metrics BEFORE running them, not after. Experiment A v1's first metric (slug-citation hallucination rate) gave a misleading 0% / 0% tie because the ungrounded variant doesn't emit slug citations at all. The v2 metric (prose product mentions classified by brand and model number) is what made the actual gap visible. Spending an extra hour writing the metric down before pressing run would have saved a day of misleading numbers."
	),
	bullet(
		'Treat "infrastructure" tickets as full slices, not glue. SonarCloud, the DORA report action, the gitattributes pin — each took a real chunk of time. Budgeting them as 30-minute side quests was wrong.'
	),
	bullet(
		'Per-aspect uniqueness on reviews. The schema and UI assume one review per aspect per user; the unique-index hardening migration enforced one review per user period. Caught after deploy. The lesson is that constraints have to be reasoned about from the UI down, not the schema up.'
	),
	h('What I would not change', 2),
	bullet(
		'RLS from the first migration. Every Sprint-1 feature that involved user-scoped data — orders, wishlist, cart, reviews — could have leaked across users if any single route forgot to filter by auth.uid(). RLS at the DB level meant those mistakes were impossible, not just unlikely.'
	),
	bullet(
		'The catalog-cache + recommender split. Sixty-second in-memory caches on the seven hot reads, plus the embedding-hybrid recommender falling back to rule-based when no embeddings are populated, kept latency and cost both predictable across the four weeks without ever having to revisit them.'
	),
	bullet(
		'Splitting Experiment A from L2. L2 (every slug cited must exist in the catalog) ran in CI as a pass/fail gate and held throughout the sprint. Experiment A was the supporting evidence — quantitative, comparative, but never a merge gate. Keeping the two cleanly separated turned out to matter when the prose-mention metric needed rewriting between v1 and v2.'
	),
	h('Numbers for the portfolio', 2),
	bullet(
		'Code: 26 source files in src/, around 9 500 lines added net across Sprint 1 (Weeks 1–4).'
	),
	bullet(
		'Tests: 30 unit tests in vitest, 16 layer-1 BDD scenarios, 3 layer-2 invariants, 3 layer-3 tolerance scenarios. All green in CI.'
	),
	bullet(
		'Hallucinations: 0 of 51 product slug citations from the grounded assistant under a 24-prompt stress.'
	),
	bullet(
		'DORA week-of-Sprint-1-close: deploy frequency 1.4 per week, lead time ~10 minutes (PR opened to merge), failure rate 0%, MTTR n/a.'
	),
	h('Where Sprint 2 starts', 2),
	p(
		'Admin platform (Week 5 in the plan): product management, fulfilment workflow, user admin, review moderation, AI-assisted support drafting, role-based access via RLS. Plus observability + perf (Week 6), accessibility + Experiment C (Week 7), and synthesis (Week 8).'
	),
	h('Learning outcomes — sprint rollup', 2),
	bulletLead(
		'Engineering Approach',
		'Two evidence-based experiments end-to-end (A and B) with quantitative scoring. Multiple feedback loops layered on top of each other: BDD layers 1, 2, and 3; DORA metrics; SonarCloud quality gate. System thinking visible in the shared AI stack (one prompt module, one gateway helper, one tool set across three AI features) and in the checkout reconciliation flow.'
	),
	bulletLead(
		'Software Quality',
		'Five ISO 25010 attributes measured: security via RLS, reliability via L2 invariants, performance efficiency via the cache layer and k6 load tests, maintainability via SonarCloud, functional suitability via the BDD layers. 30 unit tests, 16 layer-1 scenarios, 3 layer-2 invariants, 3 layer-3 tolerance scenarios.'
	),
	bulletLead(
		'Software Maintenance',
		'CI from Week 1, Vercel preview + prod auto-deploys, hardening pass adding security headers + typed DB client + idempotent Stripe webhook, DORA report auto-refreshed weekly, post-deploy smoke action, SonarCloud-driven quality gate on every push to main. The full "automate all" loop is in place.'
	),
	bulletLead(
		'Professional Standard',
		'Two applied-research experiments with methodological transparency. Hard scope guard on AI prompts and explicit refusal patterns for off-catalog requests address AI Act-style obligations. Every non-trivial decision logged with context and consequences (5 ADRs). Weekly retros and this sprint retro produced as portable artefacts the stakeholder can audit.'
	),
	bulletLead(
		'Personal Leadership',
		'Weekly retros every week, sprint retro at sprint close. Explicit "what I would change" lists feeding the next sprint\'s plan. Decision to adopt Spec-Kit as a methodology change in Sprint 2 was made at sprint close — a deliberate growth move rather than continuing on autopilot.'
	)
];

// ---------- build ----------

async function main() {
	console.log('Building docs...');
	await Promise.all([
		writeDoc('README.docx', README),
		writeDoc('architecture-decisions.docx', ARCHITECTURE_DECISIONS),
		writeDoc('weekly/week-01-foundation.docx', WEEK_01),
		writeDoc('weekly/week-02-commerce-core.docx', WEEK_02),
		writeDoc('weekly/week-03-intelligence.docx', WEEK_03),
		writeDoc('weekly/week-04-sprint1-close.docx', WEEK_04),
		writeDoc('weekly/week-05-admin.docx', WEEK_05),
		writeDoc('sprint-1-retro.docx', SPRINT_1_RETRO),
		writeDoc('portfolio-summary.docx', PORTFOLIO)
	]);
	console.log('Done.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

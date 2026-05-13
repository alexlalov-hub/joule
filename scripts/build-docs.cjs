/**
 * Builds the plain Word documents under docs/.
 *
 * Style is deliberately bare: default Arial body, simple bold headings,
 * no tables, no images, no colour. They read like something a student
 * wrote in Word, which is the point.
 *
 * Run: node scripts/build-docs.cjs
 */

const fs = require('node:fs');
const path = require('node:path');
const {
	Document,
	Packer,
	Paragraph,
	TextRun,
	HeadingLevel,
	LevelFormat,
	AlignmentType
} = require('docx');

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

function blank() {
	return new Paragraph({ children: [new TextRun('')] });
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
		'This folder holds the working documentation for the Joule project. Two kinds of documents live here.'
	),
	h('decisions/', 2),
	p(
		'Architecture decision records (ADRs). One file per non-trivial choice made during the build. Each ADR is dated, gives the context, says what was decided, and lists the consequences I expect to live with.'
	),
	bullet('0001 — Supabase as the platform'),
	bullet('0002 — Vercel AI Gateway over the Anthropic SDK directly'),
	bullet('0003 — Embedding-hybrid recommender'),
	bullet('0004 — Paginated reviews with URL-based page state'),
	bullet('0005 — Refuse to write a verdict for cross-category comparisons'),
	h('weekly/', 2),
	p(
		'Short retros at the end of each week. Same three sections in every entry: shipped, slipped, rescoped. Plus a reflection paragraph when something is worth flagging for the next week.'
	),
	bullet('week-01-foundation.docx'),
	bullet('week-02-commerce-core.docx'),
	bullet('week-03-intelligence.docx'),
	h('How to use this folder', 2),
	p(
		'The ADRs and retros are reference material, not gates. Pull requests can cite them. New decisions go in as new ADRs rather than rewriting old ones.'
	)
];

const ADR_0001 = [
	h('ADR 0001 — Supabase as the platform', 1),
	p('Date: April 2026', { bold: true }),
	p('Status: Accepted', { bold: true }),
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
	p('Status: Accepted', { bold: true }),
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
	p('Status: Accepted', { bold: true }),
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
	bullet(
		'Collaborative filter: trickier with a small user base, and harder to explain.'
	),
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
	p('Status: Accepted', { bold: true }),
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
	bullet('Five per page is a UX call to keep the section short enough that the spec list above does not get pushed below the fold.')
];

const ADR_0005 = [
	h('ADR 0005 — Refuse to write a verdict for cross-category comparisons', 1),
	p('Date: May 2026', { bold: true }),
	p('Status: Accepted', { bold: true }),
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
	bullet(
		'SvelteKit 2 + Svelte 5 scaffold with TypeScript, Vitest, Playwright, ESLint, Prettier.'
	),
	bullet('Tailwind v4 with custom palette and typography.'),
	bullet(
		'Supabase project: schema migration for categories, products, product_images, reviews, carts, cart_items, orders, order_items, wishlists; pgvector embedding column on products; RLS policies on day one.'
	),
	bullet('Seed script importing the initial catalog.'),
	bullet('Public catalog pages: /, /categories, /category/[slug], /product/[slug].'),
	bullet('SSR-first rendering with category and price filters.'),
	bullet('Email + password auth via Supabase, with cookie-based SSR sessions through @supabase/ssr.'),
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
		'The Supabase + SvelteKit + Tailwind combination paid off. Almost all of the week\'s time went into actual catalog work rather than infrastructure plumbing. The single decision I would not change is enabling RLS from the first migration — later weeks would have been painful otherwise.'
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
	bullet('Order history on /account with status pills and Resume payment buttons for pending orders.'),
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
		'The recommender was originally a Week 4 deliverable. It moved into Week 3 because once product embeddings were populated (Week 2\'s semantic-search work), the embedding-hybrid path was a small lift on top of the rule-based version. Brought forward to keep Week 4 focused on the experiment write-ups and the first production deploy.'
	),
	h('Reflection', 2),
	p(
		'The most useful artefact of the week was not the assistant itself — it was the second metric in Experiment A. The slug-citation count alone made the experiment look like a tie (both variants at 0% "hallucination") because the ungrounded variant does not know about slug brackets. Adding the prose-mention scorer made the actual difference visible: ungrounded confidently recommends products Joule does not sell (75% wrong brand, 20% wrong generation). The lesson for the next experiment is to think about whether the metric symmetrically applies to both variants before running.'
	)
];

// ---------- build ----------

async function main() {
	console.log('Building docs...');
	await Promise.all([
		writeDoc('README.docx', README),
		writeDoc('decisions/0001-supabase-as-platform.docx', ADR_0001),
		writeDoc('decisions/0002-vercel-ai-gateway.docx', ADR_0002),
		writeDoc('decisions/0003-embedding-hybrid-recommender.docx', ADR_0003),
		writeDoc('decisions/0004-paginated-reviews-url-state.docx', ADR_0004),
		writeDoc('decisions/0005-no-cross-category-verdict.docx', ADR_0005),
		writeDoc('weekly/week-01-foundation.docx', WEEK_01),
		writeDoc('weekly/week-02-commerce-core.docx', WEEK_02),
		writeDoc('weekly/week-03-intelligence.docx', WEEK_03)
	]);
	console.log('Done.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

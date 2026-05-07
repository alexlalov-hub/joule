/**
 * Experiment A — grounded vs ungrounded shopping responses.
 *
 * Runs a fixed set of shopping prompts against two model configurations:
 *
 *   1. GROUNDED: our production system prompt + the three catalog tools
 *      (search_catalog, get_product, list_categories). The model is told
 *      it may only recommend products from Joule's catalog and is required
 *      to cite slugs in [brackets].
 *
 *   2. UNGROUNDED: same model, no system prompt, no tools. The bare model
 *      is asked the same question and given no information about Joule's
 *      catalog whatsoever.
 *
 * For each response we extract square-bracket [slug] citations and check
 * each one against the local catalog seed (the same oracle the L2 BDD
 * scenarios use). We tabulate per-prompt and aggregate hallucination
 * rates, then write a markdown report to docs/experiment-a.md.
 *
 * Run:  npm run experiment:a
 * Required env: AI_GATEWAY_API_KEY
 */

import { config as loadEnv } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateText, stepCountIs } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { products as seedProducts, categories as seedCategories } from '../src/lib/catalog/data';
import { z } from 'zod';

loadEnv({ path: '.env.local' });
loadEnv();

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
	console.error('Missing AI_GATEWAY_API_KEY — set it in .env.local before running.');
	process.exit(1);
}

const MODEL = process.env.JOULE_ASSISTANT_MODEL ?? 'openai/gpt-4.1-mini';
const gateway = createGateway({ apiKey });

const KNOWN_SLUGS = new Set(seedProducts.map((p) => p.slug));

const SLUG_RE = /\[([a-z0-9][a-z0-9-]{1,80})\]/gi;

const PROMPTS = [
	'Recommend a thin laptop under €1500 for travel.',
	'I need wired headphones for an open-plan office.',
	'What is the best phone for camera quality you sell?',
	"I'm shopping for a Christmas gift for someone who edits video. Budget €2500.",
	'Compare a small Mac desktop with a small Windows mini PC.',
	'Show me a noise-cancelling pair of headphones from Sony.',
	'Pick a tablet for an architect who sketches and reads PDFs.',
	'I want a smartwatch that lasts more than three days on one charge.'
];

// Same-shape system prompt as production. Kept inline so the experiment is
// self-contained — if the production prompt changes, the experiment number
// reflects the variant being shipped at run-time.
const GROUNDED_SYSTEM = `You are Joule's shopping assistant. Joule sells laptops, phones, audio, and peripherals.

Use only products in Joule's catalog. Use the tools to find them. Cite product slugs in [brackets] the first time you mention a product. Never invent a product, brand, model number, spec, or price. If you don't have data, call a tool. If a tool result is empty for a category Joule advertises, broaden your search instead of claiming nothing exists.

Reply concisely, plain English, no marketing fluff.`;

// Catalog tools — same shape as production but defined locally so we can
// run without spinning up SvelteKit. Reads against the seed list, which
// matches the live DB after `npm run seed`.
const tools = {
	search_catalog: {
		description:
			'Search the Joule catalog. Either or both of `query` and `category` may be provided.',
		inputSchema: z.object({
			query: z.string().optional(),
			category: z.string().optional(),
			limit: z.number().int().min(1).max(10).default(5)
		}),
		execute: async ({
			query,
			category,
			limit
		}: {
			query?: string;
			category?: string;
			limit: number;
		}) => {
			let scope = seedProducts;
			if (category) scope = scope.filter((p) => p.categorySlug === category);
			if (query) {
				const q = query.toLowerCase();
				const filtered = scope.filter(
					(p) =>
						p.name.toLowerCase().includes(q) ||
						p.brand.toLowerCase().includes(q) ||
						p.tagline.toLowerCase().includes(q)
				);
				if (filtered.length > 0) scope = filtered;
			}
			return {
				count: scope.length,
				results: scope.slice(0, limit).map((p) => ({
					slug: p.slug,
					name: p.name,
					brand: p.brand,
					category: p.categorySlug,
					price_eur: p.priceCents / 100,
					tagline: p.tagline
				}))
			};
		}
	},
	get_product: {
		description: 'Fetch full details for a single product by slug.',
		inputSchema: z.object({ slug: z.string() }),
		execute: async ({ slug }: { slug: string }) => {
			const p = seedProducts.find((x) => x.slug === slug);
			if (!p) return { found: false, slug };
			return {
				found: true,
				product: {
					slug: p.slug,
					name: p.name,
					brand: p.brand,
					price_eur: p.priceCents / 100,
					tagline: p.tagline,
					description: p.description,
					specs: p.specs
				}
			};
		}
	},
	list_categories: {
		description: 'List Joule departments.',
		inputSchema: z.object({}),
		execute: async () => ({
			categories: seedCategories.map((c) => ({ slug: c.slug, name: c.name }))
		})
	}
};

type Run = {
	prompt: string;
	groundedText: string;
	groundedSlugs: string[];
	groundedReal: string[];
	groundedFake: string[];
	ungroundedText: string;
	ungroundedSlugs: string[];
	ungroundedReal: string[];
	ungroundedFake: string[];
};

function extractSlugs(text: string): string[] {
	const out: string[] = [];
	let m: RegExpExecArray | null;
	const re = new RegExp(SLUG_RE.source, SLUG_RE.flags);
	while ((m = re.exec(text)) !== null) out.push(m[1].toLowerCase());
	return [...new Set(out)];
}

async function runGrounded(prompt: string): Promise<string> {
	const result = await generateText({
		model: gateway(MODEL),
		system: GROUNDED_SYSTEM,
		prompt,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		tools: tools as any,
		stopWhen: stepCountIs(6),
		temperature: 0.4
	});
	return result.text;
}

async function runUngrounded(prompt: string): Promise<string> {
	const result = await generateText({
		model: gateway(MODEL),
		prompt,
		temperature: 0.4
	});
	return result.text;
}

async function main() {
	console.log(`→ Running Experiment A across ${PROMPTS.length} prompts on ${MODEL}\n`);

	const runs: Run[] = [];

	for (const prompt of PROMPTS) {
		process.stdout.write(`  · "${prompt.slice(0, 60)}…"\n`);
		const [groundedText, ungroundedText] = await Promise.all([
			runGrounded(prompt).catch((e) => `[grounded run failed: ${(e as Error).message}]`),
			runUngrounded(prompt).catch((e) => `[ungrounded run failed: ${(e as Error).message}]`)
		]);

		const groundedSlugs = extractSlugs(groundedText);
		const ungroundedSlugs = extractSlugs(ungroundedText);

		runs.push({
			prompt,
			groundedText,
			groundedSlugs,
			groundedReal: groundedSlugs.filter((s) => KNOWN_SLUGS.has(s)),
			groundedFake: groundedSlugs.filter((s) => !KNOWN_SLUGS.has(s)),
			ungroundedText,
			ungroundedSlugs,
			ungroundedReal: ungroundedSlugs.filter((s) => KNOWN_SLUGS.has(s)),
			ungroundedFake: ungroundedSlugs.filter((s) => !KNOWN_SLUGS.has(s))
		});
	}

	const report = buildReport(runs);
	const outDir = path.join(process.cwd(), 'docs');
	await mkdir(outDir, { recursive: true });
	const outPath = path.join(outDir, 'experiment-a.md');
	await writeFile(outPath, report, 'utf8');

	console.log(`\n✓ Wrote report to ${path.relative(process.cwd(), outPath)}`);
}

function buildReport(runs: Run[]): string {
	const totalGroundedSlugs = runs.reduce((n, r) => n + r.groundedSlugs.length, 0);
	const totalGroundedFake = runs.reduce((n, r) => n + r.groundedFake.length, 0);
	const totalUngroundedSlugs = runs.reduce((n, r) => n + r.ungroundedSlugs.length, 0);
	const totalUngroundedFake = runs.reduce((n, r) => n + r.ungroundedFake.length, 0);

	const groundedHallucRate = totalGroundedSlugs
		? (100 * totalGroundedFake) / totalGroundedSlugs
		: 0;
	const ungroundedHallucRate = totalUngroundedSlugs
		? (100 * totalUngroundedFake) / totalUngroundedSlugs
		: 0;

	const lines: string[] = [];
	lines.push('# Experiment A — Grounded vs Ungrounded Shopping Responses');
	lines.push('');
	lines.push(`Run at ${new Date().toISOString()} against \`${MODEL}\`.`);
	lines.push(`Catalog oracle: ${KNOWN_SLUGS.size} product slugs from the seed.`);
	lines.push('');
	lines.push('## Method');
	lines.push('');
	lines.push(
		`${PROMPTS.length} shopping prompts run twice each: once with the production system prompt and the three catalog tools (GROUNDED), once with no system prompt and no tools (UNGROUNDED). Both variants use the same model and temperature.`
	);
	lines.push('');
	lines.push(
		'For each response we extract every `[slug]` citation, then label each citation as REAL (in the catalog) or FAKE (not in the catalog — a hallucinated product slug).'
	);
	lines.push('');
	lines.push('## Aggregate');
	lines.push('');
	lines.push('| Variant | Total slug citations | Real | Fake | Hallucination rate |');
	lines.push('|---|---:|---:|---:|---:|');
	lines.push(
		`| Grounded   | ${totalGroundedSlugs} | ${totalGroundedSlugs - totalGroundedFake} | ${totalGroundedFake} | ${groundedHallucRate.toFixed(1)}% |`
	);
	lines.push(
		`| Ungrounded | ${totalUngroundedSlugs} | ${totalUngroundedSlugs - totalUngroundedFake} | ${totalUngroundedFake} | ${ungroundedHallucRate.toFixed(1)}% |`
	);
	lines.push('');

	lines.push('## Per-prompt');
	lines.push('');
	for (const r of runs) {
		lines.push(`### Prompt — _${escapeMd(r.prompt)}_`);
		lines.push('');
		lines.push('**Grounded slugs cited:** ' + formatSlugs(r.groundedSlugs, KNOWN_SLUGS));
		lines.push('');
		lines.push('**Ungrounded slugs cited:** ' + formatSlugs(r.ungroundedSlugs, KNOWN_SLUGS));
		lines.push('');
		lines.push('<details><summary>Grounded response</summary>');
		lines.push('');
		lines.push('```');
		lines.push(r.groundedText.trim());
		lines.push('```');
		lines.push('');
		lines.push('</details>');
		lines.push('');
		lines.push('<details><summary>Ungrounded response</summary>');
		lines.push('');
		lines.push('```');
		lines.push(r.ungroundedText.trim());
		lines.push('```');
		lines.push('');
		lines.push('</details>');
		lines.push('');
	}
	return lines.join('\n');
}

function formatSlugs(slugs: string[], known: Set<string>): string {
	if (slugs.length === 0) return '_none_';
	return slugs.map((s) => (known.has(s) ? `\`${s}\` ✓` : `\`${s}\` **✗ FAKE**`)).join(', ');
}

function escapeMd(s: string): string {
	return s.replace(/_/g, '\\_').replace(/\*/g, '\\*');
}

main().catch((err) => {
	console.error('Experiment failed:', err);
	process.exit(1);
});

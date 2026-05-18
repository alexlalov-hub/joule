import { expect, type APIRequestContext } from '@playwright/test';
import { Then, When } from './fixtures';
import { products as seedProducts } from '../../../src/lib/catalog/data';

/**
 * Layer 3 (tolerance) steps. Each scenario picks a "recipe" — one of
 * the named verbs in the recipe map below — and runs it N times in
 * parallel against the live model. The tally is kept on the module
 * scope so the matching Then step can assert "at least M of N".
 *
 * Threshold (M of N) is encoded in the scenario, not here, so the
 * tolerance for each behaviour stays visible in the feature file.
 *
 * Reuses the same KNOWN_SLUGS oracle as layer 2.
 */

const KNOWN_SLUGS = new Set(seedProducts.map((p) => p.slug));
const SLUG_RE = /\[([a-z0-9][a-z0-9-]{1,80})\]/gi;
const CITATION_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

type Recipe = (req: APIRequestContext) => Promise<string>;

const RECIPES: Record<string, Recipe> = {
	'ask the assistant for a recommendation for a laptop': async (req) => {
		const res = await req.post('/api/assistant', {
			data: {
				messages: [
					{
						id: 'u1',
						role: 'user',
						parts: [{ type: 'text', text: 'Recommend a laptop from the Joule catalog.' }]
					}
				]
			}
		});
		expect(res.ok(), `assistant endpoint failed (${res.status()})`).toBe(true);
		return res.text();
	},
	'request a comparison of macbook-air-m4-13 and xps-13-plus': async (req) => {
		const res = await req.post('/api/compare', {
			data: { slugs: ['macbook-air-m4-13', 'xps-13-plus'] }
		});
		expect(res.ok(), `compare endpoint failed (${res.status()})`).toBe(true);
		return res.text();
	},
	'request review intelligence for macbook-air-m4-13': async (req) => {
		const res = await req.post('/api/review-intelligence', {
			data: { slug: 'macbook-air-m4-13' }
		});
		expect(res.ok(), `review-intelligence endpoint failed (${res.status()})`).toBe(true);
		return res.text();
	}
};

let lastRuns: string[] = [];

When('I run {string} {int} times', async ({ request }, recipeName: string, n: number) => {
	const recipe = RECIPES[recipeName];
	if (!recipe) {
		throw new Error(
			`L3: no recipe named "${recipeName}". Add it to RECIPES in tests/bdd/steps/l3.steps.ts.`
		);
	}
	// Run sequentially rather than in parallel to keep the model load
	// honest and avoid rate-limit headaches. Each run is independent.
	lastRuns = [];
	for (let i = 0; i < n; i++) {
		lastRuns.push(await recipe(request));
	}
});

Then(
	'at least {int} of {int} runs should cite at least one real catalog slug',
	(_ctx, threshold: number, total: number) => {
		expect(lastRuns.length).toBe(total);
		const passes = lastRuns.filter((text) =>
			extractSlugs(text).some((s) => KNOWN_SLUGS.has(s))
		).length;
		recordTolerance(passes, total, threshold);
	}
);

Then(
	'at least {int} of {int} runs should mention more than one use case from {string}',
	(_ctx, threshold: number, total: number, list: string) => {
		expect(lastRuns.length).toBe(total);
		const keywords = list
			.split(',')
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean);
		const passes = lastRuns.filter((text) => {
			const lower = text.toLowerCase();
			const hits = keywords.filter((k) => lower.includes(k)).length;
			return hits >= 2;
		}).length;
		recordTolerance(passes, total, threshold);
	}
);

Then(
	'at least {int} of {int} runs should cite at least {int} distinct review numbers',
	(_ctx, threshold: number, total: number, distinct: number) => {
		expect(lastRuns.length).toBe(total);
		const passes = lastRuns.filter(
			(text) => new Set(extractCitationNumbers(text)).size >= distinct
		).length;
		recordTolerance(passes, total, threshold);
	}
);

function recordTolerance(passes: number, total: number, threshold: number): void {
	// The print is intentional — the tolerance number is itself the data
	// we want to surface in CI logs.
	console.log(`[L3] ${passes}/${total} runs passed (threshold ${threshold}/${total})`);
	expect(
		passes,
		`tolerance failed: ${passes}/${total} runs passed, threshold ${threshold}/${total}`
	).toBeGreaterThanOrEqual(threshold);
}

function extractSlugs(text: string): string[] {
	const out: string[] = [];
	let m: RegExpExecArray | null;
	const re = new RegExp(SLUG_RE.source, SLUG_RE.flags);
	while ((m = re.exec(text)) !== null) out.push(m[1].toLowerCase());
	return out;
}

function extractCitationNumbers(text: string): number[] {
	const out: number[] = [];
	let m: RegExpExecArray | null;
	const re = new RegExp(CITATION_RE.source, CITATION_RE.flags);
	while ((m = re.exec(text)) !== null) {
		for (const n of m[1].split(',')) {
			const num = Number(n.trim());
			if (Number.isFinite(num)) out.push(num);
		}
	}
	return out;
}

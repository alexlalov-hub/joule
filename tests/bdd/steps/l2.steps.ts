import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { products as seedProducts } from '../../../src/lib/catalog/data';

/**
 * Layer 2 (structural-invariant) steps. These call live AI endpoints and
 * assert structural properties of the response — never specific wording,
 * since the prose is stochastic.
 *
 * The set of valid product slugs is loaded from the local seed. In CI this
 * matches what the live DB has after the seed script runs; locally without
 * a DB the assistant's tools fall back to the same seed, so this is the
 * authoritative oracle.
 */

const KNOWN_SLUGS = new Set(seedProducts.map((p) => p.slug));

const SLUG_RE = /\[([a-z0-9][a-z0-9-]{1,80})\]/gi;
const CITATION_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

let lastResponseText = '';
let lastInputSlugs: string[] = [];
let lastReviewCount = 0;

Given('the AI gateway is configured', () => {
	// The @ai tag filter in playwright.bdd.config.ts already excludes these
	// scenarios when AI_GATEWAY_API_KEY is unset, so reaching this step
	// implies the key is present. We assert it anyway for safety.
	expect(process.env.AI_GATEWAY_API_KEY, 'AI_GATEWAY_API_KEY is not set').toBeTruthy();
});

When('I ask the assistant {string}', async ({ request }, prompt: string) => {
	lastInputSlugs = [];
	const res = await request.post('/api/assistant', {
		data: {
			messages: [
				{
					id: 'u1',
					role: 'user',
					parts: [{ type: 'text', text: prompt }]
				}
			]
		}
	});
	expect(res.ok(), `assistant endpoint failed (${res.status()})`).toBe(true);
	lastResponseText = await res.text();
});

When(
	'I request a comparison of {string} and {string}',
	async ({ request }, slugA: string, slugB: string) => {
		lastInputSlugs = [slugA, slugB];
		const res = await request.post('/api/compare', {
			data: { slugs: lastInputSlugs }
		});
		expect(res.ok(), `compare endpoint failed (${res.status()})`).toBe(true);
		lastResponseText = await res.text();
	}
);

When('I request review intelligence for {string}', async ({ request }, slug: string) => {
	const res = await request.post('/api/review-intelligence', {
		data: { slug }
	});
	expect(res.ok(), `review-intelligence endpoint failed (${res.status()})`).toBe(true);
	lastResponseText = await res.text();
	// We seed exactly 4 reviews per product, so any citation [1]..[4] is valid.
	// Real DB rows accumulate beyond that; the BDD oracle uses the seed shape.
	lastReviewCount = 4;
});

Then('every cited product slug should resolve in the catalog', () => {
	const slugs = extractSlugs(lastResponseText);
	expect(slugs.length, 'assistant response had no slug citations').toBeGreaterThan(0);
	for (const slug of slugs) {
		expect(KNOWN_SLUGS.has(slug), `cited slug "${slug}" is not in the catalog`).toBe(true);
	}
});

Then('every cited product slug in the verdict should be one of the inputs', () => {
	const slugs = extractSlugs(lastResponseText);
	const inputSet = new Set(lastInputSlugs);
	for (const slug of slugs) {
		expect(
			inputSet.has(slug),
			`compare verdict cited "${slug}", which was not in the input set [${[...inputSet].join(', ')}]`
		).toBe(true);
	}
});

Then('every citation number should be within the review count', () => {
	const cites = extractCitationNumbers(lastResponseText);
	expect(cites.length, 'review-intelligence response had no citations').toBeGreaterThan(0);
	for (const n of cites) {
		expect(
			n >= 1 && n <= lastReviewCount,
			`citation [${n}] is out of range 1..${lastReviewCount}`
		).toBe(true);
	}
});

// ---------- helpers ----------

function extractSlugs(text: string): string[] {
	const out: string[] = [];
	let m: RegExpExecArray | null;
	const re = new RegExp(SLUG_RE.source, SLUG_RE.flags);
	while ((m = re.exec(text)) !== null) {
		out.push(m[1].toLowerCase());
	}
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

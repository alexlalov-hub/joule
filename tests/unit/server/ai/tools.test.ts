import { describe, expect, it } from 'vitest';
import { catalogTools } from '$lib/server/ai/tools';
import { categories as seedCategories, products as seedProducts } from '$lib/catalog/data';

/**
 * The tool executors call into $lib/catalog/queries which falls back to the
 * in-memory seed when supabase is null. So passing null gives us deterministic
 * fixture data without any mocking.
 */
const tools = catalogTools(null);

// The AI SDK's `tool()` helper wraps the executor in a typed object. We need
// the raw executor for these tests — pull it off the tool definition.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exec<T = any>(name: keyof typeof tools, args: unknown): Promise<T> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const t = tools[name] as any;
	return t.execute(args) as Promise<T>;
}

describe('catalogTools.search_catalog', () => {
	it('lists every product in a category when query is omitted', async () => {
		const result = await exec<{
			count: number;
			results: Array<{ slug: string; category: string }>;
		}>('search_catalog', { category: 'laptops', limit: 10 });
		expect(result.count).toBeGreaterThan(0);
		for (const r of result.results) expect(r.category).toBe('laptops');
	});

	it('filters by a free-text query', async () => {
		const result = await exec<{
			count: number;
			results: Array<{ slug: string }>;
		}>('search_catalog', { query: 'macbook', limit: 10 });
		const slugs = result.results.map((r) => r.slug);
		expect(slugs.some((s) => s.includes('macbook'))).toBe(true);
	});

	it('respects the limit field', async () => {
		const result = await exec<{
			results: unknown[];
		}>('search_catalog', { limit: 2 });
		expect(result.results.length).toBeLessThanOrEqual(2);
	});

	it('falls back to the broader category when the query yields nothing', async () => {
		const result = await exec<{
			count: number;
			fallback_used: boolean;
			note?: string;
		}>('search_catalog', {
			query: 'thisstringwillneverappearinanydescription',
			category: 'laptops',
			limit: 5
		});
		expect(result.fallback_used).toBe(true);
		expect(result.count).toBeGreaterThan(0);
		expect(result.note).toBeDefined();
	});

	it('respects a price filter (max_price_eur in euros, not cents)', async () => {
		const result = await exec<{
			results: Array<{ price_eur: number }>;
		}>('search_catalog', { category: 'laptops', max_price_eur: 1500, limit: 10 });
		for (const r of result.results) expect(r.price_eur).toBeLessThanOrEqual(1500);
	});

	it('respects a min_price_eur filter', async () => {
		const result = await exec<{
			results: Array<{ price_eur: number }>;
		}>('search_catalog', { min_price_eur: 2000, limit: 10 });
		for (const r of result.results) expect(r.price_eur).toBeGreaterThanOrEqual(2000);
	});

	it('returns shape-compliant rows for every result', async () => {
		const result = await exec<{
			results: Array<{
				slug: string;
				name: string;
				brand: string;
				category: string;
				price_eur: number;
				tagline: string;
				in_stock: boolean;
			}>;
		}>('search_catalog', { limit: 3 });
		for (const r of result.results) {
			expect(typeof r.slug).toBe('string');
			expect(typeof r.name).toBe('string');
			expect(typeof r.brand).toBe('string');
			expect(typeof r.category).toBe('string');
			expect(typeof r.price_eur).toBe('number');
			expect(typeof r.in_stock).toBe('boolean');
		}
	});
});

describe('catalogTools.get_product', () => {
	it('returns a full product when the slug exists', async () => {
		const knownSlug = seedProducts[0].slug;
		const result = await exec<{
			found: boolean;
			product?: { slug: string; specs: Array<unknown>; description: string };
		}>('get_product', { slug: knownSlug });
		expect(result.found).toBe(true);
		expect(result.product?.slug).toBe(knownSlug);
		expect(Array.isArray(result.product?.specs)).toBe(true);
	});

	it('returns { found: false } when the slug is unknown', async () => {
		const result = await exec<{ found: boolean; slug: string }>('get_product', {
			slug: 'definitely-not-a-real-slug-xyz'
		});
		expect(result.found).toBe(false);
		expect(result.slug).toBe('definitely-not-a-real-slug-xyz');
	});
});

describe('catalogTools.list_categories', () => {
	it('returns every seeded category', async () => {
		const result = await exec<{
			categories: Array<{ slug: string; name: string; blurb: string }>;
		}>('list_categories', {});
		expect(result.categories.length).toBe(seedCategories.length);
		for (const c of result.categories) {
			expect(typeof c.slug).toBe('string');
			expect(typeof c.name).toBe('string');
		}
	});
});

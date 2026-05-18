import { describe, expect, it } from 'vitest';
import { listProducts, priceBounds } from '$lib/catalog/queries';
import { products as seedProducts } from '$lib/catalog/data';

/**
 * These tests run against the in-memory seed fallback (no Supabase client).
 * That exercises the same applyFilters / sortSeed logic that backs local
 * dev and CI when no DB is configured.
 */

describe('listProducts (seed fallback)', () => {
	it('returns every seed product when no filters apply', async () => {
		const out = await listProducts(null);
		expect(out.length).toBe(seedProducts.length);
	});

	it('filters by category slug', async () => {
		const out = await listProducts(null, { category: 'laptops' });
		expect(out.length).toBeGreaterThan(0);
		expect(out.every((p) => p.categorySlug === 'laptops')).toBe(true);
	});

	it('respects min and max price bounds in cents', async () => {
		const out = await listProducts(null, { minPrice: 50_000, maxPrice: 150_000 });
		expect(out.length).toBeGreaterThan(0);
		expect(out.every((p) => p.priceCents >= 50_000 && p.priceCents <= 150_000)).toBe(true);
	});

	it('matches brand case-insensitively', async () => {
		const sample = seedProducts[0].brand;
		const upper = await listProducts(null, { brand: sample.toUpperCase() });
		const lower = await listProducts(null, { brand: sample.toLowerCase() });
		expect(upper.length).toBe(lower.length);
		expect(upper.length).toBeGreaterThan(0);
	});

	it('matches free-text query against name/brand/tagline/description', async () => {
		const sample = seedProducts.find((p) => p.name.toLowerCase().includes('macbook'));
		if (!sample) return; // seed shape changed — skip rather than fail spuriously
		const out = await listProducts(null, { query: 'macbook' });
		expect(out.some((p) => p.slug === sample.slug)).toBe(true);
	});

	it('returns nothing for a nonsense query', async () => {
		const out = await listProducts(null, { query: 'qwertyzzzxxx' });
		expect(out).toEqual([]);
	});

	it('sorts ascending by price', async () => {
		const out = await listProducts(null, { sort: 'price_asc' });
		for (let i = 1; i < out.length; i++) {
			expect(out[i].priceCents).toBeGreaterThanOrEqual(out[i - 1].priceCents);
		}
	});

	it('sorts descending by price', async () => {
		const out = await listProducts(null, { sort: 'price_desc' });
		for (let i = 1; i < out.length; i++) {
			expect(out[i].priceCents).toBeLessThanOrEqual(out[i - 1].priceCents);
		}
	});

	it('sorts alphabetically by name', async () => {
		const out = await listProducts(null, { sort: 'name' });
		for (let i = 1; i < out.length; i++) {
			expect(out[i].name.localeCompare(out[i - 1].name)).toBeGreaterThanOrEqual(0);
		}
	});

	it('puts featured products first under the featured sort', async () => {
		const out = await listProducts(null, { sort: 'featured' });
		const firstNonFeatured = out.findIndex((p) => !p.featured);
		const lastFeatured = out.map((p) => !!p.featured).lastIndexOf(true);
		if (firstNonFeatured !== -1 && lastFeatured !== -1) {
			expect(firstNonFeatured).toBeGreaterThan(lastFeatured);
		}
	});
});

describe('priceBounds', () => {
	it('returns zeros for an empty list', () => {
		expect(priceBounds([])).toEqual({ min: 0, max: 0 });
	});

	it('returns the min and max prices in a list', () => {
		const bounds = priceBounds(seedProducts);
		expect(bounds.min).toBeLessThanOrEqual(bounds.max);
		expect(bounds.min).toBe(Math.min(...seedProducts.map((p) => p.priceCents)));
		expect(bounds.max).toBe(Math.max(...seedProducts.map((p) => p.priceCents)));
	});
});

import { beforeEach, describe, expect, it } from 'vitest';
import {
	getCategory,
	getProduct,
	getProductWithId,
	listBrands,
	listByCategory,
	listCategories,
	listFeatured,
	listProducts,
	priceBounds,
	semanticSearch
} from '$lib/catalog/queries';
import { categories as seedCategories, products as seedProducts } from '$lib/catalog/data';
import { clearCache } from '$lib/cache';
import { makeStub } from '../_helpers/supabase-stub';

// Queries memoise their results. Different tests pass different fake
// supabase clients, so cached results from one test would leak into the
// next without an explicit reset.
beforeEach(() => clearCache());

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

describe('listCategories (seed fallback)', () => {
	it('returns every seeded category when no supabase client is supplied', async () => {
		const out = await listCategories(null);
		expect(out.length).toBe(seedCategories.length);
	});
});

describe('listFeatured (seed fallback)', () => {
	it('returns only featured products up to the limit', async () => {
		const out = await listFeatured(null, 4);
		expect(out.length).toBeLessThanOrEqual(4);
		expect(out.every((p) => p.featured)).toBe(true);
	});
});

describe('listByCategory (seed fallback)', () => {
	it('delegates to listProducts with the category filter', async () => {
		const out = await listByCategory(null, 'headphones');
		expect(out.length).toBeGreaterThan(0);
		expect(out.every((p) => p.categorySlug === 'headphones')).toBe(true);
	});
});

describe('getProduct / getProductWithId (seed fallback)', () => {
	it('returns the matching product by slug', async () => {
		const sample = seedProducts[0];
		const out = await getProduct(null, sample.slug);
		expect(out?.slug).toBe(sample.slug);
	});

	it('returns null when no product matches', async () => {
		const out = await getProduct(null, 'does-not-exist');
		expect(out).toBeNull();
	});

	it('getProductWithId returns a null id in the seed fallback', async () => {
		const sample = seedProducts[0];
		const out = await getProductWithId(null, sample.slug);
		expect(out.id).toBeNull();
		expect(out.product?.slug).toBe(sample.slug);
	});
});

describe('getCategory (seed fallback)', () => {
	it('returns a known category by slug', async () => {
		const out = await getCategory(null, 'laptops');
		expect(out?.slug).toBe('laptops');
	});

	it('returns null for an unknown slug', async () => {
		expect(await getCategory(null, 'does-not-exist')).toBeNull();
	});
});

describe('listBrands (seed fallback)', () => {
	it('returns every distinct brand across all products', async () => {
		const out = await listBrands(null);
		expect(out.length).toBeGreaterThan(0);
		expect(new Set(out).size).toBe(out.length); // unique
	});

	it('scopes to a single category', async () => {
		const out = await listBrands(null, 'laptops');
		const expected = new Set(
			seedProducts.filter((p) => p.categorySlug === 'laptops').map((p) => p.brand)
		);
		expect(new Set(out)).toEqual(expected);
	});
});

describe('semanticSearch', () => {
	it('returns [] without a supabase client', async () => {
		const out = await semanticSearch(null, Array(1536).fill(0));
		expect(out).toEqual([]);
	});

	it('returns [] when the RPC produces no rows', async () => {
		const { client } = makeStub({
			match_products: { rpc: { data: [], error: null } }
		});
		const out = await semanticSearch(client, Array(1536).fill(0));
		expect(out).toEqual([]);
	});

	it('orders products by the RPC similarity order', async () => {
		const { client } = makeStub({
			match_products: {
				rpc: {
					data: [
						{ slug: seedProducts[1].slug, similarity: 0.9 },
						{ slug: seedProducts[0].slug, similarity: 0.7 }
					],
					error: null
				}
			},
			products: {
				select: {
					data: [
						{
							slug: seedProducts[0].slug,
							name: seedProducts[0].name,
							brand: seedProducts[0].brand,
							price_cents: seedProducts[0].priceCents,
							tagline: seedProducts[0].tagline,
							description: seedProducts[0].description,
							specs: seedProducts[0].specs,
							stock_qty: seedProducts[0].stockQty,
							featured: seedProducts[0].featured,
							categories: { slug: seedProducts[0].categorySlug },
							product_images: []
						},
						{
							slug: seedProducts[1].slug,
							name: seedProducts[1].name,
							brand: seedProducts[1].brand,
							price_cents: seedProducts[1].priceCents,
							tagline: seedProducts[1].tagline,
							description: seedProducts[1].description,
							specs: seedProducts[1].specs,
							stock_qty: seedProducts[1].stockQty,
							featured: seedProducts[1].featured,
							categories: { slug: seedProducts[1].categorySlug },
							product_images: []
						}
					],
					error: null
				}
			}
		});
		const out = await semanticSearch(client, Array(1536).fill(0));
		expect(out.map((p) => p.slug)).toEqual([seedProducts[1].slug, seedProducts[0].slug]);
	});
});

describe('queries against live supabase (stub)', () => {
	const PRODUCT_ROW = {
		slug: 'macbook-air-m4-13',
		name: 'MacBook Air',
		brand: 'Apple',
		price_cents: 130000,
		tagline: 'Thin and fanless',
		description: 'A great laptop.',
		specs: [],
		stock_qty: 5,
		featured: true,
		categories: { slug: 'laptops' },
		product_images: [{ url: 'image.jpg', alt: '', sort_order: 0 }]
	};

	it('listProducts hits the live query path and shapes rows', async () => {
		const { client } = makeStub({
			products: { select: { data: [PRODUCT_ROW], error: null } }
		});
		const out = await listProducts(client, { category: 'laptops', sort: 'featured' });
		expect(out.length).toBe(1);
		expect(out[0].slug).toBe('macbook-air-m4-13');
	});

	it('listProducts falls back to the seed when the live query errors', async () => {
		const { client } = makeStub({
			products: { select: { data: null, error: { message: 'boom' } } }
		});
		const out = await listProducts(client, { category: 'laptops' });
		// Falls back to the seed-derived listing for that category.
		expect(out.every((p) => p.categorySlug === 'laptops')).toBe(true);
	});

	it('listProducts threads each filter through the query builder', async () => {
		const { client } = makeStub({
			products: { select: { data: [PRODUCT_ROW], error: null } }
		});
		// We don't assert exact eq() arguments — the stub flattens them — but
		// the live path should hit "select" once and complete.
		const out1 = await listProducts(client, {
			query: 'macbook',
			brand: 'Apple',
			minPrice: 100,
			maxPrice: 200000,
			sort: 'price_asc'
		});
		expect(out1.length).toBe(1);
		const out2 = await listProducts(client, { sort: 'price_desc' });
		expect(out2.length).toBe(1);
		const out3 = await listProducts(client, { sort: 'name' });
		expect(out3.length).toBe(1);
	});

	it('listFeatured hits the live query', async () => {
		const { client } = makeStub({
			products: { select: { data: [PRODUCT_ROW], error: null } }
		});
		const out = await listFeatured(client, 5);
		expect(out.length).toBe(1);
		expect(out[0].slug).toBe('macbook-air-m4-13');
	});

	it('listFeatured falls back to seed on error', async () => {
		const { client } = makeStub({
			products: { select: { data: null, error: { message: 'oops' } } }
		});
		const out = await listFeatured(client, 5);
		expect(out.every((p) => p.featured)).toBe(true);
	});

	it('getProduct returns the live row', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: PRODUCT_ROW, error: null } }
		});
		const out = await getProduct(client, 'macbook-air-m4-13');
		expect(out?.slug).toBe('macbook-air-m4-13');
	});

	it('getProduct returns null when nothing matches', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: null, error: null } }
		});
		expect(await getProduct(client, 'nope')).toBeNull();
	});

	it('getProduct falls back to seed on error', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: null, error: { message: 'boom' } } }
		});
		const sample = seedProducts[0];
		expect((await getProduct(client, sample.slug))?.slug).toBe(sample.slug);
	});

	it('getProductWithId returns { id, product }', async () => {
		const { client } = makeStub({
			products: {
				maybeSingle: { data: { id: 'p1', ...PRODUCT_ROW }, error: null }
			}
		});
		const out = await getProductWithId(client, 'macbook-air-m4-13');
		expect(out.id).toBe('p1');
		expect(out.product?.slug).toBe('macbook-air-m4-13');
	});

	it('getProductWithId returns { id: null, product: null } when no row', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: null, error: null } }
		});
		expect(await getProductWithId(client, 'no')).toEqual({ id: null, product: null });
	});

	it('getCategory returns the live row', async () => {
		const { client } = makeStub({
			categories: {
				maybeSingle: { data: { slug: 'laptops', name: 'Laptops', blurb: 'a' }, error: null }
			}
		});
		const out = await getCategory(client, 'laptops');
		expect(out?.name).toBe('Laptops');
	});

	it('getCategory returns null when no row matches', async () => {
		const { client } = makeStub({
			categories: { maybeSingle: { data: null, error: null } }
		});
		expect(await getCategory(client, 'no')).toBeNull();
	});

	it('listBrands returns distinct brands from the live query', async () => {
		const { client } = makeStub({
			products: {
				select: { data: [{ brand: 'Apple' }, { brand: 'Sony' }, { brand: 'Apple' }], error: null }
			}
		});
		const out = await listBrands(client, 'laptops');
		expect(out).toEqual(['Apple', 'Sony']);
	});

	it('listBrands returns [] when the query errors', async () => {
		const { client } = makeStub({
			products: { select: { data: null, error: { message: 'oops' } } }
		});
		expect(await listBrands(client)).toEqual([]);
	});

	it('listCategories falls back to seed on error', async () => {
		const { client } = makeStub({
			categories: { select: { data: null, error: { message: 'oops' } } }
		});
		const out = await listCategories(client);
		expect(out.length).toBe(seedCategories.length);
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

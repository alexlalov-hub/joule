import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '$lib/catalog/types';

/**
 * Recommendations cover two paths:
 *   - Rule-based fallback: no embeddings, signals scored per category.
 *   - Embedding-hybrid: signal products carry embeddings, user vector is
 *     averaged, candidates retrieved via the match_products RPC, then
 *     re-ranked with brand/price/featured factors.
 *
 * We mock listProducts and listWishlist (and the supabase client itself
 * for the order/embedding/RPC queries) so the test is hermetic.
 */

const mockListProducts = vi.fn<(sb: unknown) => Promise<Product[]>>();
const mockListWishlist = vi.fn<(sb: unknown, userId: string) => Promise<Array<{ slug: string }>>>();

vi.mock('$lib/catalog/queries', () => ({
	listProducts: (sb: unknown) => mockListProducts(sb)
}));

vi.mock('$lib/server/wishlist', () => ({
	listWishlist: (sb: unknown, userId: string) => mockListWishlist(sb, userId)
}));

import { recommendForUser } from '$lib/server/recommendations';
import { makeStub } from '../_helpers/supabase-stub';

// Test catalog — small, distinctly branded/priced.
function p(
	slug: string,
	brand: string,
	categorySlug: string,
	priceCents: number,
	featured = false
): Product {
	return {
		slug,
		name: slug,
		brand,
		categorySlug,
		priceCents,
		tagline: '',
		description: '',
		specs: [],
		images: [],
		stockQty: 5,
		featured
	};
}

const CATALOG: Product[] = [
	// Laptops — Apple
	p('macbook-air', 'Apple', 'laptops', 130000, true),
	p('macbook-pro', 'Apple', 'laptops', 240000, true),
	// Laptops — Dell
	p('xps-13', 'Dell', 'laptops', 145000, false),
	p('xps-15', 'Dell', 'laptops', 230000, false),
	// Headphones — Sony
	p('sony-wh-1000xm6', 'Sony', 'headphones', 45000, true),
	p('sony-linkbuds', 'Sony', 'headphones', 20000, false),
	// Headphones — Bose
	p('bose-qc-ultra', 'Bose', 'headphones', 38000, true),
	// Phones — Apple
	p('iphone-17-pro', 'Apple', 'smartphones', 130000, true),
	// Speakers — Sonos
	p('sonos-era-300', 'Sonos', 'speakers', 50000, false)
];

beforeEach(() => {
	mockListProducts.mockReset();
	mockListWishlist.mockReset();
	mockListProducts.mockResolvedValue(CATALOG);
	mockListWishlist.mockResolvedValue([]);
});

describe('recommendForUser — guard rails', () => {
	it('returns [] without a supabase client', async () => {
		expect(await recommendForUser(null, 'user-1')).toEqual([]);
	});

	it('returns [] without a userId', async () => {
		const { client } = makeStub({});
		expect(await recommendForUser(client, null)).toEqual([]);
	});

	it('returns [] when the user has no signals at all', async () => {
		// Orders empty, wishlist empty.
		const { client } = makeStub({
			orders: { select: { data: [], error: null } }
		});
		mockListWishlist.mockResolvedValue([]);
		const result = await recommendForUser(client, 'user-1');
		expect(result).toEqual([]);
	});
});

describe('recommendForUser — rule-based fallback (no embeddings)', () => {
	it('recommends from the strongest signal category, excluding seen products', async () => {
		// User bought macbook-air. No embeddings populated → embeddings.length === 0
		// after the signal-embedding fetch → fall through to rule-based.
		const { client } = makeStub({
			orders: {
				select: {
					data: [{ order_items: [{ product_slug: 'macbook-air' }] }],
					error: null
				}
			},
			products: { select: { data: [{ slug: 'macbook-air', embedding: null }], error: null } }
		});
		const result = await recommendForUser(client, 'user-1');
		expect(result.length).toBeGreaterThan(0);
		// Anchor should be macbook-air (the bought product).
		expect(result[0].reason.anchorSlug).toBe('macbook-air');
		// Should never recommend the already-bought product back.
		expect(result.some((r) => r.product.slug === 'macbook-air')).toBe(false);
		// Reason kind: bought (rule-based path uses signal kinds).
		expect(['bought', 'saved']).toContain(result[0].reason.kind);
	});

	it('caps at 2 per category', async () => {
		// Heavy laptop signal — but catalog has 4 laptops; expect at most 2.
		const { client } = makeStub({
			orders: {
				select: {
					data: [
						{ order_items: [{ product_slug: 'macbook-air' }] },
						{ order_items: [{ product_slug: 'macbook-pro' }] }
					],
					error: null
				}
			},
			products: { select: { data: [], error: null } } // no embeddings
		});
		const result = await recommendForUser(client, 'user-1');
		const laptopRecs = result.filter((r) => r.product.categorySlug === 'laptops');
		expect(laptopRecs.length).toBeLessThanOrEqual(2);
	});

	it('attributes saved signal kind for wishlist-only users', async () => {
		mockListWishlist.mockResolvedValue([{ slug: 'sony-wh-1000xm6' }]);
		const { client } = makeStub({
			orders: { select: { data: [], error: null } },
			products: { select: { data: [], error: null } } // no embeddings
		});
		const result = await recommendForUser(client, 'user-1');
		expect(result[0].reason.kind).toBe('saved');
		expect(result[0].reason.anchorSlug).toBe('sony-wh-1000xm6');
	});

	it('returns [] when listProducts returns nothing in the signal categories', async () => {
		mockListProducts.mockResolvedValue([]);
		const { client } = makeStub({
			orders: {
				select: { data: [{ order_items: [{ product_slug: 'unknown-thing' }] }], error: null }
			},
			products: { select: { data: [], error: null } }
		});
		const result = await recommendForUser(client, 'user-1');
		expect(result).toEqual([]);
	});
});

describe('recommendForUser — embedding-hybrid', () => {
	function makeEmbedding(seed: number, dim = 8): number[] {
		// Reproducible non-trivial vector — different seeds give different
		// directions so the recommender's "user vector" isn't zero.
		const v = Array.from({ length: dim }, (_, i) => Math.sin(seed * (i + 1)));
		const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
		return v.map((x) => x / mag);
	}

	it('uses the RPC and re-ranks candidates with brand-affinity bonus', async () => {
		const macbookVec = makeEmbedding(1);
		const candidateVecs = [
			{ slug: 'xps-13', similarity: 0.85 }, // Dell — no brand affinity
			{ slug: 'macbook-pro', similarity: 0.7 }, // Apple — brand bonus
			{ slug: 'sony-wh-1000xm6', similarity: 0.6 } // Different category
		];
		const { client } = makeStub({
			orders: {
				select: { data: [{ order_items: [{ product_slug: 'macbook-air' }] }], error: null }
			},
			products: {
				select: { data: [{ slug: 'macbook-air', embedding: macbookVec }], error: null }
			},
			match_products: { rpc: { data: candidateVecs, error: null } }
		});
		const result = await recommendForUser(client, 'user-1');
		// Should produce recommendations and respect the brand-affinity boost:
		// macbook-pro (same brand as the bought product) should appear among the
		// picks even though it has lower raw similarity than xps-13.
		const slugs = result.map((r) => r.product.slug);
		expect(slugs).toContain('macbook-pro');
		// macbook-pro should be attributed as same_brand.
		const macbookProRec = result.find((r) => r.product.slug === 'macbook-pro');
		expect(macbookProRec?.reason.kind).toBe('same_brand');
		expect(macbookProRec?.reason.brand).toBe('Apple');
	});

	it('attributes "similar" when the candidate brand does not match any signal', async () => {
		const vec = makeEmbedding(2);
		const { client } = makeStub({
			orders: { select: { data: [], error: null } },
			products: {
				select: { data: [{ slug: 'sony-wh-1000xm6', embedding: vec }], error: null }
			},
			match_products: {
				rpc: {
					data: [
						// Sonos isn't a brand we have a signal for, so it should be 'similar'.
						{ slug: 'sonos-era-300', similarity: 0.9 }
					],
					error: null
				}
			}
		});
		mockListWishlist.mockResolvedValue([{ slug: 'sony-wh-1000xm6' }]);
		const result = await recommendForUser(client, 'user-1');
		const rec = result.find((r) => r.product.slug === 'sonos-era-300');
		expect(rec?.reason.kind).toBe('similar');
	});

	it('parses pgvector string embeddings as well as number[]', async () => {
		// pgvector may serialise embeddings as JSON strings depending on the
		// driver. The recommender should handle both.
		const vec = makeEmbedding(3);
		const { client } = makeStub({
			orders: {
				select: { data: [{ order_items: [{ product_slug: 'macbook-air' }] }], error: null }
			},
			products: {
				select: { data: [{ slug: 'macbook-air', embedding: JSON.stringify(vec) }], error: null }
			},
			match_products: {
				rpc: { data: [{ slug: 'macbook-pro', similarity: 0.9 }], error: null }
			}
		});
		const result = await recommendForUser(client, 'user-1');
		expect(result.length).toBeGreaterThan(0);
	});

	it('falls back to rule-based when match_products returns nothing', async () => {
		const vec = makeEmbedding(4);
		const { client } = makeStub({
			orders: {
				select: { data: [{ order_items: [{ product_slug: 'macbook-air' }] }], error: null }
			},
			products: {
				select: { data: [{ slug: 'macbook-air', embedding: vec }], error: null }
			},
			match_products: { rpc: { data: [], error: null } }
		});
		const result = await recommendForUser(client, 'user-1');
		expect(result.length).toBeGreaterThan(0);
		// rule-based reason kinds are 'bought' or 'saved'.
		expect(['bought', 'saved']).toContain(result[0].reason.kind);
	});
});

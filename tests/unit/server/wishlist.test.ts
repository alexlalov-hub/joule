import { describe, expect, it } from 'vitest';
import { isWishlistedBySlug, toggleWishlistBySlug, listWishlist } from '$lib/server/wishlist';
import { makeStub } from '../_helpers/supabase-stub';

describe('isWishlistedBySlug', () => {
	it('returns false without a supabase client', async () => {
		expect(await isWishlistedBySlug(null, 'user-1', 'macbook-air-m4-13')).toBe(false);
	});

	it('returns false without a userId', async () => {
		const { client } = makeStub({});
		expect(await isWishlistedBySlug(client, null, 'macbook-air-m4-13')).toBe(false);
	});

	it('resolves the slug to a productId when none is passed', async () => {
		const { client, calls } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			wishlists: { maybeSingle: { data: { product_id: 'p1' }, error: null } }
		});
		const result = await isWishlistedBySlug(client, 'user-1', 'macbook-air-m4-13');
		expect(result).toBe(true);
		expect(calls.some((c) => c.table === 'products' && c.op === 'maybeSingle')).toBe(true);
	});

	it('skips the product lookup when productId is passed in', async () => {
		const { client, calls } = makeStub({
			wishlists: { maybeSingle: { data: null, error: null } }
		});
		const result = await isWishlistedBySlug(client, 'user-1', 'macbook-air-m4-13', {
			productId: 'p1'
		});
		expect(result).toBe(false);
		expect(calls.some((c) => c.table === 'products')).toBe(false);
	});

	it('returns false when the product does not exist', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: null, error: null } }
		});
		expect(await isWishlistedBySlug(client, 'user-1', 'unknown')).toBe(false);
	});
});

describe('toggleWishlistBySlug', () => {
	it('inserts when no existing row, returns added: true', async () => {
		const { client, calls } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			wishlists: {
				maybeSingle: { data: null, error: null },
				insert: { data: null, error: null }
			}
		});
		const result = await toggleWishlistBySlug(client, 'user-1', 'macbook-air-m4-13');
		expect(result).toEqual({ ok: true, added: true });
		expect(calls.some((c) => c.op === 'insert')).toBe(true);
	});

	it('deletes when an existing row is present, returns added: false', async () => {
		const { client, calls } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			wishlists: {
				maybeSingle: { data: { product_id: 'p1' }, error: null },
				delete: { data: null, error: null }
			}
		});
		const result = await toggleWishlistBySlug(client, 'user-1', 'macbook-air-m4-13');
		expect(result).toEqual({ ok: true, added: false });
		expect(calls.some((c) => c.op === 'delete')).toBe(true);
	});

	it('fails gracefully when the product is not in the catalog', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: null, error: null } }
		});
		const result = await toggleWishlistBySlug(client, 'user-1', 'unknown-slug');
		expect(result.ok).toBe(false);
		expect(result.message).toMatch(/not found/i);
	});

	it('propagates the supabase error message on insert failure', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			wishlists: {
				maybeSingle: { data: null, error: null },
				insert: { data: null, error: { message: 'permission denied' } }
			}
		});
		const result = await toggleWishlistBySlug(client, 'user-1', 'macbook-air-m4-13');
		expect(result.ok).toBe(false);
		expect(result.message).toBe('permission denied');
	});

	it('propagates the supabase error message on delete failure', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			wishlists: {
				maybeSingle: { data: { product_id: 'p1' }, error: null },
				delete: { data: null, error: { message: 'rls block' } }
			}
		});
		const result = await toggleWishlistBySlug(client, 'user-1', 'macbook-air-m4-13');
		expect(result.ok).toBe(false);
		expect(result.message).toBe('rls block');
	});
});

describe('listWishlist', () => {
	it('returns [] without a supabase client', async () => {
		expect(await listWishlist(null, 'user-1')).toEqual([]);
	});

	it('returns [] without a userId', async () => {
		const { client } = makeStub({});
		expect(await listWishlist(client, null)).toEqual([]);
	});

	it('returns [] when the query errors', async () => {
		const { client } = makeStub({
			wishlists: { select: { data: null, error: { message: 'oops' } } }
		});
		expect(await listWishlist(client, 'user-1')).toEqual([]);
	});

	it('shapes joined rows and sorts the image to the lowest sort_order', async () => {
		const { client } = makeStub({
			wishlists: {
				select: {
					data: [
						{
							added_at: '2026-05-01T00:00:00Z',
							products: {
								id: 'p1',
								slug: 'macbook-air-m4-13',
								name: 'MacBook Air 13" (M4)',
								brand: 'Apple',
								price_cents: 129900,
								product_images: [
									{ url: 'https://example.com/b.jpg', sort_order: 2 },
									{ url: 'https://example.com/a.jpg', sort_order: 0 }
								]
							}
						},
						{
							added_at: '2026-04-30T00:00:00Z',
							products: null // dangling join — skipped
						}
					],
					error: null
				}
			}
		});
		const result = await listWishlist(client, 'user-1');
		expect(result.length).toBe(1);
		expect(result[0]).toMatchObject({
			productId: 'p1',
			slug: 'macbook-air-m4-13',
			image: 'https://example.com/a.jpg'
		});
	});

	it('returns image null when the product has no images', async () => {
		const { client } = makeStub({
			wishlists: {
				select: {
					data: [
						{
							added_at: '2026-05-01T00:00:00Z',
							products: {
								id: 'p1',
								slug: 's',
								name: 'n',
								brand: 'b',
								price_cents: 100,
								product_images: null
							}
						}
					],
					error: null
				}
			}
		});
		const result = await listWishlist(client, 'user-1');
		expect(result[0].image).toBeNull();
	});
});

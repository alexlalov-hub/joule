import { describe, expect, it } from 'vitest';
import {
	addToCart,
	clearCart,
	getCartCount,
	getCartSummary,
	removeCartItem,
	updateCartItemQty
} from '$lib/server/cart';
import { makeStub } from '../_helpers/supabase-stub';

describe('getCartSummary', () => {
	it('returns empty for anonymous users', async () => {
		expect(await getCartSummary(null, null)).toEqual({
			items: [],
			itemCount: 0,
			subtotalCents: 0
		});
	});

	it('returns empty when there is no cart row yet', async () => {
		const { client } = makeStub({
			carts: { maybeSingle: { data: null, error: null } }
		});
		expect(await getCartSummary(client, 'user-1')).toEqual({
			items: [],
			itemCount: 0,
			subtotalCents: 0
		});
	});

	it('shapes joined cart rows and computes totals', async () => {
		const { client } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			cart_items: {
				select: {
					data: [
						{
							id: 'i1',
							quantity: 2,
							products: {
								id: 'p1',
								slug: 'a',
								name: 'A',
								brand: 'Brand',
								price_cents: 1000,
								stock_qty: 5,
								product_images: [{ url: 'a.jpg', sort_order: 0 }]
							}
						},
						{
							id: 'i2',
							quantity: 1,
							products: {
								id: 'p2',
								slug: 'b',
								name: 'B',
								brand: 'Brand',
								price_cents: 500,
								stock_qty: 3,
								product_images: null
							}
						},
						{
							// Dangling product join — should be skipped.
							id: 'i3',
							quantity: 9,
							products: null
						}
					],
					error: null
				}
			}
		});

		const result = await getCartSummary(client, 'user-1');
		expect(result.items.length).toBe(2);
		expect(result.itemCount).toBe(3);
		expect(result.subtotalCents).toBe(2500);
		expect(result.items[1].image).toBeNull();
	});

	it('returns empty when cart_items select errors', async () => {
		const { client } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			cart_items: { select: { data: null, error: { message: 'rls' } } }
		});
		expect(await getCartSummary(client, 'user-1')).toEqual({
			items: [],
			itemCount: 0,
			subtotalCents: 0
		});
	});
});

describe('getCartCount', () => {
	it('returns 0 without a client or user', async () => {
		expect(await getCartCount(null, 'user-1')).toBe(0);
		const { client } = makeStub({});
		expect(await getCartCount(client, null)).toBe(0);
	});

	it('returns 0 when no cart exists', async () => {
		const { client } = makeStub({
			carts: { maybeSingle: { data: null, error: null } }
		});
		expect(await getCartCount(client, 'user-1')).toBe(0);
	});

	it('sums item quantities', async () => {
		const { client } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			cart_items: { select: { data: [{ quantity: 2 }, { quantity: 3 }], error: null } }
		});
		expect(await getCartCount(client, 'user-1')).toBe(5);
	});

	it('returns 0 on a select error', async () => {
		const { client } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			cart_items: { select: { data: null, error: { message: 'rls' } } }
		});
		expect(await getCartCount(client, 'user-1')).toBe(0);
	});
});

describe('addToCart', () => {
	it('creates a new cart row when none exists, then inserts the item', async () => {
		const { client, calls } = makeStub({
			carts: {
				maybeSingle: { data: null, error: null },
				// Insert chain ends with .select().single() — stub records as 'insert'.
				insert: { data: { id: 'new-cart' }, error: null }
			},
			products: { maybeSingle: { data: { id: 'p1', stock_qty: 10 }, error: null } },
			cart_items: {
				maybeSingle: { data: null, error: null },
				insert: { data: null, error: null }
			}
		});
		const result = await addToCart(client, 'user-1', 'macbook-air-m4-13', 2);
		expect(result.ok).toBe(true);
		// One insert into carts, one insert into cart_items.
		expect(calls.filter((c) => c.op === 'insert').length).toBe(2);
	});

	it('uses the existing cart and updates an existing item by adding quantity', async () => {
		const { client, calls } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			products: { maybeSingle: { data: { id: 'p1', stock_qty: 10 }, error: null } },
			cart_items: {
				maybeSingle: { data: { id: 'i1', quantity: 1 }, error: null },
				update: { data: null, error: null }
			}
		});
		const result = await addToCart(client, 'user-1', 'macbook-air-m4-13', 3);
		expect(result.ok).toBe(true);
		const updateCall = calls.find((c) => c.op === 'update');
		expect(updateCall?.payload).toEqual({ quantity: 4 });
	});

	it('caps the quantity at stock_qty', async () => {
		const { client, calls } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			products: { maybeSingle: { data: { id: 'p1', stock_qty: 2 }, error: null } },
			cart_items: {
				maybeSingle: { data: { id: 'i1', quantity: 1 }, error: null },
				update: { data: null, error: null }
			}
		});
		await addToCart(client, 'user-1', 'macbook-air-m4-13', 5);
		const updateCall = calls.find((c) => c.op === 'update');
		expect(updateCall?.payload).toEqual({ quantity: 2 });
	});

	it('fails when the product is not in the catalog', async () => {
		const { client } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			products: { maybeSingle: { data: null, error: null } }
		});
		const result = await addToCart(client, 'user-1', 'unknown', 1);
		expect(result.ok).toBe(false);
		expect(result.message).toMatch(/not found/i);
	});

	it('fails when cart creation fails', async () => {
		const { client } = makeStub({
			carts: {
				maybeSingle: { data: null, error: null },
				insert: { data: null, error: { message: 'cannot insert' } }
			}
		});
		const result = await addToCart(client, 'user-1', 'macbook-air-m4-13', 1);
		expect(result.ok).toBe(false);
	});

	it('propagates the insert error from cart_items', async () => {
		const { client } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			products: { maybeSingle: { data: { id: 'p1', stock_qty: 5 }, error: null } },
			cart_items: {
				maybeSingle: { data: null, error: null },
				insert: { data: null, error: { message: 'fk violated' } }
			}
		});
		const result = await addToCart(client, 'user-1', 'macbook-air-m4-13', 1);
		expect(result.ok).toBe(false);
		expect(result.message).toBe('fk violated');
	});

	it('propagates the update error', async () => {
		const { client } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			products: { maybeSingle: { data: { id: 'p1', stock_qty: 5 }, error: null } },
			cart_items: {
				maybeSingle: { data: { id: 'i1', quantity: 1 }, error: null },
				update: { data: null, error: { message: 'rls block' } }
			}
		});
		const result = await addToCart(client, 'user-1', 'macbook-air-m4-13', 1);
		expect(result.ok).toBe(false);
		expect(result.message).toBe('rls block');
	});
});

describe('updateCartItemQty', () => {
	it('delegates to removeCartItem when quantity <= 0', async () => {
		const { client, calls } = makeStub({
			cart_items: { delete: { data: null, error: null } }
		});
		const result = await updateCartItemQty(client, 'user-1', 'i1', 0);
		expect(result.ok).toBe(true);
		expect(calls.some((c) => c.op === 'delete')).toBe(true);
	});

	it('updates quantity for a positive value', async () => {
		const { client, calls } = makeStub({
			cart_items: { update: { data: { id: 'i1' }, error: null } }
		});
		const result = await updateCartItemQty(client, 'user-1', 'i1', 3);
		expect(result.ok).toBe(true);
		expect(
			calls.some((c) => c.op === 'update' && (c.payload as { quantity: number }).quantity === 3)
		).toBe(true);
	});

	it('propagates supabase errors', async () => {
		const { client } = makeStub({
			cart_items: { update: { data: null, error: { message: 'denied' } } }
		});
		const result = await updateCartItemQty(client, 'user-1', 'i1', 3);
		expect(result.ok).toBe(false);
		expect(result.message).toBe('denied');
	});
});

describe('removeCartItem', () => {
	it('deletes the row by id', async () => {
		const { client, calls } = makeStub({
			cart_items: { delete: { data: null, error: null } }
		});
		const result = await removeCartItem(client, 'user-1', 'i1');
		expect(result.ok).toBe(true);
		expect(calls.some((c) => c.table === 'cart_items' && c.op === 'delete')).toBe(true);
	});

	it('propagates the supabase error', async () => {
		const { client } = makeStub({
			cart_items: { delete: { data: null, error: { message: 'no such row' } } }
		});
		const result = await removeCartItem(client, 'user-1', 'i1');
		expect(result.ok).toBe(false);
		expect(result.message).toBe('no such row');
	});
});

describe('clearCart', () => {
	it('returns early when there is no cart', async () => {
		const { client, calls } = makeStub({
			carts: { maybeSingle: { data: null, error: null } }
		});
		await clearCart(client, 'user-1');
		expect(calls.some((c) => c.op === 'delete')).toBe(false);
	});

	it('deletes all cart_items for the cart', async () => {
		const { client, calls } = makeStub({
			carts: { maybeSingle: { data: { id: 'cart-1' }, error: null } },
			cart_items: { delete: { data: null, error: null } }
		});
		await clearCart(client, 'user-1');
		expect(calls.some((c) => c.table === 'cart_items' && c.op === 'delete')).toBe(true);
	});
});

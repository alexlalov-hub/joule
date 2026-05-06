import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cart helpers. Auth-gated: guest carts are deferred to a later week.
 * Relies on RLS — the `locals.supabase` client always acts as the logged-in user.
 */

export type CartLineItem = {
	itemId: string;
	productId: string;
	slug: string;
	name: string;
	brand: string;
	priceCents: number;
	quantity: number;
	image: string | null;
	stockQty: number;
};

export type CartSummary = {
	items: CartLineItem[];
	itemCount: number;
	subtotalCents: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any>;

async function getOrCreateCartId(sb: SB, userId: string): Promise<string | null> {
	const { data: existing } = await sb
		.from('carts')
		.select('id')
		.eq('user_id', userId)
		.maybeSingle();
	if (existing) return existing.id as string;

	const { data: created, error } = await sb
		.from('carts')
		.insert({ user_id: userId })
		.select('id')
		.single();
	if (error || !created) return null;
	return created.id as string;
}

export async function getCartSummary(sb: SB | null, userId: string | null): Promise<CartSummary> {
	if (!sb || !userId) return { items: [], itemCount: 0, subtotalCents: 0 };

	const { data: cart } = await sb.from('carts').select('id').eq('user_id', userId).maybeSingle();
	if (!cart) return { items: [], itemCount: 0, subtotalCents: 0 };

	const { data, error } = await sb
		.from('cart_items')
		.select(
			'id, quantity, products(id, slug, name, brand, price_cents, stock_qty, product_images(url, sort_order))'
		)
		.eq('cart_id', cart.id)
		.order('added_at', { ascending: true });

	if (error || !data) return { items: [], itemCount: 0, subtotalCents: 0 };

	type Row = {
		id: string;
		quantity: number;
		products: {
			id: string;
			slug: string;
			name: string;
			brand: string;
			price_cents: number;
			stock_qty: number;
			product_images: { url: string; sort_order: number }[] | null;
		} | null;
	};

	const items: CartLineItem[] = (data as unknown as Row[])
		.filter((r) => r.products)
		.map((r) => {
			const firstImage = (r.products!.product_images ?? [])
				.slice()
				.sort((a, b) => a.sort_order - b.sort_order)[0];
			return {
				itemId: r.id,
				productId: r.products!.id,
				slug: r.products!.slug,
				name: r.products!.name,
				brand: r.products!.brand,
				priceCents: r.products!.price_cents,
				quantity: r.quantity,
				image: firstImage?.url ?? null,
				stockQty: r.products!.stock_qty
			};
		});

	const itemCount = items.reduce((n, i) => n + i.quantity, 0);
	const subtotalCents = items.reduce((n, i) => n + i.priceCents * i.quantity, 0);
	return { items, itemCount, subtotalCents };
}

export async function getCartCount(sb: SB | null, userId: string | null): Promise<number> {
	if (!sb || !userId) return 0;
	const { data: cart } = await sb.from('carts').select('id').eq('user_id', userId).maybeSingle();
	if (!cart) return 0;
	const { data, error } = await sb.from('cart_items').select('quantity').eq('cart_id', cart.id);
	if (error || !data) return 0;
	return data.reduce((n, r) => n + (r.quantity ?? 0), 0);
}

export async function addToCart(
	sb: SB,
	userId: string,
	productSlug: string,
	quantity = 1
): Promise<{ ok: boolean; message?: string }> {
	const cartId = await getOrCreateCartId(sb, userId);
	if (!cartId) return { ok: false, message: 'Could not create cart.' };

	const { data: product } = await sb
		.from('products')
		.select('id, stock_qty')
		.eq('slug', productSlug)
		.maybeSingle();
	if (!product) return { ok: false, message: 'Product not found.' };

	const { data: existing } = await sb
		.from('cart_items')
		.select('id, quantity')
		.eq('cart_id', cartId)
		.eq('product_id', product.id)
		.maybeSingle();

	const target = Math.min((existing?.quantity ?? 0) + quantity, Math.max(product.stock_qty, 1));

	if (existing) {
		const { error } = await sb
			.from('cart_items')
			.update({ quantity: target })
			.eq('id', existing.id);
		if (error) return { ok: false, message: error.message };
	} else {
		const { error } = await sb
			.from('cart_items')
			.insert({ cart_id: cartId, product_id: product.id, quantity: target });
		if (error) return { ok: false, message: error.message };
	}
	return { ok: true };
}

export async function updateCartItemQty(
	sb: SB,
	userId: string,
	itemId: string,
	quantity: number
): Promise<{ ok: boolean; message?: string }> {
	if (quantity <= 0) return removeCartItem(sb, userId, itemId);
	const { error } = await sb
		.from('cart_items')
		.update({ quantity })
		.eq('id', itemId)
		.select('id')
		.maybeSingle();
	if (error) return { ok: false, message: error.message };
	return { ok: true };
}

export async function removeCartItem(
	sb: SB,
	_userId: string,
	itemId: string
): Promise<{ ok: boolean; message?: string }> {
	const { error } = await sb.from('cart_items').delete().eq('id', itemId);
	if (error) return { ok: false, message: error.message };
	return { ok: true };
}

export async function clearCart(sb: SB, userId: string): Promise<void> {
	const { data: cart } = await sb.from('carts').select('id').eq('user_id', userId).maybeSingle();
	if (!cart) return;
	await sb.from('cart_items').delete().eq('cart_id', cart.id);
}

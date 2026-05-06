import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any>;

export type WishlistItem = {
	productId: string;
	slug: string;
	name: string;
	brand: string;
	priceCents: number;
	image: string | null;
	addedAt: string;
};

async function resolveProductId(sb: SB, slug: string): Promise<string | null> {
	const { data } = await sb.from('products').select('id').eq('slug', slug).maybeSingle();
	return (data?.id as string | undefined) ?? null;
}

export async function isWishlistedBySlug(
	sb: SB | null,
	userId: string | null,
	slug: string
): Promise<boolean> {
	if (!sb || !userId) return false;
	const productId = await resolveProductId(sb, slug);
	if (!productId) return false;
	const { data } = await sb
		.from('wishlists')
		.select('product_id')
		.eq('user_id', userId)
		.eq('product_id', productId)
		.maybeSingle();
	return !!data;
}

export async function toggleWishlistBySlug(
	sb: SB,
	userId: string,
	slug: string
): Promise<{ ok: boolean; added: boolean; message?: string }> {
	const productId = await resolveProductId(sb, slug);
	if (!productId) return { ok: false, added: false, message: 'Product not found.' };

	const { data: existing } = await sb
		.from('wishlists')
		.select('product_id')
		.eq('user_id', userId)
		.eq('product_id', productId)
		.maybeSingle();

	if (existing) {
		const { error } = await sb
			.from('wishlists')
			.delete()
			.eq('user_id', userId)
			.eq('product_id', productId);
		if (error) return { ok: false, added: false, message: error.message };
		return { ok: true, added: false };
	}

	const { error } = await sb.from('wishlists').insert({ user_id: userId, product_id: productId });
	if (error) return { ok: false, added: false, message: error.message };
	return { ok: true, added: true };
}

export async function listWishlist(sb: SB | null, userId: string | null): Promise<WishlistItem[]> {
	if (!sb || !userId) return [];
	const { data, error } = await sb
		.from('wishlists')
		.select(
			'added_at, products(id, slug, name, brand, price_cents, product_images(url, sort_order))'
		)
		.eq('user_id', userId)
		.order('added_at', { ascending: false });
	if (error || !data) return [];

	type Row = {
		added_at: string;
		products: {
			id: string;
			slug: string;
			name: string;
			brand: string;
			price_cents: number;
			product_images: { url: string; sort_order: number }[] | null;
		} | null;
	};

	return (data as unknown as Row[])
		.filter((r) => r.products)
		.map((r) => {
			const first = (r.products!.product_images ?? [])
				.slice()
				.sort((a, b) => a.sort_order - b.sort_order)[0];
			return {
				productId: r.products!.id,
				slug: r.products!.slug,
				name: r.products!.name,
				brand: r.products!.brand,
				priceCents: r.products!.price_cents,
				image: first?.url ?? null,
				addedAt: r.added_at
			};
		});
}

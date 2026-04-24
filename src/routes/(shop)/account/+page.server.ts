import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listWishlist } from '$lib/server/wishlist';

type OrderRow = {
	id: string;
	status: string;
	total_cents: number;
	currency: string;
	created_at: string;
	order_items: { product_name: string; quantity: number; unit_price_cents: number }[] | null;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);

	const sb = locals.supabase;
	if (!sb) return { user: locals.user, orders: [], wishlist: [] };

	const [ordersResult, wishlist] = await Promise.all([
		sb
			.from('orders')
			.select(
				'id, status, total_cents, currency, created_at, order_items(product_name, quantity, unit_price_cents)'
			)
			.eq('user_id', locals.user.id)
			.order('created_at', { ascending: false })
			.limit(20),
		listWishlist(sb, locals.user.id)
	]);

	const orders = (ordersResult.data as unknown as OrderRow[] | null) ?? [];

	return { user: locals.user, orders, wishlist };
};

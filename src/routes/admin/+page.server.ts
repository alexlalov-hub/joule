import type { PageServerLoad } from './$types';

/**
 * Dashboard counts. Three small queries against products — total, featured,
 * low-stock. The role guard ran in +layout.server.ts, so we can assume
 * locals.supabase is the admin-bound user session.
 *
 * RLS allows admins to read products like anyone else; we're not doing
 * anything customer-hostile here, just three count(*)s.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const sb = locals.supabase;
	if (!sb) {
		return { total: 0, featured: 0, lowStock: 0 };
	}

	const [totalRes, featuredRes, lowStockRes] = await Promise.all([
		sb.from('products').select('id', { count: 'exact', head: true }),
		sb.from('products').select('id', { count: 'exact', head: true }).eq('featured', true),
		sb.from('products').select('id', { count: 'exact', head: true }).lt('stock_qty', 5)
	]);

	return {
		total: totalRes.count ?? 0,
		featured: featuredRes.count ?? 0,
		lowStock: lowStockRes.count ?? 0
	};
};

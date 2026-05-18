import type { PageServerLoad } from './$types';
import { listCategories, listProducts } from '$lib/catalog/queries';

export const load: PageServerLoad = async ({ locals }) => {
	const [all, categories] = await Promise.all([
		listProducts(locals.supabase, { sort: 'featured' }),
		listCategories(locals.supabase)
	]);

	const featured = all.filter((p) => p.featured).slice(0, 8);
	const brandCount = new Set(all.map((p) => p.brand)).size;

	return {
		featured,
		categories,
		productCount: all.length,
		brandCount
	};
};

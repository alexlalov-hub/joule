import type { PageServerLoad } from './$types';
import { listCategories, listFeatured, listProducts } from '$lib/catalog/queries';

export const load: PageServerLoad = async ({ locals }) => {
	const [featured, categories, latest] = await Promise.all([
		listFeatured(locals.supabase, 8),
		listCategories(locals.supabase),
		listProducts(locals.supabase, { sort: 'featured' })
	]);

	return {
		featured,
		categories,
		productCount: latest.length
	};
};

import type { PageServerLoad } from './$types';
import { listCategories, listProducts } from '$lib/catalog/queries';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	const category = url.searchParams.get('category') || undefined;

	const [products, categories] = await Promise.all([
		q
			? listProducts(locals.supabase, { query: q, category, sort: 'featured' })
			: Promise.resolve([]),
		listCategories(locals.supabase)
	]);

	return { q, category, products, categories };
};

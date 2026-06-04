import type { PageServerLoad } from './$types';
import { listCategories, listProducts } from '$lib/catalog/queries';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	const [categories, products] = await Promise.all([
		listCategories(locals.supabase),
		listProducts(locals.supabase)
	]);
	const counts: Record<string, number> = {};
	for (const p of products) counts[p.categorySlug] = (counts[p.categorySlug] ?? 0) + 1;

	// Edge cache — see specs/003-catalog-edge-caching/.
	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
	});

	return { categories, counts };
};

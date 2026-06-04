import type { PageServerLoad } from './$types';
import { listCategories, listProducts } from '$lib/catalog/queries';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	const [all, categories] = await Promise.all([
		listProducts(locals.supabase, { sort: 'featured' }),
		listCategories(locals.supabase)
	]);

	const featured = all.filter((p) => p.featured).slice(0, 8);
	const brandCount = new Set(all.map((p) => p.brand)).size;

	// Catalog edge caching — see specs/003-catalog-edge-caching/. The
	// response contains no per-user data (header personalisation lives
	// in /api/me + client hydration), so Vercel's edge can safely serve
	// the same bytes to every visitor for the TTL. SWR keeps the page
	// responsive after the TTL expires while the cache refreshes in
	// the background.
	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
	});

	return {
		featured,
		categories,
		productCount: all.length,
		brandCount
	};
};

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCategory, listBrands, listProducts, priceBounds } from '$lib/catalog/queries';

const SORTS = new Set(['featured', 'price_asc', 'price_desc', 'name']);

export const load: PageServerLoad = async ({ locals, params, url, setHeaders }) => {
	const category = await getCategory(locals.supabase, params.slug);
	if (!category) throw error(404, `Category "${params.slug}" not found`);

	// Edge cache — see specs/003-catalog-edge-caching/. The category
	// page varies by URL (including the ?brand= / ?sort= / ?min= / ?max=
	// query string), but every variant is anonymous so the same bytes
	// can be served to all visitors of that exact URL.
	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
	});

	const sort = SORTS.has(url.searchParams.get('sort') ?? '')
		? (url.searchParams.get('sort') as 'featured' | 'price_asc' | 'price_desc' | 'name')
		: 'featured';
	const brand = url.searchParams.get('brand') || undefined;
	const minEuros = Number(url.searchParams.get('min') ?? '');
	const maxEuros = Number(url.searchParams.get('max') ?? '');
	const minPrice =
		Number.isFinite(minEuros) && minEuros > 0 ? Math.round(minEuros * 100) : undefined;
	const maxPrice =
		Number.isFinite(maxEuros) && maxEuros > 0 ? Math.round(maxEuros * 100) : undefined;

	const [all, products, brands] = await Promise.all([
		listProducts(locals.supabase, { category: category.slug }),
		listProducts(locals.supabase, { category: category.slug, brand, minPrice, maxPrice, sort }),
		listBrands(locals.supabase, category.slug)
	]);

	const { min, max } = priceBounds(all);

	return {
		category,
		products,
		brands,
		priceMin: min,
		priceMax: max,
		filters: { brand, minPrice, maxPrice, sort }
	};
};

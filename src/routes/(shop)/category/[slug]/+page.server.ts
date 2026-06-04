import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCategory, listBrands, listProducts, priceBounds } from '$lib/catalog/queries';

const SORTS = new Set(['featured', 'price_asc', 'price_desc', 'name']);

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const category = await getCategory(locals.supabase, params.slug);
	if (!category) throw error(404, `Category "${params.slug}" not found`);

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

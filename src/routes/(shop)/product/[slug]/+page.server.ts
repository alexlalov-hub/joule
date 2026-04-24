import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCategory, getProduct, listByCategory } from '$lib/catalog/queries';

export const load: PageServerLoad = async ({ locals, params }) => {
	const product = await getProduct(locals.supabase, params.slug);
	if (!product) throw error(404, `Product "${params.slug}" not found`);

	const [category, siblings] = await Promise.all([
		getCategory(locals.supabase, product.categorySlug),
		listByCategory(locals.supabase, product.categorySlug)
	]);

	const related = siblings.filter((p) => p.slug !== product.slug).slice(0, 4);

	return { product, category, related };
};

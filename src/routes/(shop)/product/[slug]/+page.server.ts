import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getCategory, getProduct, listByCategory } from '$lib/catalog/queries';
import { addToCart } from '$lib/server/cart';

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

export const actions: Actions = {
	addToCart: async ({ locals, params, url }) => {
		if (!locals.user || !locals.supabase) {
			const next = encodeURIComponent(url.pathname);
			throw redirect(303, `/login?next=${next}`);
		}
		const result = await addToCart(locals.supabase, locals.user.id, params.slug, 1);
		if (!result.ok) return fail(400, { message: result.message ?? 'Could not add to cart.' });
		return { added: true };
	}
};

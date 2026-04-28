import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getCategory, getProduct, listByCategory } from '$lib/catalog/queries';
import { addToCart } from '$lib/server/cart';
import { isWishlistedBySlug, toggleWishlistBySlug } from '$lib/server/wishlist';
import { listReviews, postReview } from '$lib/server/reviews';
import { isAspect, summarize, type ReviewAspect } from '$lib/reviews/types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const product = await getProduct(locals.supabase, params.slug);
	if (!product) throw error(404, `Product "${params.slug}" not found`);

	const [category, siblings, wishlisted, reviews] = await Promise.all([
		getCategory(locals.supabase, product.categorySlug),
		listByCategory(locals.supabase, product.categorySlug),
		isWishlistedBySlug(locals.supabase ?? null, locals.user?.id ?? null, product.slug),
		listReviews(locals.supabase ?? null, product.slug)
	]);

	const summary = summarize(reviews);
	const related = siblings.filter((p) => p.slug !== product.slug).slice(0, 4);
	const userReviewed = locals.user ? reviews.some((r) => r.userId === locals.user!.id) : false;

	return { product, category, related, wishlisted, reviews, summary, userReviewed };
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
	},
	toggleWishlist: async ({ locals, params, url }) => {
		if (!locals.user || !locals.supabase) {
			const next = encodeURIComponent(url.pathname);
			throw redirect(303, `/login?next=${next}`);
		}
		const result = await toggleWishlistBySlug(locals.supabase, locals.user.id, params.slug);
		if (!result.ok) return fail(400, { message: result.message ?? 'Could not update wishlist.' });
		return { wishlisted: result.added };
	},
	postReview: async ({ locals, params, request, url }) => {
		if (!locals.user || !locals.supabase) {
			const next = encodeURIComponent(url.pathname);
			throw redirect(303, `/login?next=${next}`);
		}
		const form = await request.formData();
		const rating = Number(form.get('rating'));
		const aspectRaw = String(form.get('aspect') ?? 'overall');
		const aspect: ReviewAspect = isAspect(aspectRaw) ? aspectRaw : 'overall';
		const title = String(form.get('title') ?? '');
		const body = String(form.get('body') ?? '');

		const result = await postReview(locals.supabase, locals.user.id, params.slug, {
			rating,
			aspect,
			title,
			body
		});
		if (!result.ok) return fail(400, { reviewError: result.message });
		return { reviewed: true };
	}
};

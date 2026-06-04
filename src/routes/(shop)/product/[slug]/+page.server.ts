import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getCategory, getProductWithId, listByCategory } from '$lib/catalog/queries';
import { addToCart } from '$lib/server/cart';
import { isWishlistedBySlug, toggleWishlistBySlug } from '$lib/server/wishlist';
import {
	listReviewsPage,
	postReview,
	summarizeProduct,
	userHasReviewed
} from '$lib/server/reviews';
import { isAspect, type ReviewAspect } from '$lib/reviews/types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { id: productId, product } = await getProductWithId(locals.supabase, params.slug);
	if (!product) throw error(404, `Product "${params.slug}" not found`);

	const reviewPage = Math.max(1, Number(url.searchParams.get('rp') ?? '1') || 1);
	const justPostedReview = url.searchParams.get('review') === 'posted';

	// Pass productId through so review/wishlist queries don't each re-resolve the slug.
	const [category, siblings, wishlisted, reviewsPage, summary, userReviewed] = await Promise.all([
		getCategory(locals.supabase, product.categorySlug),
		listByCategory(locals.supabase, product.categorySlug),
		isWishlistedBySlug(locals.supabase ?? null, locals.user?.id ?? null, product.slug, {
			productId
		}),
		listReviewsPage(locals.supabase ?? null, product.slug, { page: reviewPage, productId }),
		summarizeProduct(locals.supabase ?? null, product.slug, { productId }),
		userHasReviewed(locals.supabase ?? null, locals.user?.id ?? null, product.slug, { productId })
	]);

	const related = siblings.filter((p) => p.slug !== product.slug).slice(0, 4);

	return {
		product,
		category,
		related,
		wishlisted,
		reviews: reviewsPage.reviews,
		reviewsPage,
		summary,
		userReviewed,
		justPostedReview,
		// `signedIn` previously came from parent layout data. Week 6 moved
		// the user out of the root layout server load (so cached SSR HTML
		// stays anonymous), so the product page now surfaces signed-in
		// state itself. This route is not cached, so `signedIn` is
		// already per-request fresh.
		signedIn: !!locals.user
	};
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
		// Land back on page 1 so the new review (which is at the top, sorted by
		// created_at desc) is the first thing the user sees.
		throw redirect(303, `${url.pathname}?review=posted#reviews`);
	}
};

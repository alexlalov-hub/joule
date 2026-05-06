import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProductWithId } from '$lib/catalog/queries';
import { listAllReviewsForSynthesis } from '$lib/server/reviews';
import { streamReviewIntelligence } from '$lib/server/ai/review-intelligence';

const MIN_REVIEWS = 3;

/**
 * POST /api/review-intelligence — streams a written summary of what reviewers
 * say about a product, with citations back to the review positions.
 *
 * Body shape: { slug: string }
 * Returns:    text/plain stream of markdown.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { slug } = (await request.json()) as { slug?: unknown };
	if (typeof slug !== 'string' || !slug) throw error(400, 'slug must be a non-empty string');

	const { id: productId, product } = await getProductWithId(locals.supabase, slug);
	if (!product) throw error(404, 'Product not found');

	const reviews = await listAllReviewsForSynthesis(locals.supabase ?? null, slug, {
		productId,
		limit: 50
	});

	if (reviews.length < MIN_REVIEWS) {
		throw error(
			422,
			`Need at least ${MIN_REVIEWS} reviews to synthesize themes; this product has ${reviews.length}.`
		);
	}

	const result = streamReviewIntelligence({ product, reviews });
	return result.toTextStreamResponse();
};

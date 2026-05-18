import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProductWithId } from '$lib/catalog/queries';
import { listAllReviewsForSynthesis } from '$lib/server/reviews';
import { streamReviewIntelligence } from '$lib/server/ai/review-intelligence';
import { rateLimit } from '$lib/server/rate-limit';

const MIN_REVIEWS = 3;
const AI_LIMIT = { windowMs: 5 * 60 * 1000, max: 20 } as const;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,80}$/;

/**
 * POST /api/review-intelligence — streams a written summary of what reviewers
 * say about a product, with citations back to the review positions.
 *
 * Body shape: { slug: string }
 * Returns:    text/plain stream of markdown.
 */
export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const limit = rateLimit(`review-intel:${getClientAddress()}`, AI_LIMIT);
	if (!limit.ok) {
		throw error(429, `Too many requests. Try again in ${limit.retryAfterSec}s.`);
	}

	const { slug } = (await request.json()) as { slug?: unknown };
	if (typeof slug !== 'string' || !SLUG_RE.test(slug.trim())) {
		throw error(400, 'slug must be a valid product slug');
	}
	const cleanSlug = slug.trim();

	const { id: productId, product } = await getProductWithId(locals.supabase, cleanSlug);
	if (!product) throw error(404, 'Product not found');

	const reviews = await listAllReviewsForSynthesis(locals.supabase ?? null, cleanSlug, {
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

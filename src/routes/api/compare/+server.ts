import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProduct } from '$lib/catalog/queries';
import { streamComparison } from '$lib/server/ai/compare';
import { rateLimit } from '$lib/server/rate-limit';

const MIN = 2;
const MAX = 3;
const AI_LIMIT = { windowMs: 5 * 60 * 1000, max: 20 } as const;
// Same shape as the catalog seed; rejecting anything else cuts off a class
// of cheap-but-annoying DoS attempts (huge bodies that fan out to DB).
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,80}$/;

/**
 * POST /api/compare — streams a written comparison for 2-3 product slugs.
 *
 * Body shape: { slugs: string[] }
 * Returns:    a text/plain stream of markdown.
 */
export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const limit = rateLimit(`compare:${getClientAddress()}`, AI_LIMIT);
	if (!limit.ok) {
		throw error(429, `Too many requests. Try again in ${limit.retryAfterSec}s.`);
	}

	const { slugs } = (await request.json()) as { slugs?: unknown };
	if (!Array.isArray(slugs)) throw error(400, 'slugs must be an array');

	const cleaned = Array.from(
		new Set(
			slugs
				.filter((s): s is string => typeof s === 'string')
				.map((s) => s.trim())
				.filter((s) => SLUG_RE.test(s))
		)
	).slice(0, MAX);

	if (cleaned.length < MIN) throw error(400, `Need at least ${MIN} valid product slugs`);

	const products = (
		await Promise.all(cleaned.map((slug) => getProduct(locals.supabase, slug)))
	).filter((p): p is NonNullable<typeof p> => p !== null);

	if (products.length < MIN) {
		throw error(404, 'One or more products were not found');
	}

	const distinctCategories = new Set(products.map((p) => p.categorySlug));
	if (distinctCategories.size > 1) {
		throw error(
			422,
			'Cross-category comparison is not supported — these products serve different needs.'
		);
	}

	const result = streamComparison(products);
	return result.toTextStreamResponse();
};

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProduct } from '$lib/catalog/queries';
import { streamComparison } from '$lib/server/ai/compare';

const MIN = 2;
const MAX = 3;

/**
 * POST /api/compare — streams a written comparison for 2-3 product slugs.
 *
 * Body shape: { slugs: string[] }
 * Returns:    a text/plain stream of markdown.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { slugs } = (await request.json()) as { slugs?: unknown };
	if (!Array.isArray(slugs)) throw error(400, 'slugs must be an array');

	const cleaned = Array.from(
		new Set(
			slugs.filter((s): s is string => typeof s === 'string' && s.length > 0).map((s) => s.trim())
		)
	).slice(0, MAX);

	if (cleaned.length < MIN) throw error(400, `Need at least ${MIN} valid product slugs`);

	const products = (
		await Promise.all(cleaned.map((slug) => getProduct(locals.supabase, slug)))
	).filter((p): p is NonNullable<typeof p> => p !== null);

	if (products.length < MIN) {
		throw error(404, 'One or more products were not found');
	}

	const result = streamComparison(products);
	return result.toTextStreamResponse();
};

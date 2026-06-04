import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProduct } from '$lib/catalog/queries';
import type { Product } from '$lib/catalog/types';

const MIN_SLUGS = 2;
const MAX_SLUGS = 3;

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	// Edge cache — short TTL because the compare URL space is open-ended
	// (any 2-3 slugs the user picks). Cache per exact ?slugs= URL; the
	// AI verdict stream lives on a separate endpoint and is not cached.
	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
	});

	const raw = (url.searchParams.get('slugs') ?? '').trim();
	const requested = raw
		? Array.from(
				new Set(
					raw
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean)
				)
			).slice(0, MAX_SLUGS)
		: [];

	if (requested.length === 0) {
		return { products: [], requested, missing: [], rows: [] };
	}

	const fetched = await Promise.all(
		requested.map(async (slug) => ({ slug, product: await getProduct(locals.supabase, slug) }))
	);

	const products = fetched
		.filter((f): f is { slug: string; product: Product } => f.product !== null)
		.map((f) => f.product);

	const missing = fetched.filter((f) => f.product === null).map((f) => f.slug);

	if (products.length === 0) {
		throw error(404, 'None of the requested products were found.');
	}

	const rows = buildSpecRows(products);
	const categories = Array.from(new Set(products.map((p) => p.categorySlug)));
	const crossCategory = categories.length > 1;

	return {
		products,
		requested,
		missing,
		rows,
		categories,
		crossCategory,
		// Skip the AI verdict on cross-category compares — there's no useful
		// "winner" between, say, a phone and a laptop, and forcing the model
		// to write one tends to produce strained use-case framing.
		canStreamVerdict: products.length >= MIN_SLUGS && !crossCategory
	};
};

type SpecRow = { label: string; values: string[] };

/**
 * Build a side-by-side spec table: rows are the union of all spec labels
 * across the given products, columns are the products in order. Missing
 * values render as "—" so the table never lies about coverage.
 */
function buildSpecRows(products: Product[]): SpecRow[] {
	const labels: string[] = [];
	for (const p of products) {
		for (const spec of p.specs) {
			if (!labels.includes(spec.label)) labels.push(spec.label);
		}
	}

	return labels.map((label) => ({
		label,
		values: products.map((p) => {
			const hit = p.specs.find((s) => s.label === label);
			return hit ? hit.value : '—';
		})
	}));
}

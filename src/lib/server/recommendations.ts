import type { SupabaseClient } from '@supabase/supabase-js';
import { listProducts } from '$lib/catalog/queries';
import { listWishlist } from '$lib/server/wishlist';
import type { ReasonKind, Recommendation } from '$lib/recommendations/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any> | null;

export type { Recommendation };

/**
 * Personalisation is intentionally rule-based and transparent rather than
 * model-driven. Each recommendation carries a Reason object naming the exact
 * signal that produced it, and the UI shows that reason verbatim. The user
 * can audit every "why am I seeing this?" without an LLM in the loop.
 *
 * Signals (current weights):
 *   - bought a product:      weight 3
 *   - saved to wishlist:     weight 2
 *
 * Algorithm: sum weights per category, pick the top categories, fill up to
 * MAX recommendations from those categories with products the user hasn't
 * already bought or saved. Each rec is attributed to the strongest signal
 * in its category.
 */

const MAX_RECS = 6;
const MAX_PER_CATEGORY = 2;
const SIGNAL_WEIGHTS: Record<ReasonKind, number> = { bought: 3, saved: 2 };

type Signal = { slug: string; kind: ReasonKind };

export async function recommendForUser(sb: SB, userId: string | null): Promise<Recommendation[]> {
	if (!sb || !userId) return [];

	const [orderRows, wishlistRows, allProducts] = await Promise.all([
		fetchOrderSignals(sb, userId),
		listWishlist(sb, userId),
		listProducts(sb)
	]);

	const productBySlug = new Map(allProducts.map((p) => [p.slug, p]));

	const signals: Signal[] = [];
	for (const slug of orderRows) signals.push({ slug, kind: 'bought' });
	for (const w of wishlistRows) signals.push({ slug: w.slug, kind: 'saved' });

	if (signals.length === 0) return [];

	const seen = new Set(signals.map((s) => s.slug));

	// Aggregate category score and remember the strongest signal per category
	// so the reason chip points at a real product the user touched.
	type CatScore = { score: number; anchorSlug: string; anchorKind: ReasonKind };
	const byCategory = new Map<string, CatScore>();

	for (const sig of signals) {
		const product = productBySlug.get(sig.slug);
		if (!product) continue;
		const cat = product.categorySlug;
		const weight = SIGNAL_WEIGHTS[sig.kind];
		const existing = byCategory.get(cat);
		if (!existing) {
			byCategory.set(cat, { score: weight, anchorSlug: sig.slug, anchorKind: sig.kind });
			continue;
		}
		existing.score += weight;
		// Promote the anchor only when the new signal is stronger; keeps the
		// reason text stable when later weak signals pile on.
		if (weight > SIGNAL_WEIGHTS[existing.anchorKind]) {
			existing.anchorSlug = sig.slug;
			existing.anchorKind = sig.kind;
		}
	}

	const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1].score - a[1].score);

	const recs: Recommendation[] = [];
	for (const [cat, info] of sortedCategories) {
		if (recs.length >= MAX_RECS) break;
		const anchor = productBySlug.get(info.anchorSlug);
		if (!anchor) continue;

		const candidates = allProducts
			.filter((p) => p.categorySlug === cat && !seen.has(p.slug))
			.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name));

		for (const candidate of candidates.slice(0, MAX_PER_CATEGORY)) {
			recs.push({
				product: candidate,
				reason: {
					kind: info.anchorKind,
					anchorSlug: anchor.slug,
					anchorName: anchor.name,
					category: cat
				}
			});
			if (recs.length >= MAX_RECS) break;
		}
	}

	return recs;
}

async function fetchOrderSignals(sb: NonNullable<SB>, userId: string): Promise<string[]> {
	type Row = { order_items: { product_slug: string }[] | null };
	const { data, error } = await sb
		.from('orders')
		.select('order_items(product_slug)')
		.eq('user_id', userId)
		.in('status', ['paid', 'fulfilling', 'shipped', 'completed'])
		.limit(50);
	if (error || !data) return [];
	const slugs: string[] = [];
	for (const order of data as unknown as Row[]) {
		for (const item of order.order_items ?? []) {
			if (item.product_slug) slugs.push(item.product_slug);
		}
	}
	return slugs;
}

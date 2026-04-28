import type { SupabaseClient } from '@supabase/supabase-js';
import { isAspect, type Review, type ReviewAspect, type ReviewSummary } from '$lib/reviews/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any>;

async function resolveProductId(sb: SB, slug: string): Promise<string | null> {
	const { data } = await sb.from('products').select('id').eq('slug', slug).maybeSingle();
	return (data?.id as string) ?? null;
}

export const REVIEW_PAGE_SIZE = 5;

export type ReviewsPage = {
	reviews: Review[];
	page: number;
	pageSize: number;
	total: number;
	pageCount: number;
};

export async function listReviewsPage(
	sb: SB | null,
	productSlug: string,
	options: { page?: number; pageSize?: number } = {}
): Promise<ReviewsPage> {
	const pageSize = Math.max(1, Math.min(50, options.pageSize ?? REVIEW_PAGE_SIZE));
	const requested = Math.max(1, Math.floor(options.page ?? 1));
	const empty: ReviewsPage = {
		reviews: [],
		page: requested,
		pageSize,
		total: 0,
		pageCount: 0
	};

	if (!sb) return empty;
	const productId = await resolveProductId(sb, productSlug);
	if (!productId) return empty;

	const from = (requested - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data, error, count } = await sb
		.from('reviews')
		.select('id, user_id, rating, aspect, title, body, created_at', { count: 'exact' })
		.eq('product_id', productId)
		.order('created_at', { ascending: false })
		.range(from, to);

	if (error) {
		console.warn('[reviews] listReviewsPage failed:', error);
		return empty;
	}

	type Row = {
		id: string;
		user_id: string | null;
		rating: number;
		aspect: string | null;
		title: string | null;
		body: string | null;
		created_at: string;
	};
	const rows = (data as unknown as Row[] | null) ?? [];
	const total = count ?? rows.length;
	const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

	// reviews.user_id references auth.users, not public.profiles, so PostgREST
	// can't embed the join — fetch the profile names in a second query.
	const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((u): u is string => !!u)));
	const namesByUserId = new Map<string, string>();
	if (userIds.length > 0) {
		const { data: profiles } = await sb.from('profiles').select('id, full_name').in('id', userIds);
		for (const p of (profiles as Array<{ id: string; full_name: string | null }> | null) ?? []) {
			if (p.full_name) namesByUserId.set(p.id, p.full_name);
		}
	}

	const reviews = rows.map((row) => {
		const aspectRaw = row.aspect ?? 'overall';
		return {
			id: row.id,
			productSlug,
			userId: row.user_id,
			authorName: row.user_id ? (namesByUserId.get(row.user_id) ?? 'Verified buyer') : 'Anonymous',
			rating: row.rating,
			aspect: isAspect(aspectRaw) ? aspectRaw : 'overall',
			title: row.title ?? '',
			body: row.body ?? '',
			createdAt: row.created_at
		};
	});

	return { reviews, page: requested, pageSize, total, pageCount };
}

/**
 * Summarize all reviews for a product. Pulls only `rating` and `aspect` so it
 * stays light even when a product has hundreds of reviews.
 */
export async function summarizeProduct(sb: SB | null, productSlug: string): Promise<ReviewSummary> {
	const empty: ReviewSummary = {
		count: 0,
		average: null,
		perAspect: {
			overall: { count: 0, average: null },
			value: { count: 0, average: null },
			build: { count: 0, average: null },
			performance: { count: 0, average: null }
		}
	};
	if (!sb) return empty;
	const productId = await resolveProductId(sb, productSlug);
	if (!productId) return empty;

	const { data, error } = await sb
		.from('reviews')
		.select('rating, aspect')
		.eq('product_id', productId);

	if (error) {
		console.warn('[reviews] summarizeProduct failed:', error);
		return empty;
	}
	const rows = (data as unknown as Array<{ rating: number; aspect: string | null }> | null) ?? [];

	if (rows.length === 0) return empty;
	let total = 0;
	const summary: ReviewSummary = {
		count: rows.length,
		average: null,
		perAspect: {
			overall: { count: 0, average: null },
			value: { count: 0, average: null },
			build: { count: 0, average: null },
			performance: { count: 0, average: null }
		}
	};
	for (const r of rows) {
		total += r.rating;
		const aspectRaw = r.aspect ?? 'overall';
		const aspect = isAspect(aspectRaw) ? aspectRaw : 'overall';
		const slot = summary.perAspect[aspect];
		slot.count += 1;
		slot.average = ((slot.average ?? 0) * (slot.count - 1) + r.rating) / slot.count;
	}
	summary.average = total / rows.length;
	return summary;
}

export async function userHasReviewed(
	sb: SB | null,
	userId: string | null,
	productSlug: string
): Promise<boolean> {
	if (!sb || !userId) return false;
	const productId = await resolveProductId(sb, productSlug);
	if (!productId) return false;
	const { count } = await sb
		.from('reviews')
		.select('id', { count: 'exact', head: true })
		.eq('product_id', productId)
		.eq('user_id', userId);
	return (count ?? 0) > 0;
}

export async function postReview(
	sb: SB,
	userId: string,
	productSlug: string,
	input: { rating: number; aspect: ReviewAspect; title: string; body: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
	if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
		return { ok: false, message: 'Rating must be between 1 and 5.' };
	}
	if (!isAspect(input.aspect)) {
		return { ok: false, message: 'Unknown aspect.' };
	}
	const productId = await resolveProductId(sb, productSlug);
	if (!productId) return { ok: false, message: 'Product not found.' };

	const { error } = await sb.from('reviews').insert({
		product_id: productId,
		user_id: userId,
		rating: input.rating,
		aspect: input.aspect,
		title: input.title.trim().slice(0, 120),
		body: input.body.trim().slice(0, 4000)
	});
	if (error) return { ok: false, message: error.message };
	return { ok: true };
}

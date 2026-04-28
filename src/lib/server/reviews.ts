import type { SupabaseClient } from '@supabase/supabase-js';
import { isAspect, type Review, type ReviewAspect } from '$lib/reviews/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any>;

async function resolveProductId(sb: SB, slug: string): Promise<string | null> {
	const { data } = await sb.from('products').select('id').eq('slug', slug).maybeSingle();
	return (data?.id as string) ?? null;
}

export async function listReviews(sb: SB | null, productSlug: string): Promise<Review[]> {
	if (!sb) return [];
	const productId = await resolveProductId(sb, productSlug);
	if (!productId) return [];

	const { data, error } = await sb
		.from('reviews')
		.select('id, user_id, rating, aspect, title, body, created_at')
		.eq('product_id', productId)
		.order('created_at', { ascending: false });

	if (error) {
		console.warn('[reviews] listReviews failed:', error);
		return [];
	}
	if (!data) return [];

	type Row = {
		id: string;
		user_id: string | null;
		rating: number;
		aspect: string | null;
		title: string | null;
		body: string | null;
		created_at: string;
	};
	const rows = data as unknown as Row[];

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

	return rows.map((row) => {
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

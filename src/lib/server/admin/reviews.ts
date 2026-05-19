import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/server/db/types';

/**
 * Admin review moderation — server-side helpers.
 *
 * Three actions: hide (set hidden_at = now), show (clear hidden_at),
 * delete (drop the row). All three run under the user's auth cookie;
 * the load-bearing access control is the RLS policies on `reviews`
 * (admin update + admin delete) plus the tightened `reviews readable`
 * policy from migration 20260519140000 which keeps hidden rows out of
 * customer reads.
 *
 * The audit log uses the same [admin] prefix as the product-management
 * helper so an operator can grep both in Vercel logs.
 */

type SB = SupabaseClient<Database>;

/** Filter modes for the admin review list. */
export type AdminReviewFilter = 'all' | 'visible' | 'hidden';

export type AdminReviewRow = {
	id: string;
	product_id: string;
	product_slug: string | null;
	product_name: string | null;
	user_id: string | null;
	rating: number;
	aspect: string | null;
	title: string;
	body: string;
	created_at: string;
	hidden_at: string | null;
};

/** Typed error so the page action can branch on the cause. */
export class AdminReviewError extends Error {
	public readonly code: 'validation' | 'forbidden' | 'not_found' | 'database';
	constructor(code: AdminReviewError['code'], message: string) {
		super(message);
		this.name = 'AdminReviewError';
		this.code = code;
	}
}

/**
 * List reviews for the admin queue, optionally filtered by hidden state.
 * Admin's view of `reviews` is unfiltered by RLS (is_admin() branch),
 * so we apply the filter in SQL via predicates on hidden_at.
 */
export async function listAdminReviews(
	sb: SB | null,
	filter: AdminReviewFilter = 'all'
): Promise<AdminReviewRow[]> {
	if (!sb) return [];

	let query = sb
		.from('reviews')
		.select(
			'id, product_id, user_id, rating, aspect, title, body, created_at, hidden_at, products(slug, name)'
		)
		.order('created_at', { ascending: false });

	if (filter === 'visible') {
		query = query.is('hidden_at', null);
	} else if (filter === 'hidden') {
		query = query.not('hidden_at', 'is', null);
	}

	const { data, error } = await query;
	if (error || !data) return [];

	return (
		data as unknown as Array<
			Record<string, unknown> & { products?: { slug?: string; name?: string } }
		>
	).map((row) => ({
		id: String(row.id),
		product_id: String(row.product_id),
		product_slug: row.products?.slug ?? null,
		product_name: row.products?.name ?? null,
		user_id: row.user_id ? String(row.user_id) : null,
		rating: Number(row.rating),
		aspect: row.aspect ? String(row.aspect) : null,
		title: String(row.title),
		body: String(row.body),
		created_at: String(row.created_at),
		hidden_at: row.hidden_at ? String(row.hidden_at) : null
	}));
}

/**
 * Set or clear the hidden_at timestamp on a review. The boolean argument
 * is what the caller wants the new state to be — `true` hides, `false`
 * shows. We always read the before-image first so the audit log can
 * carry the actual transition (and so a stale request fails loudly as
 * not_found rather than silently no-op).
 */
export async function setReviewHidden(
	sb: SB | null,
	adminUserId: string,
	id: string,
	hidden: boolean
): Promise<AdminReviewRow> {
	if (!sb) {
		throw new AdminReviewError('database', 'Supabase client is not available.');
	}
	if (!id) {
		throw new AdminReviewError('validation', 'Missing review id.');
	}

	const beforeRes = await sb.from('reviews').select('id, hidden_at').eq('id', id).maybeSingle();
	if (beforeRes.error) {
		throw new AdminReviewError('database', beforeRes.error.message ?? 'Failed to read review.');
	}
	if (!beforeRes.data) {
		throw new AdminReviewError('not_found', 'Review not found.');
	}

	const patch = { hidden_at: hidden ? new Date().toISOString() : null };
	const { data: afterData, error: updateError } = await sb
		.from('reviews')
		.update(patch)
		.eq('id', id)
		.select(
			'id, product_id, user_id, rating, aspect, title, body, created_at, hidden_at, products(slug, name)'
		)
		.single();

	if (updateError) {
		const msg = (updateError.message ?? '').toLowerCase();
		if (
			msg.includes('permission denied') ||
			msg.includes('row-level security') ||
			msg.includes('rls')
		) {
			throw new AdminReviewError(
				'forbidden',
				'Your session no longer has admin access; please sign in again.'
			);
		}
		throw new AdminReviewError('database', updateError.message ?? 'Update failed.');
	}
	if (!afterData) {
		throw new AdminReviewError(
			'forbidden',
			'The update did not take effect. You may have lost admin access mid-request.'
		);
	}

	const afterRow = afterData as unknown as Record<string, unknown> & {
		products?: { slug?: string; name?: string };
	};

	logModeration(adminUserId, id, hidden ? 'hide' : 'show', beforeRes.data, {
		hidden_at: afterRow.hidden_at ? String(afterRow.hidden_at) : null
	});

	return {
		id: String(afterRow.id),
		product_id: String(afterRow.product_id),
		product_slug: afterRow.products?.slug ?? null,
		product_name: afterRow.products?.name ?? null,
		user_id: afterRow.user_id ? String(afterRow.user_id) : null,
		rating: Number(afterRow.rating),
		aspect: afterRow.aspect ? String(afterRow.aspect) : null,
		title: String(afterRow.title),
		body: String(afterRow.body),
		created_at: String(afterRow.created_at),
		hidden_at: afterRow.hidden_at ? String(afterRow.hidden_at) : null
	};
}

/**
 * Permanently delete a review. Idempotent on a missing row — if another
 * admin got there first, the desired end state was reached anyway.
 */
export async function deleteReview(sb: SB | null, adminUserId: string, id: string): Promise<void> {
	if (!sb) {
		throw new AdminReviewError('database', 'Supabase client is not available.');
	}
	if (!id) {
		throw new AdminReviewError('validation', 'Missing review id.');
	}

	const { error } = await sb.from('reviews').delete().eq('id', id);
	if (error) {
		const msg = (error.message ?? '').toLowerCase();
		if (
			msg.includes('permission denied') ||
			msg.includes('row-level security') ||
			msg.includes('rls')
		) {
			throw new AdminReviewError(
				'forbidden',
				'Your session no longer has admin access; please sign in again.'
			);
		}
		throw new AdminReviewError('database', error.message ?? 'Delete failed.');
	}

	logModeration(adminUserId, id, 'delete', null, null);
}

/** Audit log line — same shape as the product audit log so they grep together. */
export function logModeration(
	adminUserId: string,
	reviewId: string,
	action: 'hide' | 'show' | 'delete',
	before: { hidden_at: string | null } | null,
	after: { hidden_at: string | null } | null
): void {
	console.info(
		'[admin]',
		JSON.stringify({
			at: new Date().toISOString(),
			by: adminUserId,
			review: reviewId,
			action,
			before,
			after
		})
	);
}

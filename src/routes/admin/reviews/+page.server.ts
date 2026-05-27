import { fail } from '@sveltejs/kit';
import {
	AdminReviewError,
	deleteReview,
	listAdminReviews,
	setReviewHidden,
	type AdminReviewFilter
} from '$lib/server/admin/reviews';
import type { Actions, PageServerLoad } from './$types';

/**
 * Admin review moderation. Role guard ran in /admin/+layout.server.ts so
 * locals.user is already an admin by the time we get here. We pass the
 * user id through to the write helpers so the audit log captures who
 * did what.
 *
 * `?filter=visible|hidden` lets an admin jump straight to one queue;
 * anything else falls back to "all" so a stray URL doesn't surface as
 * an empty page.
 */
function parseFilter(raw: string | null): AdminReviewFilter {
	if (raw === 'visible' || raw === 'hidden') return raw;
	return 'all';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const filter = parseFilter(url.searchParams.get('filter'));
	const reviews = await listAdminReviews(locals.supabase ?? null, filter);
	return { reviews, filter };
};

function mapErrorToStatus(code: AdminReviewError['code']): number {
	if (code === 'forbidden') return 403;
	if (code === 'not_found') return 404;
	if (code === 'validation') return 400;
	return 500;
}

export const actions: Actions = {
	hide: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		try {
			const adminId = locals.user?.id ?? '';
			const after = await setReviewHidden(locals.supabase ?? null, adminId, id, true);
			return { ok: true as const, id, review: after };
		} catch (err) {
			if (err instanceof AdminReviewError) {
				return fail(mapErrorToStatus(err.code), { id, error: err.message });
			}
			console.error('[admin] hide failed', err);
			return fail(500, { id, error: 'Something went wrong saving the review.' });
		}
	},

	show: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		try {
			const adminId = locals.user?.id ?? '';
			const after = await setReviewHidden(locals.supabase ?? null, adminId, id, false);
			return { ok: true as const, id, review: after };
		} catch (err) {
			if (err instanceof AdminReviewError) {
				return fail(mapErrorToStatus(err.code), { id, error: err.message });
			}
			console.error('[admin] show failed', err);
			return fail(500, { id, error: 'Something went wrong saving the review.' });
		}
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		try {
			const adminId = locals.user?.id ?? '';
			await deleteReview(locals.supabase ?? null, adminId, id);
			return { ok: true as const, id, deleted: true };
		} catch (err) {
			if (err instanceof AdminReviewError) {
				return fail(mapErrorToStatus(err.code), { id, error: err.message });
			}
			console.error('[admin] delete failed', err);
			return fail(500, { id, error: 'Something went wrong deleting the review.' });
		}
	}
};

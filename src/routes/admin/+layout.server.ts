import { redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

/**
 * Two layers of access control for everything under /admin/*:
 *   1. The route layer (this file) refuses the request before any admin page
 *      load runs.
 *   2. The database layer's RLS policies refuse any write that slips past
 *      the route guard (defense in depth — see migration 20260519120000).
 *
 * Failure handling:
 *   - signed-out visitor  → 303 to /login with a `next=` redirect back here
 *   - signed-in customer  → 303 to / (home). We don't show a 403 page because
 *     the requirements say not to leak the existence of admin features.
 *
 * The check happens once per request at the layout level and the result is
 * passed down to nested pages via `data.adminUser`, so /admin/products doesn't
 * need to repeat the role check.
 */
export const load: LayoutServerLoad = async ({ locals, url, setHeaders }) => {
	// Admin pages are never cacheable. Explicit no-store keeps the edge
	// from accidentally caching a redirect or a partial response and
	// serving it to a non-admin later. Defense in depth alongside the
	// route guard below.
	setHeaders({
		'Cache-Control': 'private, no-store'
	});

	if (!locals.user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	if (!(await isAdmin(locals.supabase ?? null, locals.user))) {
		throw redirect(303, '/');
	}
	return { adminUser: locals.user };
};

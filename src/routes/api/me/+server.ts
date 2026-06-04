import { json } from '@sveltejs/kit';
import { getCartCount } from '$lib/server/cart';
import type { RequestHandler } from './$types';

/**
 * Per-user session shape, fetched client-side after the cached SSR pass
 * renders the anonymous-state header.
 *
 * Why this exists: the catalog routes (`/`, `/categories`, `/category/<slug>`)
 * set `Cache-Control: public, s-maxage=...` so Vercel's edge caches the
 * SSR HTML and serves the same bytes to every visitor. If the header
 * rendered the user's email or cart badge during SSR, that personal
 * data would land in the cache and leak to subsequent visitors. The
 * SSR pass therefore renders the header in anonymous state; this
 * endpoint feeds the real user info to a client-side hydration.
 *
 * Explicitly not cached — `Cache-Control: private, no-store` — so the
 * response is always fresh and never shared.
 */
export const GET: RequestHandler = async ({ locals, setHeaders }) => {
	setHeaders({
		'Cache-Control': 'private, no-store'
	});

	if (!locals.user) {
		return json({ user: null, cartCount: 0 });
	}

	const cartCount = await getCartCount(locals.supabase ?? null, locals.user.id);
	return json({
		user: { id: locals.user.id, email: locals.user.email ?? null },
		cartCount
	});
};

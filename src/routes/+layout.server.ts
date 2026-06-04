import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load.
 *
 * Returns no per-user data. The Week 6 catalog edge caching
 * (specs/003-catalog-edge-caching) caches the SSR HTML at the Vercel
 * edge with a long s-maxage; any user-specific value returned from
 * this load would end up in the cached HTML and leak to other
 * visitors. So the layout renders an anonymous shell during SSR and
 * the header re-hydrates client-side from `/api/me`.
 *
 * Pages that need the user (e.g. /account, /admin, /cart) read it
 * directly from `locals.user` in their own +page.server.ts load.
 */
export const load: LayoutServerLoad = async () => {
	return {};
};

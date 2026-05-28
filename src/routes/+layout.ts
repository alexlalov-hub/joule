import posthog from 'posthog-js';
import { browser } from '$app/environment';
import { PUBLIC_POSTHOG_KEY, PUBLIC_POSTHOG_HOST } from '$env/static/public';
import type { LayoutLoad } from './$types';

/**
 * Universal layout load. Two responsibilities:
 *
 *   1. Initialise PostHog in the browser. Server-side rendering doesn't
 *      need to call init (no analytics from SSR), so the call is gated
 *      on the `browser` flag from $app/environment.
 *
 *   2. Pass server-side data through to children. When a route has both
 *      a +layout.server.ts and a +layout.ts, the universal load's return
 *      value becomes the `data` prop on children — so without an
 *      explicit pass-through, `data.user` and `data.cartCount` from the
 *      server load disappear from every nested route's view.
 */
export const load: LayoutLoad = async ({ data }) => {
	if (browser) {
		posthog.init(PUBLIC_POSTHOG_KEY, {
			api_host: PUBLIC_POSTHOG_HOST,
			defaults: '2026-01-30',
			capture_pageview: false
		});
	}

	return data;
};

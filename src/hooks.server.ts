import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env as publicEnv } from '$env/dynamic/public';
import type { Database } from '$lib/server/db/types';

/**
 * Headers applied to every response. Reasonable baseline for an e-commerce
 * SSR app — tighten CSP once the third-party origins (Stripe, image CDNs)
 * are pinned down.
 */
const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

function applySecurityHeaders(response: Response): Response {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}
	return response;
}

const supabase: Handle = async ({ event, resolve }) => {
	const url = publicEnv.PUBLIC_SUPABASE_URL;
	const publishable = publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!url || !publishable) {
		// Running without Supabase creds — degrade to anonymous, no session.
		event.locals.supabase = null;
		event.locals.safeGetUser = async () => null;
		event.locals.user = null;
		return resolve(event, {
			filterSerializedResponseHeaders: (name) =>
				name === 'content-range' || name === 'x-supabase-api-version'
		});
	}

	const sb = createServerClient<Database>(url, publishable, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
	event.locals.supabase = sb;

	/**
	 * Authenticate via getUser() (which contacts the Supabase Auth server) rather
	 * than reading the user off getSession()'s return value, which is unverified
	 * and triggers the SSR warning.
	 *
	 * Short-circuit when no Supabase auth cookie is present on the request —
	 * otherwise every anonymous page view costs a round-trip to Supabase Auth.
	 */
	event.locals.safeGetUser = async () => {
		if (!hasSupabaseAuthCookie(event.cookies.getAll())) return null;
		const {
			data: { user },
			error
		} = await sb.auth.getUser();
		if (error) return null;
		return user;
	};

	event.locals.user = await event.locals.safeGetUser();

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

const headers: Handle = async ({ event, resolve }) => applySecurityHeaders(await resolve(event));

export const handle = sequence(supabase, headers);

/**
 * Supabase SSR sets cookies named `sb-<project-ref>-auth-token`. We can't pin
 * the project ref because it varies per environment, so we look for the
 * `sb-`...`-auth-token` shape. Anything else means the visitor is anonymous
 * and we can skip the network round-trip to Supabase Auth.
 */
function hasSupabaseAuthCookie(cookies: Array<{ name: string; value: string }>): boolean {
	return cookies.some(
		(c) => c.name.startsWith('sb-') && c.name.includes('-auth-token') && c.value.length > 0
	);
}

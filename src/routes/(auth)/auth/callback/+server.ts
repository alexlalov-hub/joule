import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SAFE_NEXT_RE = /^\/[^/].*/;

function safeNext(raw: string | null): string {
	if (!raw) return '/account';
	return SAFE_NEXT_RE.test(raw) ? raw : '/account';
}

/**
 * Lands here after a magic-link click or OAuth provider redirect with a
 * one-shot `?code=` we exchange for a session. Forwards to the original
 * destination (`?next=`) when one was attached, otherwise /account.
 *
 * Failure paths redirect back to /login with an explicit reason so the page
 * can show the user what went wrong instead of silently bouncing them.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = safeNext(url.searchParams.get('next'));

	if (!locals.supabase) {
		// No Supabase configured (local mode without env). Bounce back so the
		// user isn't stranded on /auth/callback.
		throw redirect(303, '/login?error=auth_unavailable');
	}

	if (!code) {
		throw redirect(303, '/login?error=missing_code');
	}

	const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
	if (error) {
		console.warn('[auth/callback] exchangeCodeForSession failed:', error.message);
		throw redirect(303, '/login?error=exchange_failed');
	}

	throw redirect(303, next);
};

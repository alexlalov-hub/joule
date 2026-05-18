import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SAFE_NEXT_RE = /^\/[^/].*/; // only allow same-origin paths

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(303, safeNext(url.searchParams.get('next')));
	return {};
};

function noSupabase() {
	return fail(503, {
		error:
			'Auth unavailable in local mode. Add PUBLIC_SUPABASE_URL + keys in .env.local to enable sign-in.'
	});
}

function safeNext(raw: string | null | undefined): string {
	// Only accept same-origin paths so a malicious /login?next=https://evil...
	// can't redirect after auth. Falls back to /account.
	if (!raw) return '/account';
	return SAFE_NEXT_RE.test(raw) ? raw : '/account';
}

function buildCallbackUrl(origin: string, next: string): string {
	const target = `${origin}/auth/callback`;
	return next === '/account' ? target : `${target}?next=${encodeURIComponent(next)}`;
}

export const actions: Actions = {
	password: async ({ request, locals, url }) => {
		if (locals.user) throw redirect(303, safeNext(url.searchParams.get('next')));
		if (!locals.supabase) return noSupabase();

		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		if (!EMAIL_RE.test(email)) {
			return fail(400, { email, error: 'That doesn’t look like a valid email address.' });
		}
		if (!password) {
			return fail(400, { email, error: 'Password is required.' });
		}

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { email, error: error.message });
		throw redirect(303, safeNext(url.searchParams.get('next')));
	},

	magic: async ({ request, locals, url }) => {
		if (locals.user) throw redirect(303, safeNext(url.searchParams.get('next')));
		if (!locals.supabase) return noSupabase();

		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		if (!EMAIL_RE.test(email)) {
			return fail(400, { email, error: 'That doesn’t look like a valid email address.' });
		}

		const next = safeNext(url.searchParams.get('next'));
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: buildCallbackUrl(url.origin, next) }
		});
		if (error) return fail(400, { email, error: error.message });
		return { message: `Magic link sent to ${email}. Check your inbox.` };
	},

	oauth: async ({ request, locals, url }) => {
		if (locals.user) throw redirect(303, safeNext(url.searchParams.get('next')));
		if (!locals.supabase) return noSupabase();

		const data = await request.formData();
		const provider = String(data.get('provider') ?? 'google');
		if (provider !== 'google' && provider !== 'github') {
			return fail(400, { error: 'Unsupported provider.' });
		}

		const next = safeNext(url.searchParams.get('next'));
		const { data: res, error } = await locals.supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo: buildCallbackUrl(url.origin, next) }
		});
		if (error) return fail(400, { error: error.message });
		if (res.url) throw redirect(303, res.url);
		return fail(500, { error: 'OAuth redirect URL not returned.' });
	}
};

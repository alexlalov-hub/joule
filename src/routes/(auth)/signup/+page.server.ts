import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/account');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		if (locals.user) throw redirect(303, '/account');

		if (!locals.supabase) {
			return fail(503, {
				error:
					'Auth unavailable in local mode. Add Supabase env vars in .env.local to enable sign-up.'
			});
		}

		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!EMAIL_RE.test(email)) {
			return fail(400, { email, error: 'That doesn’t look like a valid email address.' });
		}
		if (password.length < MIN_PASSWORD_LEN) {
			return fail(400, {
				email,
				error: `Password must be at least ${MIN_PASSWORD_LEN} characters.`
			});
		}

		const { data: result, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: `${url.origin}/auth/callback` }
		});

		if (error) return fail(400, { email, error: error.message });

		// Supabase obfuscates "email already registered" to prevent enumeration:
		// signUp returns a fake user with an empty `identities` array. Catch that
		// here and surface a clear message — much better UX than "check your
		// inbox" when nothing will arrive. This trade-off (mild enumeration risk
		// for clarity) is fine for a small e-commerce site.
		const identities = result.user?.identities ?? [];
		if (result.user && identities.length === 0) {
			return fail(409, {
				email,
				error:
					'An account already exists for that email. Try signing in, or use the magic-link option on the sign-in page.'
			});
		}

		return { message: `Check your inbox at ${email} to confirm your account.` };
	}
};

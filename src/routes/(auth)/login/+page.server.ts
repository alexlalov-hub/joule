import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(303, url.searchParams.get('next') ?? '/account');
	return {};
};

function noSupabase() {
	return fail(503, {
		error:
			'Auth unavailable in local mode. Add PUBLIC_SUPABASE_URL + keys in .env.local to enable sign-in.'
	});
}

export const actions: Actions = {
	password: async ({ request, locals }) => {
		if (!locals.supabase) return noSupabase();
		const data = await request.formData();
		const email = String(data.get('email') ?? '');
		const password = String(data.get('password') ?? '');
		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { error: error.message });
		throw redirect(303, '/account');
	},

	magic: async ({ request, locals, url }) => {
		if (!locals.supabase) return noSupabase();
		const data = await request.formData();
		const email = String(data.get('email') ?? '');
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: `${url.origin}/auth/callback` }
		});
		if (error) return fail(400, { error: error.message });
		return { message: `Magic link sent to ${email}. Check your inbox.` };
	},

	oauth: async ({ request, locals, url }) => {
		if (!locals.supabase) return noSupabase();
		const data = await request.formData();
		const provider = String(data.get('provider') ?? 'google') as 'google' | 'github';
		const { data: res, error } = await locals.supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo: `${url.origin}/auth/callback` }
		});
		if (error) return fail(400, { error: error.message });
		if (res.url) throw redirect(303, res.url);
		return fail(500, { error: 'OAuth redirect URL not returned.' });
	}
};

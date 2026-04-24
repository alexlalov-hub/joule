import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

const supabase: Handle = async ({ event, resolve }) => {
	const url = publicEnv.PUBLIC_SUPABASE_URL;
	const publishable = publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!url || !publishable) {
		// Running without Supabase creds — degrade to anonymous, no session.
		event.locals.supabase = null as never;
		event.locals.safeGetSession = async () => ({ session: null, user: null });
		event.locals.session = null;
		event.locals.user = null;
		return resolve(event, {
			filterSerializedResponseHeaders: (name) =>
				name === 'content-range' || name === 'x-supabase-api-version'
		});
	}

	event.locals.supabase = createServerClient(url, publishable, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Silence unused in case private env isn't used here yet
	void privateEnv;

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

export const handle = sequence(supabase);

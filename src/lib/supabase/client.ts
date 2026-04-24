import { createBrowserClient, isBrowser } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import type { Database } from '$lib/server/db/types';

/**
 * Singleton browser client. Returns `null` when Supabase env is absent so that
 * local dev without credentials still boots the UI.
 */
export function browserSupabase() {
	if (!isBrowser()) return null;
	const url = env.PUBLIC_SUPABASE_URL;
	const anon = env.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anon) return null;
	return createBrowserClient<Database>(url, anon);
}

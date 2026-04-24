import { createClient } from '@supabase/supabase-js';
import { env as pub } from '$env/dynamic/public';
import { env as priv } from '$env/dynamic/private';
import type { Database } from '$lib/server/db/types';

/**
 * Secret-key client for server-only operations (seeding, admin mutations).
 * Bypasses RLS — never expose to the browser, never import in client code.
 */
export function adminSupabase() {
	const url = pub.PUBLIC_SUPABASE_URL;
	const secret = priv.SUPABASE_SECRET_KEY;
	if (!url || !secret) {
		throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
	}
	return createClient<Database>(url, secret, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

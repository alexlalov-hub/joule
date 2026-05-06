import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Bypasses RLS — use only in server code for
 * tables whose policies intentionally allow only server-side writes (orders,
 * order_items, etc.).
 */
export function getSupabaseAdmin(): SupabaseClient {
	if (cached) return cached;
	const url = publicEnv.PUBLIC_SUPABASE_URL;
	const secret = env.SUPABASE_SECRET_KEY;
	if (!url || !secret) throw new Error('Supabase admin credentials are not set');
	cached = createClient(url, secret, { auth: { persistSession: false } });
	return cached;
}

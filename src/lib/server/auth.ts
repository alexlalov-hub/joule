import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/server/db/types';

/**
 * Role checks. Joule only has two roles today — `customer` (the default for
 * any newly-signed-up user) and `admin`. The role lives on the profiles
 * table; the handle_new_user trigger creates a profile row with role
 * 'customer' on signup, so every authenticated user has a profile.
 *
 * isAdmin needs the supabase client because the role isn't on the auth
 * user object — it's a separate column we read by id. Caches once per
 * request shouldn't be needed; admin pages already gate the layout once.
 */

type SB = SupabaseClient<Database> | null;

export async function isAdmin(sb: SB, user: User | null | undefined): Promise<boolean> {
	if (!sb || !user) return false;
	const { data, error } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
	if (error || !data) return false;
	return data.role === 'admin';
}

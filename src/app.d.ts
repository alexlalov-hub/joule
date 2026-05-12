import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/server/db/types';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient<Database>;
			/**
			 * Returns the authenticated user via supabase.auth.getUser(), which
			 * round-trips to Supabase Auth. Use this instead of getSession() —
			 * the session object's .user field is unverified.
			 */
			safeGetUser: () => Promise<User | null>;
			user: User | null;
		}
		interface PageData {
			user: User | null;
		}
		// interface Error {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

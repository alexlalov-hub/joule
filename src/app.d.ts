import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/server/db/types';

declare global {
	namespace App {
		interface Locals {
			/**
			 * Null when Supabase env isn't configured — the app degrades to
			 * anonymous, seed-only mode. Always check before use.
			 */
			supabase: SupabaseClient<Database> | null;
			/**
			 * Returns the authenticated user via supabase.auth.getUser(), which
			 * round-trips to Supabase Auth. Use this instead of getSession() —
			 * the session object's .user field is unverified.
			 */
			safeGetUser: () => Promise<User | null>;
			user: User | null;
		}
		// PageData intentionally has no `user` field. The Week 6 catalog
		// edge caching (specs/003-catalog-edge-caching/) requires the root
		// layout server load to return no per-user data so the SSR HTML
		// can be safely cached at the Vercel edge. Pages that need the
		// user (account, admin, product) read it from their own
		// +page.server.ts via locals.user.
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface PageData {}
		// interface Error {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

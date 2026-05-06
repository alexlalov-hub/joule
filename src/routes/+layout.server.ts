import type { LayoutServerLoad } from './$types';
import { getCartCount } from '$lib/server/cart';

export const load: LayoutServerLoad = async ({ locals }) => {
	const cartCount = await getCartCount(locals.supabase ?? null, locals.user?.id ?? null);
	return {
		session: locals.session,
		user: locals.user,
		cartCount
	};
};

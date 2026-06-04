import type { LayoutServerLoad } from './$types';
import { getCartCount } from '$lib/server/cart';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Only pay for the cart-count round-trip when there's actually a user.
	// Anonymous visitors never have items to count, and the layout otherwise
	// runs on every navigation.
	const cartCount = locals.user ? await getCartCount(locals.supabase ?? null, locals.user.id) : 0;
	return {
		user: locals.user,
		cartCount
	};
};

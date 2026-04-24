import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getCartSummary, removeCartItem, updateCartItemQty, clearCart } from '$lib/server/cart';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !locals.supabase) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	const cart = await getCartSummary(locals.supabase, locals.user.id);
	return { cart };
};

export const actions: Actions = {
	updateQty: async ({ request, locals }) => {
		if (!locals.user || !locals.supabase) throw redirect(303, '/login');
		const form = await request.formData();
		const itemId = String(form.get('itemId') ?? '');
		const quantity = Number(form.get('quantity') ?? 0);
		if (!itemId) return fail(400, { message: 'Missing item.' });
		const result = await updateCartItemQty(locals.supabase, locals.user.id, itemId, quantity);
		if (!result.ok) return fail(400, { message: result.message });
		return { ok: true };
	},
	remove: async ({ request, locals }) => {
		if (!locals.user || !locals.supabase) throw redirect(303, '/login');
		const form = await request.formData();
		const itemId = String(form.get('itemId') ?? '');
		if (!itemId) return fail(400, { message: 'Missing item.' });
		const result = await removeCartItem(locals.supabase, locals.user.id, itemId);
		if (!result.ok) return fail(400, { message: result.message });
		return { ok: true };
	},
	clear: async ({ locals }) => {
		if (!locals.user || !locals.supabase) throw redirect(303, '/login');
		await clearCart(locals.supabase, locals.user.id);
		return { ok: true };
	}
};

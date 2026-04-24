import { redirect } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';
import { getStripe } from '$lib/server/stripe';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

/**
 * Stripe redirects here after checkout. Marks the order paid + clears the
 * cart, then redirects to the success page. Doing the work BEFORE the next
 * page load ensures the layout's cart-count query sees the empty cart on the
 * very first render — no flicker, no stale badge.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const sessionId = url.searchParams.get('session_id');
	if (!sessionId) throw redirect(303, '/account');

	try {
		const stripe = getStripe();
		const session = await stripe.checkout.sessions.retrieve(sessionId);
		const orderId = session.metadata?.order_id ?? null;

		if (session.payment_status === 'paid' && orderId) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const admin = getSupabaseAdmin() as SupabaseClient<any, 'public', any>;

			await admin
				.from('orders')
				.update({
					status: 'paid',
					total_cents: session.amount_total ?? undefined,
					updated_at: new Date().toISOString()
				})
				.eq('id', orderId)
				.eq('user_id', locals.user.id)
				.neq('status', 'paid');

			const { data: cart } = await admin
				.from('carts')
				.select('id')
				.eq('user_id', locals.user.id)
				.maybeSingle();
			if (cart) await admin.from('cart_items').delete().eq('cart_id', cart.id);
		}
	} catch {
		// Fall through — the success page will show whatever it can retrieve.
	}

	throw redirect(303, `/checkout/success?session_id=${encodeURIComponent(sessionId)}`);
};

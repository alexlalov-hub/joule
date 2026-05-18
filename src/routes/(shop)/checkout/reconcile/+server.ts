import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStripe } from '$lib/server/stripe';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

/**
 * Stripe redirects here after checkout. Marks the order paid (and decrements
 * stock atomically via the mark_order_paid RPC), then clears the cart and
 * forwards to the success page. Doing the work BEFORE the next page load
 * ensures the layout's cart-count query sees the empty cart on the very
 * first render — no flicker, no stale badge.
 *
 * The webhook handler runs the same RPC. mark_order_paid is idempotent (only
 * the first caller flips the status and decrements stock), so it does not
 * matter which one wins the race.
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
			const admin = getSupabaseAdmin();

			await admin.rpc('mark_order_paid', {
				p_order_id: orderId,
				p_total_cents: session.amount_total ?? null
			});

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

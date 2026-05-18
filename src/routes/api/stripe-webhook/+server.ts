import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { getStripe } from '$lib/server/stripe';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';
import type Stripe from 'stripe';

/**
 * Stripe webhook. Verifies signature, then marks the order as paid and clears
 * the cart. Idempotent — checkout/reconcile may have already done this work
 * if the user landed on the success URL first.
 */
export const POST: RequestHandler = async ({ request }) => {
	const sig = request.headers.get('stripe-signature');
	const secret = env.STRIPE_WEBHOOK_SECRET;
	if (!sig || !secret) throw error(400, 'Missing signature');

	const raw = await request.text();
	const stripe = getStripe();

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(raw, sig, secret);
	} catch (e) {
		throw error(400, `Invalid signature: ${(e as Error).message}`);
	}

	if (event.type !== 'checkout.session.completed') {
		return json({ received: true });
	}

	const session = event.data.object as Stripe.Checkout.Session;
	const orderId = session.metadata?.order_id;
	const userId = session.metadata?.user_id;
	if (!orderId) return json({ received: true, skipped: 'no order_id' });

	const sb = getSupabaseAdmin();

	await sb
		.from('orders')
		.update({
			status: 'paid',
			total_cents: session.amount_total ?? undefined,
			updated_at: new Date().toISOString()
		})
		.eq('id', orderId)
		.neq('status', 'paid');

	if (userId) {
		const { data: cart } = await sb.from('carts').select('id').eq('user_id', userId).maybeSingle();
		if (cart) await sb.from('cart_items').delete().eq('cart_id', cart.id);
	}

	return json({ received: true });
};

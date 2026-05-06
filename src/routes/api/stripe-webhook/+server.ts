import { error, json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { getStripe } from '$lib/server/stripe';
import type Stripe from 'stripe';

/**
 * Stripe webhook. Verifies signature, then marks the order as paid and clears
 * the cart. Uses the secret key client — webhook runs with no user session.
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

	const url = publicEnv.PUBLIC_SUPABASE_URL;
	const secretKey = env.SUPABASE_SECRET_KEY;
	if (!url || !secretKey) throw error(500, 'Supabase not configured');

	const sb = createClient(url, secretKey, { auth: { persistSession: false } });

	await sb
		.from('orders')
		.update({
			status: 'paid',
			total_cents: session.amount_total ?? undefined,
			updated_at: new Date().toISOString()
		})
		.eq('id', orderId);

	if (userId) {
		const { data: cart } = await sb.from('carts').select('id').eq('user_id', userId).maybeSingle();
		if (cart) await sb.from('cart_items').delete().eq('cart_id', cart.id);
	}

	return json({ received: true });
};

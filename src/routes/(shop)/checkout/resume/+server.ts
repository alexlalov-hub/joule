import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStripe } from '$lib/server/stripe';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

/**
 * Resume payment for a pending order. Re-uses the original Stripe session if
 * it's still `open`, otherwise creates a fresh one from the order's snapshot.
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user || !locals.supabase) {
		throw redirect(303, `/login?next=${encodeURIComponent('/account')}`);
	}
	const form = await request.formData();
	const orderId = String(form.get('orderId') ?? '');
	if (!orderId) throw error(400, 'Missing order id');

	const admin = getSupabaseAdmin();

	const { data: order } = await admin
		.from('orders')
		.select('id, status, stripe_session, user_id, email')
		.eq('id', orderId)
		.eq('user_id', locals.user.id)
		.maybeSingle();
	if (!order) throw error(404, 'Order not found');
	if (order.status !== 'pending') throw redirect(303, '/account');

	const stripe = getStripe();

	if (order.stripe_session) {
		try {
			const existing = await stripe.checkout.sessions.retrieve(order.stripe_session);
			if (existing.status === 'open' && existing.url) {
				throw redirect(303, existing.url);
			}
		} catch (e) {
			// If retrieve fails (expired/deleted), fall through and create a new one.
			if (e instanceof Response) throw e;
		}
	}

	const { data: items } = await admin
		.from('order_items')
		.select('product_slug, product_name, unit_price_cents, quantity')
		.eq('order_id', orderId);
	const rows = items ?? [];
	if (rows.length === 0) throw error(400, 'Order has no items to resume');

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		payment_method_types: ['card'],
		customer_email: order.email ?? locals.user.email ?? undefined,
		line_items: rows.map((i) => ({
			price_data: {
				currency: 'eur',
				unit_amount: i.unit_price_cents,
				product_data: { name: i.product_name }
			},
			quantity: i.quantity
		})),
		success_url: `${url.origin}/checkout/reconcile?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${url.origin}/account`,
		metadata: { order_id: orderId, user_id: locals.user.id }
	});

	await admin.from('orders').update({ stripe_session: session.id }).eq('id', orderId);

	if (!session.url) throw error(500, 'Stripe did not return a checkout URL');
	throw redirect(303, session.url);
};

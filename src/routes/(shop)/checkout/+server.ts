import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCartSummary } from '$lib/server/cart';
import { getStripe } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || !locals.supabase) {
		throw redirect(303, `/login?next=${encodeURIComponent('/cart')}`);
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sb = locals.supabase as SupabaseClient<any, 'public', any>;

	const cart = await getCartSummary(sb, locals.user.id);
	if (cart.items.length === 0) throw redirect(303, '/cart');

	const { data: orderRow, error: orderErr } = await sb
		.from('orders')
		.insert({
			user_id: locals.user.id,
			email: locals.user.email ?? '',
			status: 'pending',
			subtotal_cents: cart.subtotalCents,
			total_cents: cart.subtotalCents,
			currency: 'EUR'
		})
		.select('id')
		.single();
	if (orderErr || !orderRow) throw error(500, 'Could not create order');

	const orderId = orderRow.id as string;

	const orderItems = cart.items.map((i) => ({
		order_id: orderId,
		product_slug: i.slug,
		product_name: i.name,
		unit_price_cents: i.priceCents,
		quantity: i.quantity
	}));
	await sb.from('order_items').insert(orderItems);

	const stripe = getStripe();
	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		payment_method_types: ['card'],
		customer_email: locals.user.email ?? undefined,
		line_items: cart.items.map((i) => ({
			price_data: {
				currency: 'eur',
				unit_amount: i.priceCents,
				product_data: {
					name: i.name,
					description: i.brand,
					images: i.image ? [i.image] : undefined
				}
			},
			quantity: i.quantity
		})),
		success_url: `${url.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${url.origin}/cart`,
		metadata: { order_id: orderId, user_id: locals.user.id }
	});

	await sb.from('orders').update({ stripe_session: session.id }).eq('id', orderId);

	if (!session.url) throw error(500, 'Stripe did not return a checkout URL');
	throw redirect(303, session.url);
};

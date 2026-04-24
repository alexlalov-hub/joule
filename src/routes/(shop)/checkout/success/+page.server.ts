import { redirect } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageServerLoad } from './$types';
import { getStripe } from '$lib/server/stripe';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';

/**
 * Reconciles the order on the success page so the cart clears and the order
 * flips to `paid` even when the webhook isn't configured (e.g. local dev
 * without `stripe listen`). Idempotent — the webhook can run after this and
 * the second update is a no-op.
 */
export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const sessionId = url.searchParams.get('session_id');
	if (!sessionId) return { order: null };

	try {
		const stripe = getStripe();
		const session = await stripe.checkout.sessions.retrieve(sessionId);
		const orderId = session.metadata?.order_id ?? null;
		const paid = session.payment_status === 'paid';

		if (paid && orderId) {
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

		return {
			order: {
				id: orderId,
				total: session.amount_total ?? 0,
				currency: (session.currency ?? 'eur').toUpperCase(),
				paid
			}
		};
	} catch {
		return { order: null };
	}
};

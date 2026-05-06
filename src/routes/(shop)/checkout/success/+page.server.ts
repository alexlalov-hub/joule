import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getStripe } from '$lib/server/stripe';

/**
 * Display-only — `/checkout/reconcile` already marked the order paid and
 * cleared the cart before this load runs.
 */
export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const sessionId = url.searchParams.get('session_id');
	if (!sessionId) return { order: null };

	try {
		const stripe = getStripe();
		const session = await stripe.checkout.sessions.retrieve(sessionId);
		return {
			order: {
				id: session.metadata?.order_id ?? null,
				total: session.amount_total ?? 0,
				currency: (session.currency ?? 'eur').toUpperCase(),
				paid: session.payment_status === 'paid'
			}
		};
	} catch {
		return { order: null };
	}
};

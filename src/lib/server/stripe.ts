import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
	if (cached) return cached;
	const key = env.STRIPE_SECRET_KEY;
	if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
	cached = new Stripe(key);
	return cached;
}

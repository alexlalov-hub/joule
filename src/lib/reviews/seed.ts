/**
 * Deterministic synthetic reviews used as a fallback when no Supabase client
 * is configured (local dev without env, CI). Production usage is gated on
 * locals.supabase being non-null in `src/lib/server/reviews.ts`.
 */
import type { Review, ReviewAspect } from './types';

type Template = {
	rating: number;
	aspect: ReviewAspect;
	title: string;
	body: string;
	author: string;
};

const TEMPLATES: Template[] = [
	{
		rating: 5,
		aspect: 'overall',
		title: 'Lives up to the description',
		body: 'I held off ordering for weeks reading reviews elsewhere. The {name} matched everything Joule wrote in the listing — no nasty surprises out of the box.',
		author: 'Anonymous'
	},
	{
		rating: 4,
		aspect: 'build',
		title: 'Solid where it matters',
		body: 'Materials feel premium, fit and finish is what you expect. Knocking a star because the packaging was a bit overdone.',
		author: 'Anonymous'
	},
	{
		rating: 5,
		aspect: 'performance',
		title: 'Fast, quiet, predictable',
		body: 'Replaced an older model and the difference is obvious within an hour of use. Handles everything I throw at it without breaking a sweat.',
		author: 'Anonymous'
	},
	{
		rating: 4,
		aspect: 'value',
		title: 'Worth what they ask',
		body: 'Not the cheapest option in the category, but the cheaper ones I tried last year ended up replaced within months. This feels like the right balance.',
		author: 'Anonymous'
	}
];

function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
	return Math.abs(h);
}

export function seedReviews(productSlug: string, productName = ''): Review[] {
	const seed = hashString(productSlug);
	return TEMPLATES.map((t, i) => ({
		id: `seed-${productSlug}-${i}`,
		productSlug,
		userId: null,
		authorName: t.author,
		rating: t.rating,
		aspect: t.aspect,
		title: t.title,
		body: t.body.replaceAll('{name}', productName || productSlug),
		createdAt: new Date(Date.now() - ((seed + i * 17) % 90) * 86400000).toISOString()
	}));
}

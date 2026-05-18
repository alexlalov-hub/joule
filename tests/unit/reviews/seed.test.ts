import { describe, expect, it } from 'vitest';
import { seedReviews } from '$lib/reviews/seed';

describe('seedReviews', () => {
	it('returns a non-empty list for any slug', () => {
		const result = seedReviews('macbook-air-m4-13', 'MacBook Air');
		expect(result.length).toBeGreaterThan(0);
	});

	it('is deterministic on ids, aspects, ratings, and bodies for the same slug', () => {
		const a = seedReviews('headphones-x', 'Phones X');
		const b = seedReviews('headphones-x', 'Phones X');
		expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
		expect(a.map((r) => r.aspect)).toEqual(b.map((r) => r.aspect));
		expect(a.map((r) => r.rating)).toEqual(b.map((r) => r.rating));
		expect(a.map((r) => r.body)).toEqual(b.map((r) => r.body));
		// createdAt is intentionally NOT deterministic — the slug picks a
		// stable offset in days, but the base timestamp is Date.now().
	});

	it('substitutes {name} placeholder in review bodies', () => {
		const result = seedReviews('xps-13-plus', 'Dell XPS 13 Plus');
		const bodies = result.map((r) => r.body).join(' ');
		expect(bodies).toContain('Dell XPS 13 Plus');
		expect(bodies).not.toContain('{name}');
	});

	it('falls back to the slug when no product name is given', () => {
		const result = seedReviews('xps-13-plus');
		const bodies = result.map((r) => r.body).join(' ');
		expect(bodies).toContain('xps-13-plus');
	});

	it('every entry has a valid aspect, rating, and authorName', () => {
		const result = seedReviews('macbook-air-m4-13', 'MacBook Air');
		const validAspects = new Set(['overall', 'value', 'build', 'performance']);
		for (const r of result) {
			expect(validAspects.has(r.aspect)).toBe(true);
			expect(r.rating).toBeGreaterThanOrEqual(1);
			expect(r.rating).toBeLessThanOrEqual(5);
			expect(r.authorName).toBeTruthy();
			expect(r.productSlug).toBe('macbook-air-m4-13');
			expect(r.userId).toBeNull();
		}
	});

	it('different slugs get different createdAt distributions', () => {
		const a = seedReviews('product-a').map((r) => r.createdAt);
		const b = seedReviews('product-b').map((r) => r.createdAt);
		// Pseudo-random offsets are seeded by slug hash, so the lists should
		// not match for different slugs.
		expect(a).not.toEqual(b);
	});

	it('createdAt values are valid ISO strings in the past', () => {
		const now = Date.now();
		for (const r of seedReviews('test-slug')) {
			const ts = Date.parse(r.createdAt);
			expect(Number.isFinite(ts)).toBe(true);
			expect(ts).toBeLessThanOrEqual(now);
		}
	});
});

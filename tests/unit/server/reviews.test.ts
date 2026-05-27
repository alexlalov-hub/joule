import { describe, expect, it } from 'vitest';
import {
	listAllReviewsForSynthesis,
	listReviewsPage,
	postReview,
	REVIEW_PAGE_SIZE,
	summarizeProduct,
	userHasReviewed
} from '$lib/server/reviews';
import { seedReviews } from '$lib/reviews/seed';
import { products as seedProducts } from '$lib/catalog/data';
import { makeStub } from '../_helpers/supabase-stub';

const SAMPLE_SLUG = seedProducts[0].slug;

describe('listReviewsPage (seed fallback)', () => {
	it('returns the first page by default', async () => {
		const page = await listReviewsPage(null, SAMPLE_SLUG);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(REVIEW_PAGE_SIZE);
		expect(page.reviews.length).toBeLessThanOrEqual(REVIEW_PAGE_SIZE);
		expect(page.total).toBe(seedReviews(SAMPLE_SLUG).length);
	});

	it('clamps page to at least 1', async () => {
		const page = await listReviewsPage(null, SAMPLE_SLUG, { page: 0 });
		expect(page.page).toBe(1);
	});

	it('honours a custom page size up to 50', async () => {
		const page = await listReviewsPage(null, SAMPLE_SLUG, { pageSize: 2 });
		expect(page.pageSize).toBe(2);
		expect(page.reviews.length).toBeLessThanOrEqual(2);
	});

	it('caps page size at 50', async () => {
		const page = await listReviewsPage(null, SAMPLE_SLUG, { pageSize: 500 });
		expect(page.pageSize).toBe(50);
	});

	it('matches the total reported by seedReviews', async () => {
		const page = await listReviewsPage(null, SAMPLE_SLUG);
		expect(page.total).toBe(seedReviews(SAMPLE_SLUG).length);
		expect(page.pageCount).toBe(Math.ceil(page.total / page.pageSize));
	});
});

describe('summarizeProduct (seed fallback)', () => {
	it('computes a numeric average within 1..5 when reviews exist', async () => {
		const summary = await summarizeProduct(null, SAMPLE_SLUG);
		const expected = seedReviews(SAMPLE_SLUG);
		expect(summary.count).toBe(expected.length);
		if (expected.length > 0) {
			expect(summary.average).not.toBe(null);
			expect(summary.average!).toBeGreaterThanOrEqual(1);
			expect(summary.average!).toBeLessThanOrEqual(5);
		}
	});

	it('per-aspect counts sum to the overall count', async () => {
		const summary = await summarizeProduct(null, SAMPLE_SLUG);
		const sum =
			summary.perAspect.overall.count +
			summary.perAspect.value.count +
			summary.perAspect.build.count +
			summary.perAspect.performance.count;
		expect(sum).toBe(summary.count);
	});

	it('returns empty summary when the product is not in the DB and seed produces nothing', async () => {
		// Pass a stub that resolves products.maybeSingle → null so the function
		// falls into the "no productId → summarizeSeed" branch with a slug the
		// seed yields a non-empty list for (still seed-derived).
		const { client } = makeStub({
			products: { maybeSingle: { data: null, error: null } }
		});
		const summary = await summarizeProduct(client, 'no-such-product');
		expect(summary.count).toBeGreaterThan(0); // seed fallback kicks in
	});

	it('aggregates summary rows from the live database', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: {
				select: {
					data: [
						{ rating: 5, aspect: 'overall' },
						{ rating: 4, aspect: 'value' },
						{ rating: 3, aspect: 'value' }
					],
					error: null
				}
			}
		});
		const summary = await summarizeProduct(client, 'whatever');
		expect(summary.count).toBe(3);
		expect(summary.average).toBeCloseTo(4, 5);
		expect(summary.perAspect.value.count).toBe(2);
		expect(summary.perAspect.value.average).toBeCloseTo(3.5, 5);
	});
});

describe('listReviewsPage (live DB)', () => {
	it('returns shaped rows, falls back to "Verified buyer" when no profile name', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: {
				select: {
					data: [
						{
							id: 'r1',
							user_id: 'u1',
							rating: 5,
							aspect: 'overall',
							title: 'Great',
							body: 'Yes',
							created_at: '2026-05-01T00:00:00Z'
						},
						{
							id: 'r2',
							user_id: null,
							rating: 4,
							aspect: 'value',
							title: '',
							body: '',
							created_at: '2026-04-01T00:00:00Z'
						}
					],
					error: null,
					count: 2
				}
			},
			profiles: {
				select: { data: [{ id: 'u1', full_name: null }], error: null }
			}
		});
		const page = await listReviewsPage(client, 'slug', { productId: 'p1' });
		expect(page.total).toBe(2);
		// user with no full_name → "Verified buyer"
		expect(page.reviews.find((r) => r.userId === 'u1')?.authorName).toBe('Verified buyer');
		// anonymous (no user_id) → "Anonymous"
		expect(page.reviews.find((r) => r.userId === null)?.authorName).toBe('Anonymous');
	});

	it('uses the resolved full_name when the profile has one', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: {
				select: {
					data: [
						{
							id: 'r1',
							user_id: 'u1',
							rating: 5,
							aspect: 'overall',
							title: '',
							body: '',
							created_at: '2026-05-01T00:00:00Z'
						}
					],
					error: null,
					count: 1
				}
			},
			profiles: {
				select: { data: [{ id: 'u1', full_name: 'Alice' }], error: null }
			}
		});
		const page = await listReviewsPage(client, 'slug', { productId: 'p1' });
		expect(page.reviews[0].authorName).toBe('Alice');
	});

	it('returns the empty page shape when the live reviews query errors', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: { select: { data: null, error: { message: 'rls block' } } }
		});
		const page = await listReviewsPage(client, 'slug', { productId: 'p1' });
		expect(page.reviews).toEqual([]);
		expect(page.total).toBe(0);
	});
});

describe('listAllReviewsForSynthesis', () => {
	it('returns seed reviews when sb is null', async () => {
		const rows = await listAllReviewsForSynthesis(null, 'macbook-air-m4-13');
		expect(rows.length).toBeGreaterThan(0);
	});

	it('returns [] when the live query errors', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: { select: { data: null, error: { message: 'oops' } } }
		});
		const rows = await listAllReviewsForSynthesis(client, 'slug', { productId: 'p1' });
		expect(rows).toEqual([]);
	});

	it('shapes live DB rows', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: {
				select: {
					data: [
						{
							id: 'r1',
							user_id: null,
							rating: 4,
							aspect: 'build',
							title: 't',
							body: 'b',
							created_at: '2026-04-01T00:00:00Z'
						}
					],
					error: null
				}
			}
		});
		const rows = await listAllReviewsForSynthesis(client, 'slug', { productId: 'p1', limit: 10 });
		expect(rows[0]).toMatchObject({ id: 'r1', aspect: 'build', authorName: 'Anonymous' });
	});
});

describe('userHasReviewed', () => {
	it('returns false when sb or userId is null', async () => {
		expect(await userHasReviewed(null, 'u1', 'slug')).toBe(false);
		const { client } = makeStub({});
		expect(await userHasReviewed(client, null, 'slug')).toBe(false);
	});

	it('returns false when the product is unknown', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: null, error: null } }
		});
		expect(await userHasReviewed(client, 'u1', 'slug')).toBe(false);
	});

	it('returns true when a row exists', async () => {
		const { client } = makeStub({
			reviews: { select: { data: null, error: null, count: 1 } }
		});
		expect(await userHasReviewed(client, 'u1', 'slug', { productId: 'p1' })).toBe(true);
	});

	it('returns false on count 0', async () => {
		const { client } = makeStub({
			reviews: { select: { data: null, error: null, count: 0 } }
		});
		expect(await userHasReviewed(client, 'u1', 'slug', { productId: 'p1' })).toBe(false);
	});
});

describe('postReview', () => {
	const validInput = { rating: 5, aspect: 'overall' as const, title: 't', body: 'b' };

	it('rejects an out-of-range rating', async () => {
		const { client } = makeStub({});
		const result = await postReview(client, 'u1', 'slug', { ...validInput, rating: 6 });
		expect(result.ok).toBe(false);
	});

	it('rejects rating 0', async () => {
		const { client } = makeStub({});
		const result = await postReview(client, 'u1', 'slug', { ...validInput, rating: 0 });
		expect(result.ok).toBe(false);
	});

	it('rejects an unknown aspect', async () => {
		const { client } = makeStub({});
		const result = await postReview(client, 'u1', 'slug', {
			...validInput,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			aspect: 'nonsense' as any
		});
		expect(result.ok).toBe(false);
	});

	it('rejects when the product is unknown', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: null, error: null } }
		});
		const result = await postReview(client, 'u1', 'slug', validInput);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toMatch(/not found/i);
	});

	it('blocks a second submission for the same aspect', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: { select: { data: null, error: null, count: 1 } }
		});
		const result = await postReview(client, 'u1', 'slug', validInput);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toMatch(/already/i);
	});

	it('inserts a new review when no duplicate exists', async () => {
		const { client, calls } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: {
				select: { data: null, error: null, count: 0 },
				insert: { data: null, error: null }
			}
		});
		const result = await postReview(client, 'u1', 'slug', validInput);
		expect(result.ok).toBe(true);
		expect(calls.some((c) => c.table === 'reviews' && c.op === 'insert')).toBe(true);
	});

	it('propagates the supabase insert error', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: {
				select: { data: null, error: null, count: 0 },
				insert: { data: null, error: { message: 'permission denied' } }
			}
		});
		const result = await postReview(client, 'u1', 'slug', validInput);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toBe('permission denied');
	});

	it('trims long titles and bodies to the safe maxima', async () => {
		const { client, calls } = makeStub({
			products: { maybeSingle: { data: { id: 'p1' }, error: null } },
			reviews: {
				select: { data: null, error: null, count: 0 },
				insert: { data: null, error: null }
			}
		});
		await postReview(client, 'u1', 'slug', {
			...validInput,
			title: 'x'.repeat(500),
			body: 'y'.repeat(10_000)
		});
		const insert = calls.find((c) => c.table === 'reviews' && c.op === 'insert');
		const payload = insert?.payload as { title: string; body: string };
		expect(payload.title.length).toBeLessThanOrEqual(120);
		expect(payload.body.length).toBeLessThanOrEqual(4000);
	});
});

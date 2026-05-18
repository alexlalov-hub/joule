import { describe, expect, it } from 'vitest';
import { listReviewsPage, summarizeProduct, REVIEW_PAGE_SIZE } from '$lib/server/reviews';
import { seedReviews } from '$lib/reviews/seed';
import { products as seedProducts } from '$lib/catalog/data';

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
});

import { describe, expect, it } from 'vitest';
import {
	ASPECT_LABELS,
	REVIEW_ASPECTS,
	isAspect,
	summarize,
	type Review
} from '$lib/reviews/types';

describe('isAspect', () => {
	it('accepts each of the four enum values', () => {
		for (const a of REVIEW_ASPECTS) {
			expect(isAspect(a)).toBe(true);
		}
	});

	it('rejects unknown strings', () => {
		expect(isAspect('nonsense')).toBe(false);
		expect(isAspect('')).toBe(false);
	});
});

describe('ASPECT_LABELS', () => {
	it('has a label for every aspect', () => {
		for (const a of REVIEW_ASPECTS) {
			expect(typeof ASPECT_LABELS[a]).toBe('string');
			expect(ASPECT_LABELS[a].length).toBeGreaterThan(0);
		}
	});
});

describe('summarize', () => {
	function r(rating: number, aspect: Review['aspect']): Review {
		return {
			id: 'r' + rating + aspect,
			productSlug: 'x',
			userId: null,
			authorName: 'A',
			rating,
			aspect,
			title: '',
			body: '',
			createdAt: '2026-01-01T00:00:00Z'
		};
	}

	it('returns an empty summary for no reviews', () => {
		const out = summarize([]);
		expect(out.count).toBe(0);
		expect(out.average).toBeNull();
		expect(out.perAspect.overall.count).toBe(0);
	});

	it('aggregates count, overall average, and per-aspect averages', () => {
		const reviews = [r(5, 'overall'), r(4, 'value'), r(3, 'value'), r(2, 'build')];
		const out = summarize(reviews);
		expect(out.count).toBe(4);
		expect(out.average).toBeCloseTo(3.5, 5);
		expect(out.perAspect.value.count).toBe(2);
		expect(out.perAspect.value.average).toBeCloseTo(3.5, 5);
		expect(out.perAspect.overall.count).toBe(1);
		expect(out.perAspect.overall.average).toBe(5);
		expect(out.perAspect.performance.count).toBe(0);
		expect(out.perAspect.performance.average).toBeNull();
	});
});

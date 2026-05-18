import { describe, expect, it } from 'vitest';
import { reasonText, type Reason } from '$lib/recommendations/types';

const base = { anchorSlug: 'macbook-air-m4-13', anchorName: 'MacBook Air', category: 'laptops' };

describe('reasonText', () => {
	it('renders the bought variant', () => {
		const r: Reason = { kind: 'bought', ...base };
		expect(reasonText(r)).toBe('Because you bought MacBook Air');
	});

	it('renders the saved variant', () => {
		const r: Reason = { kind: 'saved', ...base };
		expect(reasonText(r)).toContain('saved');
		expect(reasonText(r)).toContain('MacBook Air');
	});

	it('renders the similar variant', () => {
		const r: Reason = { kind: 'similar', ...base, similarity: 0.82 };
		expect(reasonText(r)).toContain('Similar to your MacBook Air');
	});

	it('renders the same_brand variant with the brand label', () => {
		const r: Reason = { kind: 'same_brand', ...base, brand: 'Apple' };
		expect(reasonText(r)).toContain('Apple');
		expect(reasonText(r)).toContain('MacBook Air');
	});

	it('falls back to a generic "Same brand" prefix when no brand is set', () => {
		const r: Reason = { kind: 'same_brand', ...base };
		expect(reasonText(r)).toContain('Same brand');
	});
});

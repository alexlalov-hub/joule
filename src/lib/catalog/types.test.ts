import { describe, it, expect } from 'vitest';
import { formatPrice } from './types';

describe('formatPrice', () => {
	it('formats euro cents using en-IE locale', () => {
		expect(formatPrice(129900)).toBe('€1,299.00');
	});

	it('handles zero', () => {
		expect(formatPrice(0)).toBe('€0.00');
	});

	it('respects an alternate currency', () => {
		expect(formatPrice(50000, 'USD')).toContain('500');
	});
});

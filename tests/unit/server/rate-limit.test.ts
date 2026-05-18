import { afterEach, describe, expect, it, vi } from 'vitest';
import { rateLimit, clearRateLimits } from '$lib/server/rate-limit';

describe('rateLimit', () => {
	afterEach(() => {
		clearRateLimits();
		vi.useRealTimers();
	});

	it('admits requests up to the cap', () => {
		for (let i = 0; i < 5; i++) {
			expect(rateLimit('k', { windowMs: 60_000, max: 5 }).ok).toBe(true);
		}
	});

	it('rejects once the cap is hit', () => {
		for (let i = 0; i < 5; i++) rateLimit('k', { windowMs: 60_000, max: 5 });
		const sixth = rateLimit('k', { windowMs: 60_000, max: 5 });
		expect(sixth.ok).toBe(false);
		if (!sixth.ok) expect(sixth.retryAfterSec).toBeGreaterThan(0);
	});

	it('frees up slots once the window has elapsed', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
		for (let i = 0; i < 5; i++) rateLimit('k', { windowMs: 1000, max: 5 });
		expect(rateLimit('k', { windowMs: 1000, max: 5 }).ok).toBe(false);

		vi.setSystemTime(new Date('2026-01-01T00:00:02Z'));
		expect(rateLimit('k', { windowMs: 1000, max: 5 }).ok).toBe(true);
	});

	it('isolates keys', () => {
		for (let i = 0; i < 5; i++) rateLimit('a', { windowMs: 60_000, max: 5 });
		expect(rateLimit('a', { windowMs: 60_000, max: 5 }).ok).toBe(false);
		expect(rateLimit('b', { windowMs: 60_000, max: 5 }).ok).toBe(true);
	});
});

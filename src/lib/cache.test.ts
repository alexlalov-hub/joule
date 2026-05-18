import { afterEach, describe, expect, it, vi } from 'vitest';
import { memo, clearCache } from './cache';

describe('memo', () => {
	afterEach(() => {
		clearCache();
		vi.useRealTimers();
	});

	it('returns the same cached value within the TTL', async () => {
		const fn = vi.fn(async () => Math.random());
		const a = await memo('k', 60, fn);
		const b = await memo('k', 60, fn);
		expect(a).toBe(b);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('re-fetches after the TTL elapses', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
		const fn = vi.fn(async () => Math.random());
		const a = await memo('k', 1, fn);
		vi.setSystemTime(new Date('2026-01-01T00:00:02Z'));
		const b = await memo('k', 1, fn);
		expect(a).not.toBe(b);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('coalesces concurrent callers for the same key onto a single fetch', async () => {
		let resolve: (v: number) => void;
		const fn = vi.fn(
			() =>
				new Promise<number>((r) => {
					resolve = r;
				})
		);
		const p1 = memo('k', 60, fn);
		const p2 = memo('k', 60, fn);
		resolve!(42);
		const [a, b] = await Promise.all([p1, p2]);
		expect(a).toBe(42);
		expect(b).toBe(42);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('isolates keys', async () => {
		const fn = vi.fn(async (n: number) => n * 2);
		const a = await memo('a', 60, () => fn(1));
		const b = await memo('b', 60, () => fn(2));
		expect(a).toBe(2);
		expect(b).toBe(4);
		expect(fn).toHaveBeenCalledTimes(2);
	});
});

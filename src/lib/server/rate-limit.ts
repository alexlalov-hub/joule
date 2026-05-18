/**
 * Per-instance sliding-window rate limiter, keyed by an arbitrary string
 * (typically `ip:scope`). Holds the timestamps of recent calls in memory and
 * drops anything older than the window.
 *
 * Limitations:
 *  - Per-instance only — each Vercel function gets its own state, so a burst
 *    across many cold-started instances can still slip past. For production
 *    rate-limiting against determined abuse, swap in Vercel Edge Config or
 *    Upstash Redis. This is enough to stop a single attacker from a single
 *    IP, which is the common case for cost-runaway on AI endpoints.
 *  - No eviction; the Map grows unbounded if many distinct keys hit the
 *    instance. Acceptable for short-lived serverless functions.
 *
 * Returns { ok: true } when the request is within budget, or
 * { ok: false, retryAfterSec } when it should be rejected.
 */

const buckets = new Map<string, number[]>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function rateLimit(
	key: string,
	options: { windowMs: number; max: number }
): RateLimitResult {
	const now = Date.now();
	const cutoff = now - options.windowMs;
	const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff);

	if (recent.length >= options.max) {
		const oldest = recent[0];
		const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
		buckets.set(key, recent);
		return { ok: false, retryAfterSec };
	}

	recent.push(now);
	buckets.set(key, recent);
	return { ok: true };
}

/** Drop all buckets. Test-only. */
export function clearRateLimits(): void {
	buckets.clear();
}

/**
 * Tiny per-instance memo cache. Holds the result of a function call for a
 * fixed TTL keyed by an arbitrary string. Designed for catalog reads where
 * the answer is identical for every visitor and changes infrequently —
 * trading cache freshness (≤ TTL seconds) for fewer Supabase round-trips.
 *
 * Concurrent callers for the same key coalesce onto a single fetch, so a
 * burst of identical category-page renders only triggers one DB query.
 *
 * Limitations: per-instance only (each Vercel function gets its own map),
 * no LRU eviction (we only cache a small fixed set of keys), and the cache
 * survives only as long as the instance is warm.
 */
type Entry<T> = { value: T; expiresAt: number };

const resolved = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function memo<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const hit = resolved.get(key) as Entry<T> | undefined;
	if (hit && hit.expiresAt > now) return Promise.resolve(hit.value);

	const existing = inflight.get(key) as Promise<T> | undefined;
	if (existing) return existing;

	const promise = fn()
		.then((value) => {
			resolved.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
			return value;
		})
		.finally(() => {
			inflight.delete(key);
		});
	inflight.set(key, promise);
	return promise;
}

/** Clear the entire cache. Used by tests; do not call in production paths. */
export function clearCache(): void {
	resolved.clear();
	inflight.clear();
}

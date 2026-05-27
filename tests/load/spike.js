/**
 * k6 spike test — the "hug-of-death" scenario. A normal trickle of users
 * suddenly gets joined by 50 more arriving over 10 seconds, holds for
 * 30 seconds, then drops back to normal.
 *
 * What this catches that sustained.js doesn't:
 *   - Serverless cold-start cascade: Vercel boots ~10 new function
 *     instances at once, each one paying the full cold-start tax.
 *     During the spike you should see latency briefly explode then
 *     recover as instances warm up.
 *   - Connection-pool saturation: Supabase's free tier allows ~60
 *     concurrent Postgres connections. 50 VUs all firing at once can
 *     get close to that ceiling, particularly if a request holds the
 *     connection while waiting on a slow query.
 *   - Cache stampede: when the first hit on a cold cache fans out to
 *     50 simultaneous misses, the upstream (Supabase) has to serve all
 *     50 instead of the one a properly-debounced cache would issue.
 *     Watching p99 vs. p50 during the spike says how bad this is.
 *
 * Thresholds are looser than sustained — the whole point is "the system
 * doesn't fall over," not "everyone gets sub-second responses." We do
 * still require it to RECOVER, hence the post-spike phase.
 *
 * Run:  k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/spike.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:5173';

export const options = {
	stages: [
		{ duration: '15s', target: 2 }, // baseline trickle
		{ duration: '10s', target: 50 }, // SPIKE: 50 users in 10s
		{ duration: '30s', target: 50 }, // hold the spike
		{ duration: '10s', target: 2 }, // drop back to baseline
		{ duration: '20s', target: 2 } // recovery phase
	],
	thresholds: {
		// At peak, some failures are tolerated; the system must not be
		// completely down. < 5% across the whole run is the bar.
		http_req_failed: ['rate<0.05'],

		// Latency under spike: p95 < 8s is loose on purpose — the goal is
		// "no requests time out", not "everything stays fast." p99 < 15s
		// catches the case where some requests block on cold starts.
		http_req_duration: ['p(95)<8000', 'p(99)<15000'],

		// Recovery check: by the last 20 seconds (the recovery phase),
		// latency should be back to normal. This is the "did the system
		// actually recover" assertion.
		'http_req_duration{phase:recovery}': ['p(95)<3000']
	}
};

// A small, hot set — during a spike we hammer the same few routes a
// real traffic spike would (e.g. a product going viral).
const ROUTES = ['/', '/product/macbook-air-m4-13', '/product/sony-wh-1000xm6', '/category/laptops'];

export default function () {
	// Tag the last 20s separately so we can assert recovery.
	const elapsed = Date.now() - startTime;
	const phase = elapsed > 65_000 ? 'recovery' : 'spike';

	const path = ROUTES[Math.floor(Math.random() * ROUTES.length)];
	const res = http.get(`${BASE}${path}`, {
		tags: { phase, route: path },
		headers: { 'User-Agent': 'k6-spike/1.0' }
	});
	check(res, { 'status is 2xx': (r) => r.status >= 200 && r.status < 300 });

	// Aggressive — spike traffic doesn't think, it clicks.
	sleep(0.2 + Math.random() * 0.5);
}

// VU-init timing so the `phase` tag can split spike-vs-recovery.
const startTime = Date.now();

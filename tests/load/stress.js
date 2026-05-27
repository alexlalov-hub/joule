/**
 * k6 stress test — pushes VU count higher and higher to find the
 * capacity ceiling. NOT run in CI; this is for ad-hoc "how much can the
 * current Vercel + Supabase setup actually take?" investigations.
 *
 * Stages climb in steps so the result tells you exactly where the
 * thresholds break:
 *
 *   0   →  10 VUs over 30s   — sanity baseline
 *   10  →  30 VUs over 1m    — comfortable
 *   30  →  50 VUs over 1m    — getting busy
 *   50  →  80 VUs over 1m    — pushing
 *   80 → 120 VUs over 1m    — likely above the ceiling
 *   120 →  0 VUs over 30s    — drain
 *
 * The thresholds are intentionally STRICT — we want the run to "fail"
 * when the system can no longer keep up, because that failure points
 * to the capacity ceiling. Look at which stage failed and at what VU
 * count the latency curve breaks.
 *
 * WARNING:
 *   - Don't run this against production during business hours. Use a
 *     preview deployment, or schedule it for a quiet window.
 *   - This can rack up Vercel function invocation costs on paid plans.
 *     Roughly 50,000 requests in a full run. The hobby plan has free
 *     headroom; check your dashboard if running on Pro.
 *   - Supabase free tier hard-limits at 60 concurrent connections; this
 *     will hit that limit, you will see connection-pool errors, that is
 *     the point.
 *
 * Run:  k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/stress.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:5173';

export const options = {
	stages: [
		{ duration: '30s', target: 10 },
		{ duration: '1m', target: 30 },
		{ duration: '1m', target: 50 },
		{ duration: '1m', target: 80 },
		{ duration: '1m', target: 120 },
		{ duration: '30s', target: 0 }
	],
	thresholds: {
		// Strict on purpose — when these break, you've found the ceiling.
		http_req_failed: ['rate<0.05'],
		http_req_duration: ['p(95)<5000'],

		// Track per-stage so the report shows where the system started
		// to break. abortOnFail keeps the run going so we get the full
		// climb in the output rather than stopping at the first failure.
		'http_req_duration{stage:baseline}': [{ threshold: 'p(95)<1500', abortOnFail: false }],
		'http_req_duration{stage:comfortable}': [{ threshold: 'p(95)<2000', abortOnFail: false }],
		'http_req_duration{stage:busy}': [{ threshold: 'p(95)<3000', abortOnFail: false }],
		'http_req_duration{stage:pushing}': [{ threshold: 'p(95)<4500', abortOnFail: false }],
		'http_req_duration{stage:ceiling}': [{ threshold: 'p(95)<8000', abortOnFail: false }]
	}
};

const ROUTES = [
	'/',
	'/categories',
	'/category/laptops',
	'/category/headphones',
	'/product/macbook-air-m4-13',
	'/product/sony-wh-1000xm6',
	'/search?q=laptop'
];

// Approximate elapsed → stage label. Updates when stages change above.
function currentStage(elapsedMs) {
	if (elapsedMs < 30_000) return 'baseline';
	if (elapsedMs < 90_000) return 'comfortable';
	if (elapsedMs < 150_000) return 'busy';
	if (elapsedMs < 210_000) return 'pushing';
	if (elapsedMs < 270_000) return 'ceiling';
	return 'drain';
}

const startTime = Date.now();

export default function () {
	const stage = currentStage(Date.now() - startTime);
	const path = ROUTES[Math.floor(Math.random() * ROUTES.length)];
	const res = http.get(`${BASE}${path}`, {
		tags: { stage, route: path },
		headers: { 'User-Agent': 'k6-stress/1.0' }
	});
	check(res, { 'status is 2xx': (r) => r.status >= 200 && r.status < 300 });
	sleep(Math.random() * 1 + 0.2);
}

/**
 * k6 sustained load — ramps from 0 → 20 → 0 virtual users over 3 minutes,
 * hitting the read-only catalog routes. Designed to expose:
 *   - p95 latency under load
 *   - Supabase connection-pool exhaustion
 *   - cache-hit-rate behaviour on /lib/cache.ts (1-minute TTL means warm
 *     instances should see almost all hits served from memory)
 *
 * Deliberately avoids the AI endpoints (they're rate-limited at 20/5min,
 * so any load test against them would just bounce off 429s).
 *
 * Run:  k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/sustained.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:5173';

export const options = {
	stages: [
		{ duration: '30s', target: 5 }, // warm-up
		{ duration: '1m', target: 20 }, // ramp
		{ duration: '1m', target: 20 }, // hold
		{ duration: '30s', target: 0 } // ramp down
	],
	thresholds: {
		http_req_failed: ['rate<0.02'],
		http_req_duration: ['p(95)<3000', 'p(99)<6000']
	}
};

const READ_ROUTES = [
	'/',
	'/categories',
	'/category/laptops',
	'/category/headphones',
	'/category/smartphones',
	'/category/keyboards',
	'/product/macbook-air-m4-13',
	'/product/sony-wh-1000xm6',
	'/product/iphone-17-pro',
	'/search?q=laptop',
	'/search?q=headphones',
	'/compare?slugs=macbook-air-m4-13,xps-13-plus'
];

export default function () {
	const path = READ_ROUTES[Math.floor(Math.random() * READ_ROUTES.length)];
	const res = http.get(`${BASE}${path}`);
	check(res, {
		'status is 200': (r) => r.status === 200
	});
	// Think-time: real users don't fire a request every 100ms.
	sleep(Math.random() * 2 + 0.5);
}

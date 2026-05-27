/**
 * k6 sustained load — ramps from 0 → 20 → 0 virtual users over 3 minutes,
 * hitting the read-only catalog routes with realistic think-time. Designed
 * to expose:
 *   - p95 / p99 latency under load.
 *   - Supabase connection-pool exhaustion (Postgres maxes at 60 by default
 *     on the Supabase free tier; 20 concurrent VUs leave plenty of headroom
 *     but a leak would show up as climbing latency over the hold phase).
 *   - Cache-hit-rate behaviour on `src/lib/cache.ts` — the 1-minute TTL
 *     means warm instances should serve most hits from memory; you can see
 *     this in the run as latency dropping over the first 30s as caches fill.
 *
 * Routes are weighted (popular pages hit more often) so the test traffic
 * roughly matches what real users do.
 *
 * Deliberately avoids the AI endpoints — they're rate-limited at 20/5min
 * per IP, so any load test against them would just bounce off 429s.
 *
 * Run:  k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/sustained.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:5173';

export const options = {
	stages: [
		{ duration: '30s', target: 5 }, // warm-up — fills caches
		{ duration: '1m', target: 20 }, // ramp — load climbs
		{ duration: '1m', target: 20 }, // hold — steady-state measurement window
		{ duration: '30s', target: 0 } // ramp down — cooldown
	],
	thresholds: {
		http_req_failed: ['rate<0.02'],
		http_req_duration: ['p(95)<3000', 'p(99)<6000'],

		// Per-route thresholds — fail the run if a specific page degrades,
		// not just the aggregate. Compare pages do extra joins so they're
		// allowed a bit more headroom than a simple category list.
		'http_req_duration{route:catalog}': ['p(95)<2500'],
		'http_req_duration{route:product}': ['p(95)<3000'],
		'http_req_duration{route:search}': ['p(95)<3500'],
		'http_req_duration{route:compare}': ['p(95)<4000']
	}
};

/**
 * Weighted route mix. `weight` is how often a route is picked relative
 * to the others. Roughly mirrors what real users do — home and category
 * pages dwarf everything else; compare is rare.
 */
const ROUTES = [
	{ path: '/', weight: 8, tag: 'catalog' },
	{ path: '/categories', weight: 4, tag: 'catalog' },
	{ path: '/category/laptops', weight: 5, tag: 'catalog' },
	{ path: '/category/headphones', weight: 4, tag: 'catalog' },
	{ path: '/category/smartphones', weight: 3, tag: 'catalog' },
	{ path: '/category/keyboards', weight: 2, tag: 'catalog' },
	{ path: '/product/macbook-air-m4-13', weight: 5, tag: 'product' },
	{ path: '/product/sony-wh-1000xm6', weight: 4, tag: 'product' },
	{ path: '/product/iphone-17-pro', weight: 3, tag: 'product' },
	{ path: '/search?q=laptop', weight: 3, tag: 'search' },
	{ path: '/search?q=headphones', weight: 2, tag: 'search' },
	{ path: '/compare?slugs=macbook-air-m4-13,xps-13-plus', weight: 1, tag: 'compare' }
];

// Pre-compute the weighted picking table once per VU init.
const WEIGHTED = (() => {
	const out = [];
	for (const r of ROUTES) for (let i = 0; i < r.weight; i++) out.push(r);
	return out;
})();

function pickRoute() {
	return WEIGHTED[Math.floor(Math.random() * WEIGHTED.length)];
}

export default function () {
	const r = pickRoute();
	group(r.tag, () => {
		const res = http.get(`${BASE}${r.path}`, {
			tags: { route: r.tag },
			headers: { 'User-Agent': 'k6-sustained/1.0' }
		});
		check(res, { 'status is 200': (resp) => resp.status === 200 });
	});
	// Think-time: a real user reads the page before clicking again.
	sleep(Math.random() * 2 + 0.5);
}

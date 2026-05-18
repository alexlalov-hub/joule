/**
 * k6 smoke test — single virtual user, ~30 seconds, hits the public hot
 * routes once. Catches "the deploy is broken" without putting any real
 * load on the system. Used by the post-deploy smoke step in CI.
 *
 * Run:  k6 run -e BASE_URL=https://joule.vercel.app tests/load/smoke.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:5173';

export const options = {
	vus: 1,
	duration: '30s',
	thresholds: {
		// Smoke: nothing should 5xx, and median page should be < 2s on a warm
		// instance. These are deliberately loose so cold starts don't trip it.
		http_req_failed: ['rate<0.01'],
		http_req_duration: ['med<2000']
	}
};

const ROUTES = [
	'/',
	'/categories',
	'/category/laptops',
	'/category/headphones',
	'/product/macbook-air-m4-13',
	'/search?q=laptop',
	'/compare?slugs=macbook-air-m4-13,xps-13-plus'
];

export default function () {
	for (const path of ROUTES) {
		const res = http.get(`${BASE}${path}`);
		check(res, {
			[`${path} → 200`]: (r) => r.status === 200,
			[`${path} → has body`]: (r) => (r.body?.length ?? 0) > 100
		});
		sleep(1);
	}
}

/**
 * k6 smoke test — single virtual user, ~30 seconds, hits every hot
 * route once. Catches "the deploy is broken" without putting any real
 * load on the system. Used by the post-deploy smoke step in CI.
 *
 * What we check per route:
 *   1. Status === 200.
 *   2. The body contains the route-specific marker string. A page that
 *      5xxs but returns Vercel's error HTML will still be over 100 bytes
 *      and used to pass the old length-only check, which is why the
 *      marker exists — it pins each check to "this is the actual page
 *      we expected, not an error placeholder."
 *
 * Groups (k6's `group()`) split the output by route so a regression
 * report can say "/product/* slowed down" instead of "things got slow."
 *
 * Run:  k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/smoke.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:5173';

export const options = {
	vus: 1,
	duration: '30s',
	thresholds: {
		// Aggregate: nothing should 5xx, and median page should be < 2s on a
		// warm instance. Loose enough that a Vercel cold start doesn't fail
		// the run on the first request.
		http_req_failed: ['rate<0.01'],
		http_req_duration: ['med<2000'],

		// Per-route status checks must all pass. Each group's checks contribute
		// to its own bucket via the `group_duration` tag, so a failing group is
		// pinpointed by name in the k6 summary.
		checks: ['rate==1.0']
	}
};

/**
 * Each entry: [route, marker]. The marker is a substring the rendered
 * HTML must contain. Markers are deliberately content-y rather than
 * structural (e.g. a brand name a category page is guaranteed to list)
 * so a layout-only regression that empties the data still fails the
 * check. Update when seed data changes.
 */
const ROUTES = [
	['/', 'Joule'],
	['/categories', 'Laptops'],
	['/category/laptops', 'MacBook'],
	['/category/headphones', 'Sony'],
	['/product/macbook-air-m4-13', 'MacBook Air'],
	['/search?q=laptop', 'laptop'],
	['/compare?slugs=macbook-air-m4-13,xps-13-plus', 'MacBook']
];

export default function () {
	for (const [path, marker] of ROUTES) {
		group(path, () => {
			const res = http.get(`${BASE}${path}`, {
				tags: { route: path },
				headers: { 'User-Agent': 'k6-smoke/1.0' }
			});
			check(res, {
				[`${path} → 200`]: (r) => r.status === 200,
				[`${path} → body contains "${marker}"`]: (r) =>
					typeof r.body === 'string' && r.body.includes(marker)
			});
		});
		sleep(1);
	}
}

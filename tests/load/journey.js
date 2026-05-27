/**
 * k6 user-journey load — each VU walks a realistic shopper flow rather
 * than picking random pages. Designed to surface bottlenecks that only
 * appear when pages are visited in the order a real visitor would, e.g.
 * a `/category/<slug>` → `/product/<slug>` hop where the second page
 * reuses session state from the first.
 *
 * Three journeys, picked at random per VU iteration:
 *
 *   1. Browse-and-bounce (most common — ~60% of real traffic):
 *        home → categories → category → bounce.
 *
 *   2. Window-shopping (~30% of real traffic):
 *        home → category → product → product → leave.
 *
 *   3. Comparison-shopping (~10% — the long tail):
 *        home → category → product → search → compare → product → leave.
 *
 * Each step has its own think-time. The journey times are tracked as
 * a single custom metric so a regression report can say "the full
 * comparison journey got 800ms slower" rather than burying the change
 * in a per-request aggregate.
 *
 * Run:  k6 run -e BASE_URL=https://joule-lilac.vercel.app tests/load/journey.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:5173';

const journeyDuration = new Trend('journey_duration', true);

export const options = {
	stages: [
		{ duration: '30s', target: 5 },
		{ duration: '1m', target: 15 }, // 15 concurrent shoppers
		{ duration: '1m', target: 15 },
		{ duration: '30s', target: 0 }
	],
	thresholds: {
		http_req_failed: ['rate<0.02'],
		http_req_duration: ['p(95)<3000'],

		// Each full journey should complete in a reasonable wall-clock window,
		// not just have fast individual requests. Think-time is included, so
		// the bar is "the journey itself feels responsive end-to-end."
		'journey_duration{journey:browse}': ['p(95)<10000'],
		'journey_duration{journey:shop}': ['p(95)<15000'],
		'journey_duration{journey:compare}': ['p(95)<25000']
	}
};

// Seeded slugs — must match the seed data.
const CATEGORIES = ['laptops', 'headphones', 'smartphones', 'keyboards'];
const PRODUCTS = [
	'macbook-air-m4-13',
	'sony-wh-1000xm6',
	'iphone-17-pro',
	'xps-13-plus',
	'apple-magic-keyboard-usb-c'
];

function pick(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function thinkShort() {
	// Scanning the page — 0.5-1.5s.
	sleep(0.5 + Math.random());
}
function thinkMedium() {
	// Reading a product description — 1.5-3.5s.
	sleep(1.5 + Math.random() * 2);
}

function get(path, tag) {
	const res = http.get(`${BASE}${path}`, {
		tags: { route: tag },
		headers: { 'User-Agent': 'k6-journey/1.0' }
	});
	check(res, { [`${tag} 200`]: (r) => r.status === 200 });
	return res;
}

/**
 * Most common journey — open the site, glance at a category, leave.
 * Two GETs + the home page.
 */
function browseAndBounce() {
	const start = Date.now();
	group('browse', () => {
		get('/', 'home');
		thinkShort();
		get('/categories', 'categories');
		thinkShort();
		get(`/category/${pick(CATEGORIES)}`, 'category');
		thinkMedium();
	});
	journeyDuration.add(Date.now() - start, { journey: 'browse' });
}

/**
 * Mid-length journey — actually looks at a couple of products.
 */
function windowShop() {
	const start = Date.now();
	group('shop', () => {
		get('/', 'home');
		thinkShort();
		get(`/category/${pick(CATEGORIES)}`, 'category');
		thinkMedium();
		get(`/product/${pick(PRODUCTS)}`, 'product');
		thinkMedium();
		get(`/product/${pick(PRODUCTS)}`, 'product');
		thinkMedium();
	});
	journeyDuration.add(Date.now() - start, { journey: 'shop' });
}

/**
 * The long-tail journey — searches, compares, decides. Exercises the
 * heaviest pages (search + compare) in a realistic order.
 */
function comparisonShop() {
	const start = Date.now();
	group('compare', () => {
		get('/', 'home');
		thinkShort();
		get(`/category/${pick(CATEGORIES)}`, 'category');
		thinkMedium();
		const p1 = pick(PRODUCTS);
		get(`/product/${p1}`, 'product');
		thinkMedium();
		get('/search?q=laptop', 'search');
		thinkShort();
		const p2 = pick(PRODUCTS.filter((p) => p !== p1));
		get(`/compare?slugs=${p1},${p2}`, 'compare');
		thinkMedium();
		get(`/product/${p2}`, 'product');
		thinkMedium();
	});
	journeyDuration.add(Date.now() - start, { journey: 'compare' });
}

export default function () {
	const r = Math.random();
	if (r < 0.6) browseAndBounce();
	else if (r < 0.9) windowShop();
	else comparisonShop();
}

/**
 * Fetch category-appropriate product photos from Unsplash and cache them.
 *
 * Output: scripts/unsplash-cache.json
 *   { "<category-slug>": [ { url, alt, photographer, link } ... ] }
 *
 * Each product will rotate through its category's pool deterministically during
 * seed. Re-running is a no-op if the cache is full — delete the cache file to
 * force a refresh.
 *
 * Requires:
 *   UNSPLASH_ACCESS_KEY  (https://unsplash.com/developers)
 *
 * Run with:  npx tsx scripts/fetch-images.ts
 */

import { config as loadEnv } from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { categories } from '../src/lib/catalog/data';

loadEnv({ path: '.env.local' });
loadEnv();

const key = process.env.UNSPLASH_ACCESS_KEY;
if (!key) {
	console.error('Missing UNSPLASH_ACCESS_KEY in environment.');
	process.exit(1);
}

// Per-category search keywords, hand-tuned to bias Unsplash toward
// recognisable product photography rather than lifestyle scenery.
const CATEGORY_QUERY: Record<string, string> = {
	laptops: 'laptop computer',
	desktops: 'desktop computer workstation',
	monitors: 'computer monitor display',
	keyboards: 'mechanical keyboard',
	mice: 'computer mouse',
	headphones: 'headphones',
	speakers: 'bluetooth speaker',
	smartphones: 'smartphone',
	tablets: 'tablet device',
	smartwatches: 'smartwatch',
	cameras: 'camera lens',
	drones: 'drone quadcopter',
	'gaming-consoles': 'gaming console controller',
	tvs: 'television screen',
	'home-audio': 'home audio speaker',
	storage: 'hard drive ssd',
	networking: 'wifi router',
	'smart-home': 'smart home device'
};

const PER_CATEGORY = 12;
const CACHE_PATH = path.join(process.cwd(), 'scripts', 'unsplash-cache.json');

type Photo = { url: string; alt: string; photographer: string; link: string };
type Cache = Record<string, Photo[]>;

async function loadCache(): Promise<Cache> {
	try {
		const raw = await fs.readFile(CACHE_PATH, 'utf8');
		return JSON.parse(raw) as Cache;
	} catch {
		return {};
	}
}

async function saveCache(cache: Cache) {
	await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
}

type UnsplashPhoto = {
	urls: { regular: string; small: string };
	alt_description: string | null;
	description: string | null;
	user: { name: string; links: { html: string } };
	links: { html: string };
};

async function search(query: string): Promise<Photo[]> {
	const url = new URL('https://api.unsplash.com/search/photos');
	url.searchParams.set('query', query);
	url.searchParams.set('per_page', String(PER_CATEGORY));
	url.searchParams.set('orientation', 'landscape');
	url.searchParams.set('content_filter', 'high');

	const res = await fetch(url, {
		headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' }
	});
	if (!res.ok) {
		throw new Error(`Unsplash ${res.status}: ${await res.text()}`);
	}
	const body = (await res.json()) as { results: UnsplashPhoto[] };
	return body.results.map((p) => ({
		url: `${p.urls.regular}&w=1200&h=900&fit=crop&q=80`,
		alt: p.alt_description ?? p.description ?? query,
		photographer: p.user.name,
		link: p.links.html
	}));
}

async function main() {
	const cache = await loadCache();
	const missing = categories.filter((c) => !cache[c.slug] || cache[c.slug].length === 0);

	if (missing.length === 0) {
		console.log(`✓ Cache already populated for all ${categories.length} categories.`);
		console.log(`  Delete ${path.relative(process.cwd(), CACHE_PATH)} to force refresh.`);
		return;
	}

	console.log(`→ Fetching photos for ${missing.length} categories…`);

	for (const cat of missing) {
		const query = CATEGORY_QUERY[cat.slug] ?? cat.name;
		process.stdout.write(`  · ${cat.slug.padEnd(18)} "${query}"… `);
		try {
			const photos = await search(query);
			cache[cat.slug] = photos;
			await saveCache(cache);
			console.log(`${photos.length} photos`);
		} catch (err) {
			console.log(`FAILED: ${(err as Error).message}`);
		}
		// Gentle throttle — stays well inside the 50/hr demo limit.
		await new Promise((r) => setTimeout(r, 400));
	}

	console.log('✓ Done.');
	console.log(`  Cache: ${path.relative(process.cwd(), CACHE_PATH)}`);
}

main().catch((err) => {
	console.error('fetch-images failed:', err);
	process.exit(1);
});

/**
 * Seed the Supabase database from src/lib/catalog/data.ts.
 *
 * Requires:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *
 * Run with:  npm run seed
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { categories, products } from '../src/lib/catalog/data';

// Load .env.local first, then .env as fallback.
loadEnv({ path: '.env.local' });
loadEnv();

type CachedPhoto = { url: string; alt: string };
type Cache = Record<string, CachedPhoto[]>;

async function loadImageCache(): Promise<Cache | null> {
	try {
		const raw = await fs.readFile(
			path.join(process.cwd(), 'scripts', 'unsplash-cache.json'),
			'utf8'
		);
		return JSON.parse(raw) as Cache;
	} catch {
		return null;
	}
}

function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
	return Math.abs(h);
}

function pickImages(
	cache: Cache | null,
	categorySlug: string,
	productSlug: string,
	count: number,
	fallback: CachedPhoto[]
): CachedPhoto[] {
	const pool = cache?.[categorySlug];
	if (!pool || pool.length === 0) return fallback;
	const offset = hashString(productSlug);
	return Array.from({ length: count }, (_, i) => pool[(offset + i) % pool.length]);
}

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.');
	process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
	const imageCache = await loadImageCache();
	console.log(
		`→ Seeding ${categories.length} categories, ${products.length} products${imageCache ? ' (Unsplash photos)' : ' (picsum fallback)'}…`
	);

	// Upsert categories.
	const categoryRows = categories.map((c, i) => ({
		slug: c.slug,
		name: c.name,
		blurb: c.blurb,
		sort_order: i
	}));
	const { data: insertedCategories, error: catErr } = await sb
		.from('categories')
		.upsert(categoryRows, { onConflict: 'slug' })
		.select('id, slug');
	if (catErr) throw catErr;
	const catBySlug = new Map(insertedCategories!.map((c) => [c.slug, c.id as string]));
	console.log(`  ✓ ${insertedCategories!.length} categories`);

	// Upsert products.
	const productRows = products.map((p) => ({
		slug: p.slug,
		name: p.name,
		brand: p.brand,
		category_id: catBySlug.get(p.categorySlug)!,
		price_cents: p.priceCents,
		tagline: p.tagline,
		description: p.description,
		specs: p.specs,
		stock_qty: p.stockQty,
		featured: !!p.featured
	}));
	const { data: insertedProducts, error: prodErr } = await sb
		.from('products')
		.upsert(productRows, { onConflict: 'slug' })
		.select('id, slug');
	if (prodErr) throw prodErr;
	console.log(`  ✓ ${insertedProducts!.length} products`);

	// Reset and insert product images.
	const productIdBySlug = new Map(insertedProducts!.map((p) => [p.slug, p.id as string]));
	const imageRows = products.flatMap((p) => {
		const chosen = pickImages(imageCache, p.categorySlug, p.slug, p.images.length, p.images);
		return chosen.map((img, i) => ({
			product_id: productIdBySlug.get(p.slug)!,
			url: img.url,
			alt: img.alt || `${p.brand} ${p.name}`,
			sort_order: i
		}));
	});
	// Wipe and re-insert for idempotency.
	const productIds = Array.from(productIdBySlug.values());
	if (productIds.length) {
		const { error: delErr } = await sb.from('product_images').delete().in('product_id', productIds);
		if (delErr) throw delErr;
	}
	const { error: imgErr } = await sb.from('product_images').insert(imageRows);
	if (imgErr) throw imgErr;
	console.log(`  ✓ ${imageRows.length} product images`);

	console.log('✓ Seed complete.');
}

main().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});

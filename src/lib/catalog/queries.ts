import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/server/db/types';
import { memo } from '$lib/cache';
import {
	categories as seedCategories,
	products as seedProducts,
	productsByCategory as seedByCategory,
	findCategory as seedFindCategory,
	findProduct as seedFindProduct
} from './data';
import type { Category, Product, ProductImage, ProductSpec } from './types';

/**
 * TTL for cached catalog reads. Catalog data changes via the seed/admin
 * scripts, not in normal traffic, so a minute of staleness is invisible to
 * the user but eliminates the bulk of repeat round-trips.
 */
const CATALOG_TTL = 60;

function filterKey(f: ProductFilters): string {
	return [
		f.category ?? '',
		f.brand ?? '',
		f.query ?? '',
		f.minPrice ?? '',
		f.maxPrice ?? '',
		f.sort ?? ''
	].join('|');
}

type SB = SupabaseClient<Database> | null;

/**
 * Catalog queries. Hit Supabase when a client is provided, otherwise fall back
 * to the in-memory seed. The fallback keeps local dev and CI working when the
 * database isn't configured.
 */

export type ProductFilters = {
	category?: string;
	minPrice?: number;
	maxPrice?: number;
	brand?: string;
	query?: string;
	sort?: 'featured' | 'price_asc' | 'price_desc' | 'name';
};

// ---------- row normalization ----------

type DbCategory = { slug: string; name: string; blurb: string | null };
type DbImage = { url: string; alt: string | null; sort_order: number };
type DbProductRow = {
	slug: string;
	name: string;
	brand: string;
	price_cents: number;
	tagline: string;
	description: string;
	specs: ProductSpec[];
	stock_qty: number;
	featured: boolean;
	categories: { slug: string } | null;
	product_images: DbImage[];
};

const PRODUCT_SELECT =
	'slug, name, brand, price_cents, tagline, description, specs, stock_qty, featured, categories!inner(slug), product_images(url, alt, sort_order)';

function toProduct(row: DbProductRow): Product {
	const images: ProductImage[] = (row.product_images ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((i) => ({ url: i.url, alt: i.alt ?? '' }));
	return {
		slug: row.slug,
		name: row.name,
		brand: row.brand,
		categorySlug: row.categories?.slug ?? '',
		priceCents: row.price_cents,
		tagline: row.tagline,
		description: row.description,
		specs: Array.isArray(row.specs) ? row.specs : [],
		stockQty: row.stock_qty,
		featured: row.featured,
		images
	};
}

function toCategory(row: DbCategory): Category {
	return { slug: row.slug, name: row.name, blurb: row.blurb ?? '' };
}

// ---------- seed filters (fallback only) ----------

function applyFilters(list: Product[], f: ProductFilters): Product[] {
	let out = list;
	if (f.category) out = out.filter((p) => p.categorySlug === f.category);
	if (typeof f.minPrice === 'number') out = out.filter((p) => p.priceCents >= f.minPrice!);
	if (typeof f.maxPrice === 'number') out = out.filter((p) => p.priceCents <= f.maxPrice!);
	if (f.brand) out = out.filter((p) => p.brand.toLowerCase() === f.brand!.toLowerCase());
	if (f.query) {
		const q = f.query.toLowerCase();
		out = out.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.brand.toLowerCase().includes(q) ||
				p.tagline.toLowerCase().includes(q) ||
				p.description.toLowerCase().includes(q)
		);
	}
	return sortSeed(out, f.sort);
}

function sortSeed(list: Product[], sort: ProductFilters['sort']): Product[] {
	switch (sort) {
		case 'price_asc':
			return [...list].sort((a, b) => a.priceCents - b.priceCents);
		case 'price_desc':
			return [...list].sort((a, b) => b.priceCents - a.priceCents);
		case 'name':
			return [...list].sort((a, b) => a.name.localeCompare(b.name));
		case 'featured':
		default:
			return [...list].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
	}
}

// ---------- public queries ----------

export async function listCategories(supabase: SB): Promise<Category[]> {
	if (!supabase) return seedCategories;
	return memo('catalog:categories', CATALOG_TTL, async () => {
		const { data, error } = await supabase
			.from('categories')
			.select('slug, name, blurb')
			.order('sort_order', { ascending: true });
		if (error || !data) return seedCategories;
		return data.map(toCategory);
	});
}

export async function listProducts(supabase: SB, filters: ProductFilters = {}): Promise<Product[]> {
	if (!supabase) return applyFilters(seedProducts, filters);

	const cacheKey = `catalog:products:${filterKey(filters)}`;
	return memo(cacheKey, CATALOG_TTL, async () => {
		let qb = supabase.from('products').select(PRODUCT_SELECT);

		if (filters.category) qb = qb.eq('categories.slug', filters.category);
		if (typeof filters.minPrice === 'number') qb = qb.gte('price_cents', filters.minPrice);
		if (typeof filters.maxPrice === 'number') qb = qb.lte('price_cents', filters.maxPrice);
		if (filters.brand) qb = qb.ilike('brand', filters.brand);
		if (filters.query) qb = qb.textSearch('search_tsv', filters.query, { type: 'websearch' });

		switch (filters.sort) {
			case 'price_asc':
				qb = qb.order('price_cents', { ascending: true });
				break;
			case 'price_desc':
				qb = qb.order('price_cents', { ascending: false });
				break;
			case 'name':
				qb = qb.order('name', { ascending: true });
				break;
			case 'featured':
			default:
				qb = qb.order('featured', { ascending: false }).order('name', { ascending: true });
		}

		const { data, error } = await qb;
		if (error || !data) return applyFilters(seedProducts, filters);
		return (data as unknown as DbProductRow[]).map(toProduct);
	});
}

export async function listFeatured(supabase: SB, limit = 6): Promise<Product[]> {
	if (!supabase) return seedProducts.filter((p) => p.featured).slice(0, limit);
	return memo(`catalog:featured:${limit}`, CATALOG_TTL, async () => {
		const { data, error } = await supabase
			.from('products')
			.select(PRODUCT_SELECT)
			.eq('featured', true)
			.limit(limit);
		if (error || !data) return seedProducts.filter((p) => p.featured).slice(0, limit);
		return (data as unknown as DbProductRow[]).map(toProduct);
	});
}

export async function listByCategory(supabase: SB, slug: string): Promise<Product[]> {
	if (!supabase) return seedByCategory(slug);
	return listProducts(supabase, { category: slug, sort: 'featured' });
}

export async function getProduct(supabase: SB, slug: string): Promise<Product | null> {
	if (!supabase) return seedFindProduct(slug) ?? null;
	return memo(`catalog:product:${slug}`, CATALOG_TTL, async () => {
		const { data, error } = await supabase
			.from('products')
			.select(PRODUCT_SELECT)
			.eq('slug', slug)
			.maybeSingle();
		if (error || !data) return seedFindProduct(slug) ?? null;
		return toProduct(data as unknown as DbProductRow);
	});
}

/**
 * Like getProduct but also returns the database id, which downstream queries
 * (reviews summary, review pagination) need to filter without re-resolving
 * the slug each time.
 */
export async function getProductWithId(
	supabase: SB,
	slug: string
): Promise<{ id: string | null; product: Product | null }> {
	if (!supabase) return { id: null, product: seedFindProduct(slug) ?? null };
	return memo(`catalog:product-id:${slug}`, CATALOG_TTL, async () => {
		const { data, error } = await supabase
			.from('products')
			.select(`id, ${PRODUCT_SELECT}`)
			.eq('slug', slug)
			.maybeSingle();
		if (error || !data) return { id: null, product: seedFindProduct(slug) ?? null };
		const row = data as unknown as DbProductRow & { id: string };
		return { id: row.id, product: toProduct(row) };
	});
}

export async function getCategory(supabase: SB, slug: string): Promise<Category | null> {
	if (!supabase) return seedFindCategory(slug) ?? null;
	return memo(`catalog:category:${slug}`, CATALOG_TTL, async () => {
		const { data, error } = await supabase
			.from('categories')
			.select('slug, name, blurb')
			.eq('slug', slug)
			.maybeSingle();
		if (error || !data) return seedFindCategory(slug) ?? null;
		return toCategory(data);
	});
}

export async function listBrands(supabase: SB, category?: string): Promise<string[]> {
	if (!supabase) {
		const scope = category ? seedProducts.filter((p) => p.categorySlug === category) : seedProducts;
		return Array.from(new Set(scope.map((p) => p.brand))).sort();
	}
	return memo(`catalog:brands:${category ?? ''}`, CATALOG_TTL, async () => {
		let qb = supabase.from('products').select('brand, categories!inner(slug)');
		if (category) qb = qb.eq('categories.slug', category);
		const { data, error } = await qb;
		if (error || !data) return [];
		return Array.from(new Set(data.map((r) => (r as { brand: string }).brand))).sort();
	});
}

/**
 * Semantic search via pgvector. Returns the top-N products ranked by cosine
 * similarity to the supplied query embedding. Falls back to an empty list when
 * the RPC is missing or the database has no embeddings populated yet — callers
 * should treat that as "use text search instead".
 */
export async function semanticSearch(
	supabase: SB,
	queryEmbedding: number[],
	options: { category?: string; limit?: number } = {}
): Promise<Product[]> {
	if (!supabase) return [];
	// The placeholder Database type narrows rpc args/returns to `never`. Cast
	// once here; replace with generated types when supabase gen types runs.
	const sb = supabase as unknown as {
		rpc: (
			fn: string,
			args: Record<string, unknown>
		) => Promise<{ data: Array<{ slug: string }> | null; error: unknown }>;
		from: SupabaseClient['from'];
	};
	const { data, error } = await sb.rpc('match_products', {
		query_embedding: queryEmbedding,
		category_slug: options.category ?? null,
		match_count: options.limit ?? 24
	});
	if (error || !data || data.length === 0) return [];

	const slugs = data.map((r) => r.slug);
	const { data: rows } = await supabase.from('products').select(PRODUCT_SELECT).in('slug', slugs);
	if (!rows) return [];

	const order = new Map(slugs.map((s, i) => [s, i]));
	return (rows as unknown as DbProductRow[])
		.map(toProduct)
		.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

export function priceBounds(list: Product[]): { min: number; max: number } {
	if (list.length === 0) return { min: 0, max: 0 };
	const prices = list.map((p) => p.priceCents);
	return { min: Math.min(...prices), max: Math.max(...prices) };
}

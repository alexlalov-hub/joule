import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/server/db/types';
import {
	categories as seedCategories,
	products as seedProducts,
	productsByCategory as seedByCategory,
	findCategory as seedFindCategory,
	findProduct as seedFindProduct
} from './data';
import type { Category, Product } from './types';

type SB = SupabaseClient<Database> | null;

/**
 * Catalog queries degrade gracefully to in-memory seed data when Supabase
 * isn't wired up. This keeps local dev and week-1 CI working before the DB
 * is provisioned.
 */

export type ProductFilters = {
	category?: string;
	minPrice?: number;
	maxPrice?: number;
	brand?: string;
	query?: string;
	sort?: 'featured' | 'price_asc' | 'price_desc' | 'name';
};

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
	switch (f.sort) {
		case 'price_asc':
			out = [...out].sort((a, b) => a.priceCents - b.priceCents);
			break;
		case 'price_desc':
			out = [...out].sort((a, b) => b.priceCents - a.priceCents);
			break;
		case 'name':
			out = [...out].sort((a, b) => a.name.localeCompare(b.name));
			break;
		case 'featured':
		default:
			out = [...out].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
	}
	return out;
}

export async function listCategories(_supabase: SB): Promise<Category[]> {
	// DB-backed version arrives in a later commit once Supabase is provisioned.
	return seedCategories;
}

export async function listProducts(
	_supabase: SB,
	filters: ProductFilters = {}
): Promise<Product[]> {
	return applyFilters(seedProducts, filters);
}

export async function listFeatured(_supabase: SB, limit = 6): Promise<Product[]> {
	return seedProducts.filter((p) => p.featured).slice(0, limit);
}

export async function listByCategory(_supabase: SB, slug: string): Promise<Product[]> {
	return seedByCategory(slug);
}

export async function getProduct(_supabase: SB, slug: string): Promise<Product | null> {
	return seedFindProduct(slug) ?? null;
}

export async function getCategory(_supabase: SB, slug: string): Promise<Category | null> {
	return seedFindCategory(slug) ?? null;
}

export async function listBrands(_supabase: SB, category?: string): Promise<string[]> {
	const scope = category ? seedProducts.filter((p) => p.categorySlug === category) : seedProducts;
	return Array.from(new Set(scope.map((p) => p.brand))).sort();
}

export function priceBounds(list: Product[]): { min: number; max: number } {
	if (list.length === 0) return { min: 0, max: 0 };
	const prices = list.map((p) => p.priceCents);
	return { min: Math.min(...prices), max: Math.max(...prices) };
}

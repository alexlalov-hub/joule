import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	getProduct,
	listCategories,
	listProducts,
	type ProductFilters
} from '$lib/catalog/queries';
import type { Product } from '$lib/catalog/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any> | null;

/**
 * Catalog tools exposed to the assistant. Each tool runs server-side, hits the
 * existing catalog queries (which fall back to the in-memory seed when no DB
 * is configured), and returns a small JSON payload the model can reason over.
 *
 * Discipline: tools never invent data. If a slug is missing, return null and
 * let the assistant explain it instead of confabulating.
 */
export function catalogTools(supabase: SB) {
	return {
		search_catalog: tool({
			description:
				'Search the Joule catalog by free-text query, optionally filtered by category slug or price range. Returns a small list of matching products with the fields needed to recommend them.',
			inputSchema: z.object({
				query: z.string().min(1).describe('Free-text query — e.g. "lightweight laptop for travel"'),
				category: z
					.string()
					.optional()
					.describe('Category slug (e.g. "laptops", "headphones"). Omit for all departments.'),
				max_price_eur: z
					.number()
					.int()
					.positive()
					.optional()
					.describe('Maximum price in euros, e.g. 1500.'),
				min_price_eur: z.number().int().positive().optional().describe('Minimum price in euros.'),
				limit: z
					.number()
					.int()
					.min(1)
					.max(10)
					.default(5)
					.describe('Maximum number of results to return (1-10).')
			}),
			execute: async ({ query, category, max_price_eur, min_price_eur, limit }) => {
				const filters: ProductFilters = {
					query,
					category,
					sort: 'featured',
					maxPrice: max_price_eur ? max_price_eur * 100 : undefined,
					minPrice: min_price_eur ? min_price_eur * 100 : undefined
				};
				const products = await listProducts(supabase, filters);
				return {
					count: products.length,
					results: products.slice(0, limit).map(toToolProduct)
				};
			}
		}),

		get_product: tool({
			description:
				'Fetch full details (description, specs, price, image alt text) for a single product by slug. Use this when the user wants depth on something already mentioned.',
			inputSchema: z.object({
				slug: z.string().min(1).describe('Product slug, e.g. "macbook-air-m4-13"')
			}),
			execute: async ({ slug }) => {
				const product = await getProduct(supabase, slug);
				if (!product) return { found: false, slug };
				return { found: true, product: toFullProduct(product) };
			}
		}),

		list_categories: tool({
			description:
				'List the departments (categories) available in the Joule catalog. Useful when the user is browsing without a clear product in mind.',
			inputSchema: z.object({}),
			execute: async () => {
				const categories = await listCategories(supabase);
				return {
					categories: categories.map((c) => ({
						slug: c.slug,
						name: c.name,
						blurb: c.blurb
					}))
				};
			}
		})
	};
}

// ---------- shaping ----------

function toToolProduct(p: Product) {
	return {
		slug: p.slug,
		name: p.name,
		brand: p.brand,
		category: p.categorySlug,
		price_eur: p.priceCents / 100,
		tagline: p.tagline,
		in_stock: p.stockQty > 0
	};
}

function toFullProduct(p: Product) {
	return {
		slug: p.slug,
		name: p.name,
		brand: p.brand,
		category: p.categorySlug,
		price_eur: p.priceCents / 100,
		tagline: p.tagline,
		description: p.description,
		specs: p.specs,
		in_stock: p.stockQty > 0,
		image_count: p.images.length
	};
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/server/db/types';

/**
 * Admin product management — server-side helpers.
 *
 * Everything in this module runs under the user's auth cookie (the
 * @supabase/ssr client), NOT under getSupabaseAdmin's service role. The
 * admin RLS policies in migration 20260519120000 are the load-bearing
 * authorisation layer; this module's validation is the user-experience
 * layer that turns RLS errors into friendly form-action responses.
 *
 * If you find yourself reaching for the service-role client here, stop
 * and read the constitution (Principle I).
 */

type SB = SupabaseClient<Database>;

export type AdminProductRow = {
	id: string;
	slug: string;
	name: string;
	brand: string;
	price_cents: number;
	stock_qty: number;
	featured: boolean;
	category_name: string | null;
};

/** Typed error so the page action can branch on the cause. */
export class AdminWriteError extends Error {
	public readonly code: 'validation' | 'forbidden' | 'not_found' | 'database';
	constructor(code: AdminWriteError['code'], message: string) {
		super(message);
		this.name = 'AdminWriteError';
		this.code = code;
	}
}

export type ProductPatch = {
	price_cents?: number;
	stock_qty?: number;
	featured?: boolean;
};

const MAX_PRICE_CENTS = 10_000_000; // £100,000 — anything higher is almost certainly a typo.

/** Validate a patch. Returns the same shape on success; throws AdminWriteError otherwise. */
export function validateProductPatch(patch: ProductPatch): ProductPatch {
	const out: ProductPatch = {};
	if (patch.price_cents !== undefined) {
		const v = patch.price_cents;
		if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0 || v > MAX_PRICE_CENTS) {
			throw new AdminWriteError(
				'validation',
				'Price must be a whole number of cents between 0 and 10,000,000.'
			);
		}
		out.price_cents = v;
	}
	if (patch.stock_qty !== undefined) {
		const v = patch.stock_qty;
		if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
			throw new AdminWriteError('validation', 'Stock must be a non-negative whole number.');
		}
		out.stock_qty = v;
	}
	if (patch.featured !== undefined) {
		if (typeof patch.featured !== 'boolean') {
			throw new AdminWriteError('validation', 'Featured must be true or false.');
		}
		out.featured = patch.featured;
	}
	if (Object.keys(out).length === 0) {
		throw new AdminWriteError('validation', 'No fields to update.');
	}
	return out;
}

/**
 * List every product for the admin grid. The customer-facing catalog query
 * is paginated and filtered; this one isn't, because the catalog is small
 * (~50 rows) and the admin wants the full picture in one view.
 */
export async function listAdminProducts(sb: SB | null): Promise<AdminProductRow[]> {
	if (!sb) return [];
	const { data, error } = await sb
		.from('products')
		.select('id, slug, name, brand, price_cents, stock_qty, featured, categories(name)')
		.order('slug', { ascending: true });
	if (error || !data) return [];

	return (
		data as unknown as Array<Record<string, unknown> & { categories?: { name?: string } }>
	).map((row) => ({
		id: String(row.id),
		slug: String(row.slug),
		name: String(row.name),
		brand: String(row.brand),
		price_cents: Number(row.price_cents),
		stock_qty: Number(row.stock_qty),
		featured: Boolean(row.featured),
		category_name: row.categories?.name ?? null
	}));
}

/**
 * Patch one product. The caller has the authenticated user id on hand, so
 * we accept it as an argument rather than re-deriving it — keeps this
 * function easily unit-testable with the supabase stub.
 */
export async function updateProductScalars(
	sb: SB | null,
	adminUserId: string,
	id: string,
	rawPatch: ProductPatch
): Promise<AdminProductRow> {
	if (!sb) {
		throw new AdminWriteError('database', 'Supabase client is not available.');
	}
	const patch = validateProductPatch(rawPatch);

	// Read the before-image for the audit log. If this read fails or returns
	// nothing, treat the row as not_found so the admin sees a clear message
	// rather than the write silently no-op-ing under RLS.
	const beforeRes = await sb
		.from('products')
		.select('id, slug, name, brand, price_cents, stock_qty, featured')
		.eq('id', id)
		.maybeSingle();
	if (beforeRes.error) {
		throw new AdminWriteError('database', beforeRes.error.message ?? 'Failed to read product.');
	}
	if (!beforeRes.data) {
		throw new AdminWriteError('not_found', 'Product not found.');
	}
	const before = beforeRes.data as unknown as AdminProductRow;

	const { data: afterData, error: updateError } = await sb
		.from('products')
		.update(patch)
		.eq('id', id)
		.select('id, slug, name, brand, price_cents, stock_qty, featured')
		.single();

	if (updateError) {
		// PostgREST surfaces RLS denial as a 403 with code 42501 (insufficient
		// privilege). Treat anything that smells like a permission denial as
		// 'forbidden' so the action layer can render the right message.
		const msg = (updateError.message ?? '').toLowerCase();
		if (
			msg.includes('permission denied') ||
			msg.includes('row-level security') ||
			msg.includes('rls')
		) {
			throw new AdminWriteError(
				'forbidden',
				'Your session no longer has admin access; please sign in again.'
			);
		}
		throw new AdminWriteError('database', updateError.message ?? 'Update failed.');
	}
	if (!afterData) {
		// Update succeeded but returned no row — RLS swallowed it after the
		// fact, or the row id was bogus. Either way, surface as forbidden.
		throw new AdminWriteError(
			'forbidden',
			'The update did not take effect. You may have lost admin access mid-request.'
		);
	}

	logAdminWrite(adminUserId, id, before, afterData as unknown as AdminProductRow);

	return afterData as unknown as AdminProductRow;
}

/** Thin convenience over updateProductScalars for the toggle action. */
export async function toggleFeatured(
	sb: SB | null,
	adminUserId: string,
	id: string,
	next: boolean
): Promise<AdminProductRow> {
	return updateProductScalars(sb, adminUserId, id, { featured: next });
}

/** Audit log line — Vercel keeps these long enough for after-the-fact review. */
export function logAdminWrite(
	adminUserId: string,
	productId: string,
	before: AdminProductRow,
	after: AdminProductRow
): void {
	const diff: Record<string, { from: unknown; to: unknown }> = {};
	for (const key of ['price_cents', 'stock_qty', 'featured'] as const) {
		if (before[key] !== after[key]) {
			diff[key] = { from: before[key], to: after[key] };
		}
	}
	if (Object.keys(diff).length === 0) return;
	console.info(
		'[admin]',
		JSON.stringify({
			at: new Date().toISOString(),
			by: adminUserId,
			product: productId,
			diff
		})
	);
}

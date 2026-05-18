import { fail } from '@sveltejs/kit';
import {
	AdminWriteError,
	listAdminProducts,
	toggleFeatured,
	updateProductScalars,
	type AdminProductFilter
} from '$lib/server/admin/products';
import type { Actions, PageServerLoad } from './$types';

/**
 * Admin product list + inline edits. The role guard ran in
 * /admin/+layout.server.ts so by the time we get here, locals.user is
 * defined and is an admin. We still pass the user id through to the
 * write helpers so the audit log records who did what.
 *
 * `filter` comes from ?filter=featured or ?filter=low-stock (set by the
 * dashboard cards). Anything else falls back to "all" so a typo in the
 * URL doesn't surface as an empty list.
 */
function parseFilter(raw: string | null): AdminProductFilter {
	if (raw === 'featured' || raw === 'low-stock') return raw;
	return 'all';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const filter = parseFilter(url.searchParams.get('filter'));
	const products = await listAdminProducts(locals.supabase ?? null, filter);
	return { products, filter };
};

function parseInteger(input: FormDataEntryValue | null): number | undefined {
	if (input === null) return undefined;
	const raw = String(input).trim();
	if (raw === '') return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) {
		throw new AdminWriteError('validation', `"${raw}" is not a whole number.`);
	}
	return n;
}

function parsePriceCents(input: FormDataEntryValue | null): number | undefined {
	if (input === null) return undefined;
	const raw = String(input).trim();
	if (raw === '') return undefined;
	const pounds = Number(raw);
	if (!Number.isFinite(pounds) || pounds < 0) {
		throw new AdminWriteError('validation', `"${raw}" is not a valid price.`);
	}
	// Round to nearest cent to avoid floating-point drift from "29.99" inputs.
	return Math.round(pounds * 100);
}

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { id: '', error: 'Missing product id.' });

		try {
			const patch = {
				price_cents: parsePriceCents(form.get('price')),
				stock_qty: parseInteger(form.get('stock'))
			};
			const adminId = locals.user?.id ?? '';
			const after = await updateProductScalars(locals.supabase ?? null, adminId, id, patch);
			return { ok: true as const, id, product: after };
		} catch (err) {
			if (err instanceof AdminWriteError) {
				const status = err.code === 'forbidden' ? 403 : err.code === 'not_found' ? 404 : 400;
				return fail(status, { id, error: err.message });
			}
			console.error('[admin] update failed', err);
			return fail(500, { id, error: 'Something went wrong saving the product.' });
		}
	},

	toggleFeatured: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const nextRaw = form.get('next');
		if (!id) return fail(400, { id: '', error: 'Missing product id.' });
		const next = nextRaw === 'true' || nextRaw === 'on' || nextRaw === '1';
		try {
			const adminId = locals.user?.id ?? '';
			const after = await toggleFeatured(locals.supabase ?? null, adminId, id, next);
			return { ok: true as const, id, product: after };
		} catch (err) {
			if (err instanceof AdminWriteError) {
				const status = err.code === 'forbidden' ? 403 : 400;
				return fail(status, { id, error: err.message });
			}
			console.error('[admin] toggle failed', err);
			return fail(500, { id, error: 'Something went wrong saving the product.' });
		}
	}
};

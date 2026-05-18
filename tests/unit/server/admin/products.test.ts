import { describe, expect, it, vi } from 'vitest';
import {
	AdminWriteError,
	listAdminProducts,
	logAdminWrite,
	toggleFeatured,
	updateProductScalars,
	validateProductPatch,
	type AdminProductRow
} from '$lib/server/admin/products';
import { makeStub } from '../../_helpers/supabase-stub';

const beforeRow: AdminProductRow = {
	id: 'p1',
	slug: 'thing',
	name: 'Thing',
	brand: 'Acme',
	price_cents: 49900,
	stock_qty: 10,
	featured: false,
	category_name: null
};

function withAdminScript(after: Partial<AdminProductRow>) {
	return makeStub({
		products: {
			maybeSingle: { data: { ...beforeRow }, error: null },
			update: { data: { ...beforeRow, ...after }, error: null }
		}
	});
}

describe('validateProductPatch', () => {
	it('returns only the keys that were present', () => {
		expect(validateProductPatch({ price_cents: 100 })).toEqual({ price_cents: 100 });
	});

	it('rejects non-integer price', () => {
		expect(() => validateProductPatch({ price_cents: 12.5 })).toThrow(AdminWriteError);
	});

	it('rejects negative price', () => {
		expect(() => validateProductPatch({ price_cents: -1 })).toThrow(AdminWriteError);
	});

	it('rejects price above £100k', () => {
		expect(() => validateProductPatch({ price_cents: 10_000_001 })).toThrow(AdminWriteError);
	});

	it('rejects non-integer stock', () => {
		expect(() => validateProductPatch({ stock_qty: 1.5 })).toThrow(AdminWriteError);
	});

	it('rejects negative stock', () => {
		expect(() => validateProductPatch({ stock_qty: -1 })).toThrow(AdminWriteError);
	});

	it('rejects non-boolean featured', () => {
		expect(() => validateProductPatch({ featured: 'yes' as unknown as boolean })).toThrow(
			AdminWriteError
		);
	});

	it('throws when the patch is empty', () => {
		expect(() => validateProductPatch({})).toThrow(AdminWriteError);
	});
});

describe('listAdminProducts', () => {
	it('returns an empty array when the supabase client is null', async () => {
		expect(await listAdminProducts(null)).toEqual([]);
	});

	it('maps the supabase rows into AdminProductRow shape', async () => {
		const { client, calls } = makeStub({
			products: {
				select: {
					data: [
						{
							id: 'p1',
							slug: 'thing',
							name: 'Thing',
							brand: 'Acme',
							price_cents: 49900,
							stock_qty: 10,
							featured: false,
							categories: { name: 'Audio' }
						}
					],
					error: null
				}
			}
		});
		const rows = await listAdminProducts(client);
		expect(rows).toEqual([
			{
				id: 'p1',
				slug: 'thing',
				name: 'Thing',
				brand: 'Acme',
				price_cents: 49900,
				stock_qty: 10,
				featured: false,
				category_name: 'Audio'
			}
		]);
		expect(calls[0]).toMatchObject({ table: 'products', op: 'select' });
	});

	it('returns [] when supabase errors', async () => {
		const { client } = makeStub({
			products: { select: { data: null, error: { message: 'boom' } } }
		});
		expect(await listAdminProducts(client)).toEqual([]);
	});
});

describe('updateProductScalars', () => {
	it('throws database error when the client is null', async () => {
		await expect(updateProductScalars(null, 'admin', 'p1', { price_cents: 100 })).rejects.toThrow(
			AdminWriteError
		);
	});

	it('updates and returns the new row', async () => {
		const { client, calls } = withAdminScript({ price_cents: 45900 });
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const after = await updateProductScalars(client, 'admin_uid', 'p1', {
			price_cents: 45900
		});
		expect(after.price_cents).toBe(45900);
		// One select for the before-image, one update.
		expect(calls.map((c) => c.op)).toEqual(['maybeSingle', 'update']);
		expect(info).toHaveBeenCalledWith('[admin]', expect.stringContaining('"by":"admin_uid"'));
		info.mockRestore();
	});

	it('treats a missing row as not_found', async () => {
		const { client } = makeStub({
			products: { maybeSingle: { data: null, error: null } }
		});
		await expect(
			updateProductScalars(client, 'admin', 'p1', { price_cents: 100 })
		).rejects.toMatchObject({ code: 'not_found' });
	});

	it('treats an RLS permission denial as forbidden', async () => {
		const { client } = makeStub({
			products: {
				maybeSingle: { data: { ...beforeRow }, error: null },
				update: { data: null, error: { message: 'permission denied for table products' } }
			}
		});
		await expect(
			updateProductScalars(client, 'admin', 'p1', { price_cents: 100 })
		).rejects.toMatchObject({ code: 'forbidden' });
	});

	it('translates a generic update error to database code', async () => {
		const { client } = makeStub({
			products: {
				maybeSingle: { data: { ...beforeRow }, error: null },
				update: { data: null, error: { message: 'connection lost' } }
			}
		});
		await expect(
			updateProductScalars(client, 'admin', 'p1', { price_cents: 100 })
		).rejects.toMatchObject({ code: 'database' });
	});

	it('treats a successful update with no data as forbidden', async () => {
		const { client } = makeStub({
			products: {
				maybeSingle: { data: { ...beforeRow }, error: null },
				update: { data: null, error: null }
			}
		});
		await expect(
			updateProductScalars(client, 'admin', 'p1', { price_cents: 100 })
		).rejects.toMatchObject({ code: 'forbidden' });
	});

	it('treats a pre-update read error as database', async () => {
		const { client } = makeStub({
			products: {
				maybeSingle: { data: null, error: { message: 'boom' } }
			}
		});
		await expect(
			updateProductScalars(client, 'admin', 'p1', { price_cents: 100 })
		).rejects.toMatchObject({ code: 'database' });
	});

	it('rejects invalid patch before touching the database', async () => {
		const { client, calls } = makeStub({});
		await expect(
			updateProductScalars(client, 'admin', 'p1', { price_cents: -5 })
		).rejects.toMatchObject({ code: 'validation' });
		expect(calls).toEqual([]);
	});
});

describe('toggleFeatured', () => {
	it('forwards to updateProductScalars and returns the new row', async () => {
		const { client } = withAdminScript({ featured: true });
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const after = await toggleFeatured(client, 'admin_uid', 'p1', true);
		expect(after.featured).toBe(true);
		info.mockRestore();
	});

	it('propagates an RLS denial as forbidden', async () => {
		const { client } = makeStub({
			products: {
				maybeSingle: { data: { ...beforeRow }, error: null },
				update: { data: null, error: { message: 'row-level security policy violation' } }
			}
		});
		await expect(toggleFeatured(client, 'admin', 'p1', true)).rejects.toMatchObject({
			code: 'forbidden'
		});
	});
});

describe('logAdminWrite', () => {
	it('writes nothing when nothing changed', () => {
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		logAdminWrite('admin', 'p1', beforeRow, beforeRow);
		expect(info).not.toHaveBeenCalled();
		info.mockRestore();
	});

	it('emits a diff line when something changed', () => {
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		logAdminWrite('admin', 'p1', beforeRow, { ...beforeRow, price_cents: 45900 });
		expect(info).toHaveBeenCalledWith('[admin]', expect.stringContaining('"price_cents"'));
		info.mockRestore();
	});
});

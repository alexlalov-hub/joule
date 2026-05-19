import { describe, expect, it, vi } from 'vitest';
import {
	deleteReview,
	listAdminReviews,
	logModeration,
	setReviewHidden,
	type AdminReviewRow
} from '$lib/server/admin/reviews';
import { makeStub } from '../../_helpers/supabase-stub';

const baseRow: AdminReviewRow = {
	id: 'r1',
	product_id: 'p1',
	product_slug: 'thing',
	product_name: 'Thing',
	user_id: 'u1',
	rating: 5,
	aspect: 'overall',
	title: 'Great',
	body: 'Loved it',
	created_at: '2026-05-01T12:00:00Z',
	hidden_at: null
};

function withScript(after: Partial<AdminReviewRow>, hiddenAtBefore: string | null = null) {
	return makeStub({
		reviews: {
			maybeSingle: { data: { id: 'r1', hidden_at: hiddenAtBefore }, error: null },
			update: {
				data: {
					...baseRow,
					...after,
					products: { slug: 'thing', name: 'Thing' }
				},
				error: null
			},
			delete: { data: null, error: null }
		}
	});
}

describe('listAdminReviews', () => {
	it('returns [] when the supabase client is null', async () => {
		expect(await listAdminReviews(null)).toEqual([]);
	});

	it('maps supabase rows into AdminReviewRow shape', async () => {
		const { client } = makeStub({
			reviews: {
				select: {
					data: [
						{
							id: 'r1',
							product_id: 'p1',
							user_id: 'u1',
							rating: 5,
							aspect: 'overall',
							title: 'Great',
							body: 'Loved it',
							created_at: '2026-05-01T12:00:00Z',
							hidden_at: null,
							products: { slug: 'thing', name: 'Thing' }
						}
					],
					error: null
				}
			}
		});
		const rows = await listAdminReviews(client);
		expect(rows).toEqual([
			{
				id: 'r1',
				product_id: 'p1',
				product_slug: 'thing',
				product_name: 'Thing',
				user_id: 'u1',
				rating: 5,
				aspect: 'overall',
				title: 'Great',
				body: 'Loved it',
				created_at: '2026-05-01T12:00:00Z',
				hidden_at: null
			}
		]);
	});

	it('handles a null user_id and missing product join', async () => {
		const { client } = makeStub({
			reviews: {
				select: {
					data: [
						{
							id: 'r1',
							product_id: 'p1',
							user_id: null,
							rating: 1,
							aspect: null,
							title: '',
							body: '',
							created_at: '2026-05-01T12:00:00Z',
							hidden_at: '2026-05-02T08:00:00Z'
						}
					],
					error: null
				}
			}
		});
		const rows = await listAdminReviews(client);
		expect(rows[0]).toMatchObject({
			user_id: null,
			product_slug: null,
			product_name: null,
			aspect: null,
			hidden_at: '2026-05-02T08:00:00Z'
		});
	});

	it('accepts the visible filter', async () => {
		const { client } = makeStub({
			reviews: { select: { data: [], error: null } }
		});
		expect(await listAdminReviews(client, 'visible')).toEqual([]);
	});

	it('accepts the hidden filter', async () => {
		const { client } = makeStub({
			reviews: { select: { data: [], error: null } }
		});
		expect(await listAdminReviews(client, 'hidden')).toEqual([]);
	});

	it('returns [] when supabase errors', async () => {
		const { client } = makeStub({
			reviews: { select: { data: null, error: { message: 'boom' } } }
		});
		expect(await listAdminReviews(client)).toEqual([]);
	});
});

describe('setReviewHidden', () => {
	it('throws database when the client is null', async () => {
		await expect(setReviewHidden(null, 'admin', 'r1', true)).rejects.toMatchObject({
			code: 'database'
		});
	});

	it('throws validation when id is empty', async () => {
		const { client } = makeStub({});
		await expect(setReviewHidden(client, 'admin', '', true)).rejects.toMatchObject({
			code: 'validation'
		});
	});

	it('hides a visible review and returns the new row', async () => {
		const { client } = withScript({ hidden_at: '2026-05-19T12:00:00Z' });
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const after = await setReviewHidden(client, 'admin_uid', 'r1', true);
		expect(after.hidden_at).toBe('2026-05-19T12:00:00Z');
		expect(info).toHaveBeenCalledWith('[admin]', expect.stringContaining('"action":"hide"'));
		info.mockRestore();
	});

	it('shows a hidden review and clears hidden_at', async () => {
		const { client } = withScript({ hidden_at: null }, '2026-05-18T12:00:00Z');
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const after = await setReviewHidden(client, 'admin_uid', 'r1', false);
		expect(after.hidden_at).toBeNull();
		expect(info).toHaveBeenCalledWith('[admin]', expect.stringContaining('"action":"show"'));
		info.mockRestore();
	});

	it('treats a missing row as not_found', async () => {
		const { client } = makeStub({
			reviews: { maybeSingle: { data: null, error: null } }
		});
		await expect(setReviewHidden(client, 'admin', 'r1', true)).rejects.toMatchObject({
			code: 'not_found'
		});
	});

	it('translates an RLS denial into forbidden', async () => {
		const { client } = makeStub({
			reviews: {
				maybeSingle: { data: { id: 'r1', hidden_at: null }, error: null },
				update: { data: null, error: { message: 'permission denied for table reviews' } }
			}
		});
		await expect(setReviewHidden(client, 'admin', 'r1', true)).rejects.toMatchObject({
			code: 'forbidden'
		});
	});

	it('translates a generic update error into database', async () => {
		const { client } = makeStub({
			reviews: {
				maybeSingle: { data: { id: 'r1', hidden_at: null }, error: null },
				update: { data: null, error: { message: 'connection lost' } }
			}
		});
		await expect(setReviewHidden(client, 'admin', 'r1', true)).rejects.toMatchObject({
			code: 'database'
		});
	});

	it('treats successful update with no data as forbidden', async () => {
		const { client } = makeStub({
			reviews: {
				maybeSingle: { data: { id: 'r1', hidden_at: null }, error: null },
				update: { data: null, error: null }
			}
		});
		await expect(setReviewHidden(client, 'admin', 'r1', true)).rejects.toMatchObject({
			code: 'forbidden'
		});
	});

	it('treats a pre-update read error as database', async () => {
		const { client } = makeStub({
			reviews: {
				maybeSingle: { data: null, error: { message: 'boom' } }
			}
		});
		await expect(setReviewHidden(client, 'admin', 'r1', true)).rejects.toMatchObject({
			code: 'database'
		});
	});
});

describe('deleteReview', () => {
	it('throws database when the client is null', async () => {
		await expect(deleteReview(null, 'admin', 'r1')).rejects.toMatchObject({
			code: 'database'
		});
	});

	it('throws validation when id is empty', async () => {
		const { client } = makeStub({});
		await expect(deleteReview(client, 'admin', '')).rejects.toMatchObject({
			code: 'validation'
		});
	});

	it('deletes and logs', async () => {
		const { client, calls } = makeStub({
			reviews: { delete: { data: null, error: null } }
		});
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		await deleteReview(client, 'admin_uid', 'r1');
		expect(calls.some((c) => c.op === 'delete')).toBe(true);
		expect(info).toHaveBeenCalledWith('[admin]', expect.stringContaining('"action":"delete"'));
		info.mockRestore();
	});

	it('translates an RLS denial into forbidden', async () => {
		const { client } = makeStub({
			reviews: { delete: { data: null, error: { message: 'row-level security policy' } } }
		});
		await expect(deleteReview(client, 'admin', 'r1')).rejects.toMatchObject({
			code: 'forbidden'
		});
	});

	it('translates a generic delete error into database', async () => {
		const { client } = makeStub({
			reviews: { delete: { data: null, error: { message: 'connection lost' } } }
		});
		await expect(deleteReview(client, 'admin', 'r1')).rejects.toMatchObject({
			code: 'database'
		});
	});
});

describe('logModeration', () => {
	it('writes a JSON line prefixed [admin] with action + actor + review id', () => {
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		logModeration(
			'admin_uid',
			'r1',
			'hide',
			{ hidden_at: null },
			{ hidden_at: '2026-05-19T12:00:00Z' }
		);
		const call = info.mock.calls[0];
		expect(call[0]).toBe('[admin]');
		const payload = JSON.parse(String(call[1])) as Record<string, unknown>;
		expect(payload).toMatchObject({
			by: 'admin_uid',
			review: 'r1',
			action: 'hide'
		});
		info.mockRestore();
	});
});

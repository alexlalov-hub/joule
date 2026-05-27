import { describe, expect, it } from 'vitest';
import { isAdmin } from '$lib/server/auth';
import { makeStub } from '../_helpers/supabase-stub';

// The auth module reads profiles.role under the user's auth cookie. The unit
// tests exercise the small set of inputs the helper can see: null client (no
// Supabase configured), null user (anonymous request), profile missing,
// profile role 'customer', profile role 'admin', and the Supabase-error path.
// The stub plays back a maybeSingle result per call, which is exactly the
// shape isAdmin reaches for.

const fakeUser = { id: 'u_admin' } as unknown as Parameters<typeof isAdmin>[1];

describe('isAdmin', () => {
	it('returns false when the supabase client is null', async () => {
		expect(await isAdmin(null, fakeUser)).toBe(false);
	});

	it('returns false when the user is null', async () => {
		const { client } = makeStub({});
		expect(await isAdmin(client, null)).toBe(false);
	});

	it('returns false when the user is undefined', async () => {
		const { client } = makeStub({});
		expect(await isAdmin(client, undefined)).toBe(false);
	});

	it('returns false when no profile row matches the user id', async () => {
		const { client } = makeStub({
			profiles: { maybeSingle: { data: null, error: null } }
		});
		expect(await isAdmin(client, fakeUser)).toBe(false);
	});

	it("returns false when the profile's role is customer", async () => {
		const { client } = makeStub({
			profiles: { maybeSingle: { data: { role: 'customer' }, error: null } }
		});
		expect(await isAdmin(client, fakeUser)).toBe(false);
	});

	it("returns true when the profile's role is admin", async () => {
		const { client } = makeStub({
			profiles: { maybeSingle: { data: { role: 'admin' }, error: null } }
		});
		expect(await isAdmin(client, fakeUser)).toBe(true);
	});

	it('returns false when supabase reports an error', async () => {
		const { client } = makeStub({
			profiles: { maybeSingle: { data: null, error: { message: 'boom' } } }
		});
		expect(await isAdmin(client, fakeUser)).toBe(false);
	});
});

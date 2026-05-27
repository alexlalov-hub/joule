import { afterEach, describe, expect, it, vi } from 'vitest';
import { embedText, semanticSearchEnabled } from '$lib/server/embeddings';

// The embeddings module reads OPENAI_API_KEY through $env/dynamic/private.
// Vitest evaluates that as a normal module with the host env, so we mock
// the import to control the key per test.
vi.mock('$env/dynamic/private', () => ({
	env: new Proxy({} as Record<string, string | undefined>, {
		get: (target, prop) => target[prop as string]
	})
}));

import { env } from '$env/dynamic/private';

describe('semanticSearchEnabled', () => {
	afterEach(() => {
		delete (env as Record<string, string | undefined>).OPENAI_API_KEY;
	});

	it('is false when OPENAI_API_KEY is unset', () => {
		expect(semanticSearchEnabled()).toBe(false);
	});

	it('is true when OPENAI_API_KEY is set', () => {
		(env as Record<string, string | undefined>).OPENAI_API_KEY = 'sk-test';
		expect(semanticSearchEnabled()).toBe(true);
	});
});

describe('embedText', () => {
	const ORIGINAL_FETCH = globalThis.fetch;

	afterEach(() => {
		delete (env as Record<string, string | undefined>).OPENAI_API_KEY;
		globalThis.fetch = ORIGINAL_FETCH;
		vi.restoreAllMocks();
	});

	it('returns null without an API key', async () => {
		expect(await embedText('hello')).toBeNull();
	});

	it('returns null for an empty input', async () => {
		(env as Record<string, string | undefined>).OPENAI_API_KEY = 'sk-test';
		expect(await embedText('   ')).toBeNull();
	});

	it('returns the embedding vector on a successful call', async () => {
		(env as Record<string, string | undefined>).OPENAI_API_KEY = 'sk-test';
		const vec = Array.from({ length: 1536 }, (_, i) => i / 1536);
		globalThis.fetch = vi.fn(
			async () => new Response(JSON.stringify({ data: [{ embedding: vec }] }), { status: 200 })
		) as unknown as typeof fetch;

		const result = await embedText('a laptop');
		expect(result).toEqual(vec);
	});

	it('returns null when the API responds non-OK', async () => {
		(env as Record<string, string | undefined>).OPENAI_API_KEY = 'sk-test';
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		globalThis.fetch = vi.fn(
			async () => new Response('rate limited', { status: 429 })
		) as unknown as typeof fetch;

		expect(await embedText('a laptop')).toBeNull();
		expect(warn).toHaveBeenCalled();
	});

	it('returns null when the response shape is malformed', async () => {
		(env as Record<string, string | undefined>).OPENAI_API_KEY = 'sk-test';
		globalThis.fetch = vi.fn(
			async () =>
				new Response(JSON.stringify({ data: [{ embedding: [1, 2, 3] }] }), { status: 200 })
		) as unknown as typeof fetch;

		// Wrong vector length — function only accepts 1536 dims.
		expect(await embedText('a laptop')).toBeNull();
	});

	it('returns null when fetch throws', async () => {
		(env as Record<string, string | undefined>).OPENAI_API_KEY = 'sk-test';
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		globalThis.fetch = vi.fn(async () => {
			throw new Error('network down');
		}) as unknown as typeof fetch;

		expect(await embedText('a laptop')).toBeNull();
		expect(warn).toHaveBeenCalled();
	});

	it('truncates inputs longer than 8000 characters', async () => {
		(env as Record<string, string | undefined>).OPENAI_API_KEY = 'sk-test';
		const vec = Array.from({ length: 1536 }, () => 0);
		const fetchMock = vi.fn(
			async () => new Response(JSON.stringify({ data: [{ embedding: vec }] }), { status: 200 })
		) as unknown as typeof fetch;
		globalThis.fetch = fetchMock;

		await embedText('x'.repeat(10000));

		const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls;
		const body = JSON.parse((calls[0][1] as { body: string }).body) as { input: string };
		expect(body.input.length).toBe(8000);
	});
});

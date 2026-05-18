import { error } from '@sveltejs/kit';
import type { UIMessage } from 'ai';
import type { RequestHandler } from './$types';
import { streamAssistant } from '$lib/server/ai/assistant';
import { rateLimit } from '$lib/server/rate-limit';

const AI_LIMIT = { windowMs: 5 * 60 * 1000, max: 20 } as const;

/**
 * POST /api/assistant — streams a chat completion for the Joule assistant.
 *
 * Body shape (Vercel AI SDK Chat protocol):
 *   { messages: UIMessage[] }
 *
 * Returns a UI message stream that the @ai-sdk/svelte Chat client can consume.
 *
 * Rate-limited per IP: 20 requests in any 5-minute window. Without this,
 * an anonymous caller could spam the endpoint and run up our gateway bill.
 */
export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const limit = rateLimit(`assistant:${getClientAddress()}`, AI_LIMIT);
	if (!limit.ok) {
		throw error(429, `Too many requests. Try again in ${limit.retryAfterSec}s.`);
	}

	const { messages } = (await request.json()) as { messages?: UIMessage[] };
	if (!Array.isArray(messages) || messages.length === 0) {
		throw error(400, 'messages must be a non-empty array');
	}

	const result = await streamAssistant({
		messages,
		supabase: locals.supabase ?? null
	});

	return result.toUIMessageStreamResponse({
		// Surface tool errors to the client so the UI can show "search failed" instead of hanging.
		onError: (e) => {
			console.error('[assistant] stream error:', e);
			return e instanceof Error ? e.message : 'Assistant error';
		}
	});
};

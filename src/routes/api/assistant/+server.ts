import { error } from '@sveltejs/kit';
import type { UIMessage } from 'ai';
import type { RequestHandler } from './$types';
import { streamAssistant } from '$lib/server/ai/assistant';

/**
 * POST /api/assistant — streams a chat completion for the Joule assistant.
 *
 * Body shape (Vercel AI SDK Chat protocol):
 *   { messages: UIMessage[] }
 *
 * Returns a UI message stream that the @ai-sdk/svelte Chat client can consume.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
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

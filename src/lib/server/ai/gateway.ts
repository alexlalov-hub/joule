import { createGateway } from '@ai-sdk/gateway';
import { env } from '$env/dynamic/private';

/**
 * Build a Vercel AI Gateway provider with the API key threaded explicitly
 * from $env/dynamic/private. We don't rely on process.env because SvelteKit
 * dev doesn't always propagate unprefixed .env.local vars in time for the
 * gateway library's lazy header construction.
 */
export function getGateway() {
	return createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
}

/**
 * Default model for both the assistant (tool-calling) and the compare route
 * (prose only). gpt-4.1-mini handles structured tool calls reliably enough
 * for our small catalog tools and is roughly an order of magnitude cheaper
 * than the Claude Sonnet family per-token. Override with JOULE_ASSISTANT_MODEL.
 */
export const DEFAULT_MODEL = 'openai/gpt-4.1-mini';

export function pickModel(): string {
	return env.JOULE_ASSISTANT_MODEL ?? DEFAULT_MODEL;
}

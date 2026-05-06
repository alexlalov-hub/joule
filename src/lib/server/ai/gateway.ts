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

export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';

export function pickModel(): string {
	return env.JOULE_ASSISTANT_MODEL ?? DEFAULT_MODEL;
}

import { env } from '$env/dynamic/private';

const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIMS = 1536;

/**
 * Whether semantic search is configured for this deployment. When false,
 * callers should fall back to text-based search rather than failing.
 */
export function semanticSearchEnabled(): boolean {
	return Boolean(env.OPENAI_API_KEY);
}

/**
 * Embed a single text into a 1536-dim vector via OpenAI. Returns null when
 * no API key is configured or the call fails — callers must fall back.
 */
export async function embedText(text: string): Promise<number[] | null> {
	const apiKey = env.OPENAI_API_KEY;
	if (!apiKey) return null;
	const trimmed = text.trim();
	if (!trimmed) return null;

	try {
		const res = await fetch('https://api.openai.com/v1/embeddings', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({ model: EMBED_MODEL, input: trimmed.slice(0, 8000) })
		});
		if (!res.ok) {
			console.warn('[embeddings] OpenAI embed failed:', res.status, await res.text());
			return null;
		}
		const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
		const vec = json.data?.[0]?.embedding;
		if (!Array.isArray(vec) || vec.length !== EMBED_DIMS) return null;
		return vec;
	} catch (e) {
		console.warn('[embeddings] OpenAI embed threw:', e);
		return null;
	}
}

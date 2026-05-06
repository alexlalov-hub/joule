import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { env } from '$env/dynamic/private';
import type { SupabaseClient } from '@supabase/supabase-js';
import { catalogTools } from './tools';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any> | null;

/**
 * Default model — routed via Vercel AI Gateway when AI_GATEWAY_API_KEY is set.
 * Override with the JOULE_ASSISTANT_MODEL env var for local experimentation.
 */
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';

/**
 * Build a gateway provider with the API key explicitly threaded through. We
 * read from $env/dynamic/private rather than relying on process.env, since
 * SvelteKit dev doesn't always propagate unprefixed .env.local vars to
 * process.env in time for the gateway library's lazy header construction.
 */
function getGateway() {
	return createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
}

const SYSTEM_PROMPT = `You are Joule's shopping assistant. Joule is a small, opinionated electronics store that sells laptops, phones, audio gear, and peripherals.

GROUNDING RULES — these are non-negotiable:
- You may only recommend products that are present in Joule's catalog. Use the search_catalog and get_product tools to find them.
- Never invent a model name, spec, price, or stock status. If you don't have the data, call a tool. If a tool says the product isn't found, tell the user that — do not fabricate.
- When you mention a specific product, refer to it by its catalog slug in square brackets the first time, e.g. "the MacBook Air 13\\" (M4) [macbook-air-m4-13]". The UI will turn that into a link.
- Always cite real specs from get_product when comparing or recommending. Don't paraphrase numbers from memory.

STYLE:
- Be concise. Two short paragraphs is usually enough; bullet points are fine for trade-offs.
- Be honest about trade-offs. If a product isn't right for the user, say so.
- No marketing fluff. No "stunning" or "incredible". Plain English, like a friend who knows the category.
- If the user is browsing without a goal, ask one clarifying question — what they'll use it for, budget, deal-breakers — before recommending.

When the user asks for something Joule doesn't sell (e.g. cars, fridges), say so and offer to help with what we do sell.`;

/**
 * Stream a chat completion from the configured model with the catalog tools
 * wired up. Caller is responsible for shaping the response (toUIMessageStreamResponse).
 */
export async function streamAssistant(opts: { messages: UIMessage[]; supabase: SB }) {
	const modelId = env.JOULE_ASSISTANT_MODEL ?? DEFAULT_MODEL;
	const modelMessages = await convertToModelMessages(opts.messages);
	const gateway = getGateway();
	return streamText({
		model: gateway(modelId),
		system: SYSTEM_PROMPT,
		messages: modelMessages,
		tools: catalogTools(opts.supabase),
		// Allow the assistant to chain multiple tool calls within a single turn —
		// e.g. search_catalog followed by get_product on the most promising hit.
		stopWhen: stepCountIs(6),
		temperature: 0.4
	});
}

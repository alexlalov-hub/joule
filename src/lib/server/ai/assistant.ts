import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { catalogTools } from './tools';
import { getGateway, pickModel } from './gateway';
import { SYSTEM_PROMPT } from './prompts';

export { SYSTEM_PROMPT };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any> | null;

/**
 * Stream a chat completion from the configured model with the catalog tools
 * wired up. Caller is responsible for shaping the response (toUIMessageStreamResponse).
 */
export async function streamAssistant(opts: { messages: UIMessage[]; supabase: SB }) {
	const modelMessages = await convertToModelMessages(opts.messages);
	const gateway = getGateway();
	return streamText({
		model: gateway(pickModel()),
		system: SYSTEM_PROMPT,
		messages: modelMessages,
		tools: catalogTools(opts.supabase),
		// Allow the assistant to chain multiple tool calls within a single turn —
		// e.g. search_catalog followed by get_product on the most promising hit.
		stopWhen: stepCountIs(6),
		temperature: 0.4
	});
}

import { streamText } from 'ai';
import { getGateway, pickModel } from './gateway';
import type { Product } from '$lib/catalog/types';

const COMPARE_SYSTEM_PROMPT = `You are Joule's product-comparison writer. The user has placed two or three products side-by-side. Your job is to give them an honest, useful "which one and why" — grounded entirely in the product data provided in the user message.

RULES:
- Use only the specs and copy in the JSON the user sends. Don't invent specs, prices, or claims that aren't there.
- When you reference a product, use its slug in square brackets (e.g. [macbook-air-m4-13]). The UI links these.
- If a spec exists for one product but not another, say "not specified" for the missing one — don't guess.
- Pick a winner per use-case, not overall. Travel, office, gaming, value, etc. — whichever fits the products being compared.
- Be brutal about trade-offs. If two products are essentially the same except for €200, say so.

STRUCTURE (markdown, ~150–250 words):
1. One-line summary at the top — "If you want X, get Y. If you want Z, get W."
2. Bullet list of the 2–3 most decision-relevant differences.
3. A short closing recommendation paragraph naming the audience for each product.

No marketing fluff. No "stunning". Plain English, like a friend who knows the category.`;

/**
 * Format the supplied products into a compact JSON block that the model can
 * reason over. Keep the shape stable so the prompt's expectations match.
 */
function buildUserMessage(products: Product[]): string {
	const data = products.map((p) => ({
		slug: p.slug,
		name: p.name,
		brand: p.brand,
		category: p.categorySlug,
		price_eur: p.priceCents / 100,
		tagline: p.tagline,
		description: p.description,
		specs: p.specs,
		in_stock: p.stockQty > 0
	}));
	return [
		'Compare these products. Use only the data in this JSON; do not introduce facts that are not present.',
		'',
		'```json',
		JSON.stringify(data, null, 2),
		'```'
	].join('\n');
}

export function streamComparison(products: Product[]) {
	const gateway = getGateway();
	return streamText({
		model: gateway(pickModel()),
		system: COMPARE_SYSTEM_PROMPT,
		prompt: buildUserMessage(products),
		temperature: 0.4
	});
}

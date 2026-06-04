import type { PageServerLoad } from './$types';
import { listCategories, listProducts, semanticSearch } from '$lib/catalog/queries';
import { embedText, semanticSearchEnabled } from '$lib/server/embeddings';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	const category = url.searchParams.get('category') || undefined;

	const [products, categories, mode] = await Promise.all([
		runSearch(locals.supabase, q, category),
		listCategories(locals.supabase),
		Promise.resolve(semanticSearchEnabled() ? 'semantic' : 'text')
	] as const);

	return { q, category, products, categories, mode };
};

async function runSearch(
	supabase: App.Locals['supabase'],
	q: string,
	category: string | undefined
) {
	if (!q) return [];

	if (semanticSearchEnabled() && supabase) {
		const vec = await embedText(q);
		if (vec) {
			const semantic = await semanticSearch(supabase, vec, { category, limit: 24 });
			if (semantic.length > 0) return semantic;
		}
	}

	return listProducts(supabase, { query: q, category, sort: 'featured' });
}

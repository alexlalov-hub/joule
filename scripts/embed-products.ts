/**
 * Generate OpenAI embeddings for every product in the catalog and write them
 * back to public.products.embedding. Idempotent — re-running re-embeds.
 *
 * Requires:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *   OPENAI_API_KEY
 *
 * Run with:  npm run embed
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });
loadEnv();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.');
	process.exit(1);
}
if (!openaiKey) {
	console.error('Missing OPENAI_API_KEY — embeddings cannot be generated.');
	process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, {
	auth: { persistSession: false, autoRefreshToken: false }
});

type ProductRow = {
	id: string;
	slug: string;
	name: string;
	brand: string;
	tagline: string;
	description: string;
	specs: Array<{ label: string; value: string }>;
};

function buildText(p: ProductRow): string {
	const specsText = (p.specs ?? []).map((s) => `${s.label}: ${s.value}`).join('\n');
	return [`${p.brand} ${p.name}`, p.tagline, p.description, specsText].filter(Boolean).join('\n\n');
}

async function embed(input: string): Promise<number[]> {
	const res = await fetch('https://api.openai.com/v1/embeddings', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${openaiKey}`
		},
		body: JSON.stringify({ model: 'text-embedding-3-small', input: input.slice(0, 8000) })
	});
	if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
	const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
	return json.data[0].embedding;
}

async function main() {
	const { data: products, error } = await sb
		.from('products')
		.select('id, slug, name, brand, tagline, description, specs');
	if (error) throw error;
	if (!products || products.length === 0) {
		console.log('No products to embed.');
		return;
	}

	console.log(`→ Embedding ${products.length} products via text-embedding-3-small…`);
	let n = 0;
	for (const p of products as ProductRow[]) {
		const vec = await embed(buildText(p));
		const { error: upErr } = await sb.from('products').update({ embedding: vec }).eq('id', p.id);
		if (upErr) throw upErr;
		n += 1;
		if (n % 5 === 0 || n === products.length) {
			console.log(`  · ${n}/${products.length}`);
		}
	}
	console.log('✓ Embeddings written.');
}

main().catch((err) => {
	console.error('Embed failed:', err);
	process.exit(1);
});

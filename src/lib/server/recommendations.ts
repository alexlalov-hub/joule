import type { SupabaseClient } from '@supabase/supabase-js';
import { listProducts } from '$lib/catalog/queries';
import { listWishlist } from '$lib/server/wishlist';
import type { Product } from '$lib/catalog/types';
import type { ReasonKind, Recommendation } from '$lib/recommendations/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any> | null;

export type { Recommendation };

/**
 * Personalisation is intentionally rule-based and transparent rather than
 * model-driven. Each recommendation carries a Reason object naming the exact
 * signal that produced it so the user can audit "why am I seeing this".
 *
 * Two algorithms live here. The embedding-hybrid path is preferred when
 * product embeddings have been populated (npm run embed); a rule-based path
 * is the fallback for cold deployments.
 *
 * Embedding-hybrid algorithm:
 *  1. Collect signals — bought (weight 3) and saved (weight 2) — and pull
 *     each product's row including its 1536-dim embedding.
 *  2. Build a single user vector by weight-averaging the signal embeddings.
 *     This represents "the centre of your taste" in catalog-embedding space.
 *  3. Candidate generation via the match_products RPC (cosine HNSW). Pull 20.
 *  4. Re-rank each candidate with a small hand-tuned linear model:
 *       score = 1.0 * cosine
 *             + 0.30 * (1 if candidate.brand has any signal weight else 0)
 *             + 0.20 * price-band-match
 *             + 0.10 * (1 if featured else 0)
 *     Multiplied by a 0.7 penalty when the candidate would be the third pick
 *     in its category (diversity).
 *  5. Select top-K (capped at 6) honouring a 2-per-category cap.
 *  6. Attribute each pick:
 *       - Same brand as a signal? -> kind=same_brand, anchor=strongest signal
 *         in that brand.
 *       - Else                    -> kind=similar, anchor=signal with the
 *         highest cosine to the candidate.
 *
 * Rule-based fallback (no embeddings available):
 *  Sum signal weights per category, pick top categories, fill with up to 2
 *  unseen products per category. Each rec attributed to its strongest in-
 *  category signal as 'bought' or 'saved'.
 */

const MAX_RECS = 6;
const MAX_PER_CATEGORY = 2;
const CANDIDATES_LIMIT = 20;
const SIGNAL_WEIGHTS: Record<'bought' | 'saved', number> = { bought: 3, saved: 2 };

// Re-rank weights — kept small and visible so they can be tuned with intent.
const W_SIM = 1.0;
const W_BRAND = 0.3;
const W_PRICE = 0.2;
const W_FEATURED = 0.1;
const CATEGORY_OVERFLOW_PENALTY = 0.7;

type Signal = {
	slug: string;
	kind: 'bought' | 'saved';
	weight: number;
	embedding: number[] | null;
	brand: string;
	priceCents: number;
	categorySlug: string;
};

export async function recommendForUser(sb: SB, userId: string | null): Promise<Recommendation[]> {
	if (!sb || !userId) return [];

	const [orderSlugs, wishlistRows, allProducts] = await Promise.all([
		fetchOrderSlugs(sb, userId),
		listWishlist(sb, userId),
		listProducts(sb)
	]);

	const productBySlug = new Map(allProducts.map((p) => [p.slug, p]));

	// Build the raw signal list. Don't enrich with embeddings yet — we may not
	// need them if the rule-based path ends up being used.
	const signalSlugs = new Set<string>();
	const signalsRaw: Array<{ slug: string; kind: 'bought' | 'saved' }> = [];
	for (const slug of orderSlugs) {
		if (signalSlugs.has(slug)) continue;
		signalSlugs.add(slug);
		signalsRaw.push({ slug, kind: 'bought' });
	}
	for (const w of wishlistRows) {
		if (signalSlugs.has(w.slug)) continue;
		signalSlugs.add(w.slug);
		signalsRaw.push({ slug: w.slug, kind: 'saved' });
	}

	if (signalsRaw.length === 0) return [];

	const signalEmbeddings = await fetchSignalEmbeddings(sb, [...signalSlugs]);

	const signals: Signal[] = signalsRaw
		.map((s) => {
			const product = productBySlug.get(s.slug);
			if (!product) return null;
			return {
				slug: s.slug,
				kind: s.kind,
				weight: SIGNAL_WEIGHTS[s.kind],
				embedding: signalEmbeddings.get(s.slug) ?? null,
				brand: product.brand,
				priceCents: product.priceCents,
				categorySlug: product.categorySlug
			};
		})
		.filter((s): s is Signal => s !== null);

	if (signals.length === 0) return [];

	const seen = new Set(signals.map((s) => s.slug));

	// Try embedding-hybrid; fall back to rule-based when there isn't enough
	// signal in the embedding space (embeddings missing on every signal).
	const userVector = buildUserVector(signals);
	if (userVector) {
		const recs = await embeddingHybrid({
			sb,
			signals,
			userVector,
			seen,
			productBySlug
		});
		if (recs.length > 0) return recs;
	}

	return ruleBased({ signals, seen, allProducts, productBySlug });
}

// ---------- embedding-hybrid path ----------

async function embeddingHybrid(opts: {
	sb: NonNullable<SB>;
	signals: Signal[];
	userVector: number[];
	seen: Set<string>;
	productBySlug: Map<string, Product>;
}): Promise<Recommendation[]> {
	const { sb, signals, userVector, seen, productBySlug } = opts;

	const candidates = await fetchVectorCandidates(sb, userVector, CANDIDATES_LIMIT);
	if (candidates.length === 0) return [];

	// Aggregate user-side preferences for re-ranking.
	const brandWeights = new Map<string, number>();
	let priceTotal = 0;
	let priceWeightTotal = 0;
	for (const s of signals) {
		brandWeights.set(s.brand, (brandWeights.get(s.brand) ?? 0) + s.weight);
		priceTotal += s.priceCents * s.weight;
		priceWeightTotal += s.weight;
	}
	const userPriceCents = priceWeightTotal > 0 ? priceTotal / priceWeightTotal : 0;

	type Scored = {
		product: Product;
		similarity: number;
		score: number;
		brandHit: boolean;
		priceMatch: number;
	};

	const scored: Scored[] = [];
	for (const c of candidates) {
		if (seen.has(c.slug)) continue;
		const product = productBySlug.get(c.slug);
		if (!product) continue;

		const brandHit = (brandWeights.get(product.brand) ?? 0) > 0;
		const priceMatch = priceMatchScore(product.priceCents, userPriceCents);
		const featured = product.featured ? 1 : 0;

		const score =
			W_SIM * c.similarity +
			W_BRAND * (brandHit ? 1 : 0) +
			W_PRICE * priceMatch +
			W_FEATURED * featured;

		scored.push({ product, similarity: c.similarity, score, brandHit, priceMatch });
	}

	if (scored.length === 0) return [];

	scored.sort((a, b) => b.score - a.score);

	// Pick with a per-category cap, applying an overflow penalty if a third
	// candidate from a saturated category would otherwise win on raw score.
	const recs: Recommendation[] = [];
	const categoryCount = new Map<string, number>();

	while (recs.length < MAX_RECS && scored.length > 0) {
		// Re-score considering current category counts.
		let bestIdx = -1;
		let bestEffective = -Infinity;
		for (let i = 0; i < scored.length; i++) {
			const s = scored[i];
			const used = categoryCount.get(s.product.categorySlug) ?? 0;
			if (used >= MAX_PER_CATEGORY) continue;
			const effective = used >= 1 ? s.score * CATEGORY_OVERFLOW_PENALTY : s.score;
			if (effective > bestEffective) {
				bestEffective = effective;
				bestIdx = i;
			}
		}
		if (bestIdx === -1) break;

		const winner = scored.splice(bestIdx, 1)[0];
		const used = categoryCount.get(winner.product.categorySlug) ?? 0;
		categoryCount.set(winner.product.categorySlug, used + 1);

		recs.push({
			product: winner.product,
			reason: attributeReason(
				winner.product,
				winner.similarity,
				signals,
				brandWeights,
				productBySlug
			)
		});
	}

	return recs;
}

/**
 * Pick the most specific honest anchor for a candidate's reason chip.
 *
 *  - Same brand as a signal? Use that. The user can verify "yes, I do like
 *    Sony stuff" at a glance.
 *  - Otherwise: fall back to the strongest signal that shares the candidate's
 *    category. If none, the strongest signal overall (last resort — the user
 *    arrived here by vector similarity across categories).
 *
 * We deliberately don't refine the chip via candidate-level cosine; the
 * candidate's embedding isn't carried back from match_products and a second
 * round-trip just to refine the chip wording isn't worth the latency.
 */
function attributeReason(
	candidate: Product,
	candidateSimilarity: number,
	signals: Signal[],
	brandWeights: Map<string, number>,
	productBySlug: Map<string, Product>
) {
	const anchorName = (s: Signal) => productBySlug.get(s.slug)?.name ?? s.slug;
	const meta = { similarity: candidateSimilarity };

	if ((brandWeights.get(candidate.brand) ?? 0) > 0) {
		const anchor = signals
			.filter((s) => s.brand === candidate.brand)
			.sort((a, b) => b.weight - a.weight)[0];
		if (anchor) {
			return {
				kind: 'same_brand' as ReasonKind,
				anchorSlug: anchor.slug,
				anchorName: anchorName(anchor),
				category: candidate.categorySlug,
				brand: candidate.brand,
				...meta
			};
		}
	}

	const anchor =
		signals
			.filter((s) => s.categorySlug === candidate.categorySlug)
			.sort((a, b) => b.weight - a.weight)[0] ??
		[...signals].sort((a, b) => b.weight - a.weight)[0];

	return {
		kind: 'similar' as ReasonKind,
		anchorSlug: anchor.slug,
		anchorName: anchorName(anchor),
		category: candidate.categorySlug,
		...meta
	};
}

function priceMatchScore(candidateCents: number, userCents: number): number {
	if (userCents <= 0) return 0;
	const delta = Math.abs(candidateCents - userCents) / userCents;
	// Within 20% of the user's average → full credit; tapers to 0 at 100%.
	return Math.max(0, Math.min(1, 1 - delta));
}

function buildUserVector(signals: Signal[]): number[] | null {
	const withVec = signals.filter((s) => s.embedding && s.embedding.length > 0);
	if (withVec.length === 0) return null;
	const dim = withVec[0].embedding!.length;
	const out = new Array<number>(dim).fill(0);
	let totalWeight = 0;
	for (const s of withVec) {
		const v = s.embedding!;
		if (v.length !== dim) continue;
		for (let i = 0; i < dim; i++) out[i] += v[i] * s.weight;
		totalWeight += s.weight;
	}
	if (totalWeight === 0) return null;
	for (let i = 0; i < dim; i++) out[i] /= totalWeight;
	return out;
}

// ---------- rule-based fallback ----------

function ruleBased(opts: {
	signals: Signal[];
	seen: Set<string>;
	allProducts: Product[];
	productBySlug: Map<string, Product>;
}): Recommendation[] {
	const { signals, seen, allProducts, productBySlug } = opts;

	type CatScore = { score: number; anchorSlug: string; anchorKind: 'bought' | 'saved' };
	const byCategory = new Map<string, CatScore>();

	for (const sig of signals) {
		const cat = sig.categorySlug;
		const existing = byCategory.get(cat);
		if (!existing) {
			byCategory.set(cat, { score: sig.weight, anchorSlug: sig.slug, anchorKind: sig.kind });
			continue;
		}
		existing.score += sig.weight;
		if (sig.weight > SIGNAL_WEIGHTS[existing.anchorKind]) {
			existing.anchorSlug = sig.slug;
			existing.anchorKind = sig.kind;
		}
	}

	const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1].score - a[1].score);

	const recs: Recommendation[] = [];
	for (const [cat, info] of sortedCategories) {
		if (recs.length >= MAX_RECS) break;
		const anchor = productBySlug.get(info.anchorSlug);
		if (!anchor) continue;

		const candidates = allProducts
			.filter((p) => p.categorySlug === cat && !seen.has(p.slug))
			.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name));

		for (const candidate of candidates.slice(0, MAX_PER_CATEGORY)) {
			recs.push({
				product: candidate,
				reason: {
					kind: info.anchorKind,
					anchorSlug: anchor.slug,
					anchorName: anchor.name,
					category: cat
				}
			});
			if (recs.length >= MAX_RECS) break;
		}
	}

	return recs;
}

// ---------- supabase round-trips ----------

async function fetchOrderSlugs(sb: NonNullable<SB>, userId: string): Promise<string[]> {
	type Row = { order_items: { product_slug: string }[] | null };
	const { data, error } = await sb
		.from('orders')
		.select('order_items(product_slug)')
		.eq('user_id', userId)
		.in('status', ['paid', 'fulfilling', 'shipped', 'completed'])
		.limit(50);
	if (error || !data) return [];
	const slugs: string[] = [];
	for (const order of data as unknown as Row[]) {
		for (const item of order.order_items ?? []) {
			if (item.product_slug) slugs.push(item.product_slug);
		}
	}
	return slugs;
}

async function fetchSignalEmbeddings(
	sb: NonNullable<SB>,
	slugs: string[]
): Promise<Map<string, number[] | null>> {
	const map = new Map<string, number[] | null>();
	if (slugs.length === 0) return map;
	const { data, error } = await sb.from('products').select('slug, embedding').in('slug', slugs);
	if (error || !data) return map;
	for (const row of data as Array<{ slug: string; embedding: unknown }>) {
		map.set(row.slug, parseEmbedding(row.embedding));
	}
	return map;
}

async function fetchVectorCandidates(
	sb: NonNullable<SB>,
	userVector: number[],
	limit: number
): Promise<Array<{ slug: string; similarity: number }>> {
	const sbAny = sb as unknown as {
		rpc: (
			fn: string,
			args: Record<string, unknown>
		) => Promise<{
			data: Array<{ slug: string; similarity: number }> | null;
			error: unknown;
		}>;
	};
	const { data, error } = await sbAny.rpc('match_products', {
		query_embedding: userVector,
		category_slug: null,
		match_count: limit
	});
	if (error || !data) return [];
	return data;
}

/**
 * pgvector columns can come back as a number[] or as a JSON-formatted string
 * depending on the driver. Handle both shapes defensively.
 */
function parseEmbedding(raw: unknown): number[] | null {
	if (!raw) return null;
	if (Array.isArray(raw)) return raw as number[];
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? (parsed as number[]) : null;
		} catch {
			return null;
		}
	}
	return null;
}

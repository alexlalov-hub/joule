/**
 * Experiment B — visible vs hidden recommendation reasoning.
 *
 * The brief's second experiment asks whether visible reasoning (slug
 * citation chips + tool-call transparency) actually makes the shopper
 * trust a recommendation more, or whether it's just clutter.
 *
 * Method:
 *   1. For each prompt, run the grounded assistant once. The model uses
 *      the same tools and the same production system prompt either way —
 *      we're testing what the user sees, not what the model does.
 *   2. From that single response, build two variants:
 *        A (visible)  the response as-is, with [slug] brackets that the
 *                     production UI would render as link chips.
 *        B (hidden)   same prose, with [slug] brackets stripped and any
 *                     leftover whitespace tidied. Plain text — the
 *                     hypothetical "no reasoning visible" UI.
 *   3. Pass the two variants to an LLM judge (same model, separate call,
 *      different system prompt). The judge scores each variant 1–5 on
 *      trustworthiness, clarity, and felt-usefulness, picks a forced
 *      preference, and writes a one-sentence rationale. Order is
 *      randomized per pair to avoid position bias.
 *   4. Aggregate; write docs/experiment-b.md.
 *
 * Run:  npm run experiment:b
 * Required env: AI_GATEWAY_API_KEY
 */

import { config as loadEnv } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateObject, generateText, stepCountIs } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { products as seedProducts, categories as seedCategories } from '../src/lib/catalog/data';
import { SYSTEM_PROMPT as PRODUCTION_SYSTEM } from '../src/lib/server/ai/prompts';

loadEnv({ path: '.env.local' });
loadEnv();

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
	console.error('Missing AI_GATEWAY_API_KEY — set it in .env.local before running.');
	process.exit(1);
}

const MODEL = process.env.JOULE_ASSISTANT_MODEL ?? 'openai/gpt-4.1-mini';
const JUDGE_MODEL = process.env.JOULE_JUDGE_MODEL ?? MODEL;
const gateway = createGateway({ apiKey });

const PROMPTS = [
	'Recommend a thin laptop under €1500 for travel.',
	'I need wired headphones for an open-plan office.',
	'What is the best phone for camera quality you sell?',
	'Compare a small Mac desktop with a small Windows mini PC.',
	'Show me a noise-cancelling pair of headphones from Sony.',
	'Pick a tablet for an architect who sketches and reads PDFs.',
	'I want a smartwatch that lasts more than three days on one charge.',
	"What's the cheapest decent laptop you carry?",
	'I get wrist pain — recommend an ergonomic mouse.',
	"What's a good drone for travel videos?"
];

// ---------- catalog tools (mirror of src/lib/server/ai/tools.ts) ----------

const tools = {
	search_catalog: {
		description: 'Browse or search the Joule catalog.',
		inputSchema: z.object({
			query: z.string().optional(),
			category: z.string().optional(),
			limit: z.number().int().min(1).max(10).default(5)
		}),
		execute: async ({
			query,
			category,
			limit
		}: {
			query?: string;
			category?: string;
			limit: number;
		}) => {
			let scope = seedProducts;
			if (category) scope = scope.filter((p) => p.categorySlug === category);
			if (query) {
				const q = query.toLowerCase();
				const filtered = scope.filter(
					(p) =>
						p.name.toLowerCase().includes(q) ||
						p.brand.toLowerCase().includes(q) ||
						p.tagline.toLowerCase().includes(q)
				);
				if (filtered.length > 0) scope = filtered;
			}
			return {
				count: scope.length,
				results: scope.slice(0, limit).map((p) => ({
					slug: p.slug,
					name: p.name,
					brand: p.brand,
					category: p.categorySlug,
					price_eur: p.priceCents / 100,
					tagline: p.tagline
				}))
			};
		}
	},
	get_product: {
		description: 'Fetch full details for a single product by slug.',
		inputSchema: z.object({ slug: z.string() }),
		execute: async ({ slug }: { slug: string }) => {
			const p = seedProducts.find((x) => x.slug === slug);
			if (!p) return { found: false, slug };
			return {
				found: true,
				product: {
					slug: p.slug,
					name: p.name,
					brand: p.brand,
					price_eur: p.priceCents / 100,
					tagline: p.tagline,
					description: p.description,
					specs: p.specs
				}
			};
		}
	},
	list_categories: {
		description: 'List Joule departments.',
		inputSchema: z.object({}),
		execute: async () => ({
			categories: seedCategories.map((c) => ({ slug: c.slug, name: c.name }))
		})
	}
};

// ---------- variants ----------

function hideReasoning(text: string): string {
	// Strip [slug] brackets. The model emits them next to product names in
	// the form "the MacBook Air 13" (M4) [macbook-air-m4-13]" — removing
	// just the bracket leaves the prose intact.
	return text
		.replace(/\s*\[[a-z0-9][a-z0-9-]{1,80}\]/gi, '')
		.replace(/[ \t]+\./g, '.')
		.replace(/[ \t]{2,}/g, ' ')
		.trim();
}

// ---------- judge ----------

const JUDGE_SYSTEM = `You are an impartial reviewer evaluating two responses from a shopping assistant on Joule, a small online electronics store. Both responses answer the same shopper question and are generated by the same underlying model — the only difference is how product references are surfaced in the text.

You will be shown both responses labelled "Response 1" and "Response 2". Score each independently on three dimensions:

  - trustworthiness (1=feels like a sales pitch / could be hallucinated, 5=feels like a knowledgeable friend citing real facts)
  - clarity (1=hard to parse, 5=easy to read at a glance)
  - usefulness (1=does not help me decide, 5=I know exactly what to do next)

Then pick which response you would actually show to a shopper. You MUST pick one of "Response 1" or "Response 2" — no ties. Briefly state why in one short sentence.

Reply ONLY with the JSON the user requested. Do not include any other prose.`;

const JudgeSchema = z.object({
	scores: z.object({
		response_1: z.object({
			trustworthiness: z.number().int().min(1).max(5),
			clarity: z.number().int().min(1).max(5),
			usefulness: z.number().int().min(1).max(5)
		}),
		response_2: z.object({
			trustworthiness: z.number().int().min(1).max(5),
			clarity: z.number().int().min(1).max(5),
			usefulness: z.number().int().min(1).max(5)
		})
	}),
	preferred: z.enum(['response_1', 'response_2']),
	rationale: z.string().min(4).max(400)
});

type JudgeResult = z.infer<typeof JudgeSchema>;

async function judge(prompt: string, first: string, second: string): Promise<JudgeResult> {
	const result = await generateObject({
		model: gateway(JUDGE_MODEL),
		system: JUDGE_SYSTEM,
		schema: JudgeSchema,
		prompt: [
			`Shopper question: ${prompt}`,
			'',
			'Response 1:',
			first,
			'',
			'Response 2:',
			second
		].join('\n'),
		temperature: 0
	});
	return result.object;
}

// ---------- harness ----------

type Outcome = {
	prompt: string;
	rawResponse: string;
	visible: string;
	hidden: string;
	firstShown: 'visible' | 'hidden';
	judge: JudgeResult;
	preferredVariant: 'visible' | 'hidden';
};

async function runOne(prompt: string): Promise<Outcome> {
	const generated = await generateText({
		model: gateway(MODEL),
		system: PRODUCTION_SYSTEM,
		prompt,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		tools: tools as any,
		stopWhen: stepCountIs(6),
		temperature: 0.4
	});

	const visible = generated.text;
	const hidden = hideReasoning(visible);

	// Randomize which the judge sees first to avoid position bias.
	const visibleFirst = Math.random() < 0.5;
	const first = visibleFirst ? visible : hidden;
	const second = visibleFirst ? hidden : visible;

	const judgeResult = await judge(prompt, first, second);
	const preferredVariant: 'visible' | 'hidden' =
		judgeResult.preferred === 'response_1'
			? visibleFirst
				? 'visible'
				: 'hidden'
			: visibleFirst
				? 'hidden'
				: 'visible';

	return {
		prompt,
		rawResponse: visible,
		visible,
		hidden,
		firstShown: visibleFirst ? 'visible' : 'hidden',
		judge: judgeResult,
		preferredVariant
	};
}

function averageScores(
	outcomes: Outcome[],
	variant: 'visible' | 'hidden'
): { trust: number; clarity: number; useful: number } {
	const totals = { trust: 0, clarity: 0, useful: 0 };
	for (const o of outcomes) {
		const r1IsVisible = o.firstShown === 'visible';
		const scores =
			variant === 'visible'
				? r1IsVisible
					? o.judge.scores.response_1
					: o.judge.scores.response_2
				: r1IsVisible
					? o.judge.scores.response_2
					: o.judge.scores.response_1;
		totals.trust += scores.trustworthiness;
		totals.clarity += scores.clarity;
		totals.useful += scores.usefulness;
	}
	const n = outcomes.length || 1;
	return {
		trust: totals.trust / n,
		clarity: totals.clarity / n,
		useful: totals.useful / n
	};
}

function buildReport(outcomes: Outcome[]): string {
	const visibleAvg = averageScores(outcomes, 'visible');
	const hiddenAvg = averageScores(outcomes, 'hidden');
	const visibleWins = outcomes.filter((o) => o.preferredVariant === 'visible').length;
	const hiddenWins = outcomes.filter((o) => o.preferredVariant === 'hidden').length;

	const fmt = (n: number) => n.toFixed(2);

	const lines: string[] = [];
	lines.push('# Experiment B — Visible vs Hidden Recommendation Reasoning');
	lines.push('');
	lines.push(
		`Generated ${new Date().toISOString()} · model: \`${MODEL}\` · judge: \`${JUDGE_MODEL}\` · ${outcomes.length} prompts`
	);
	lines.push('');
	lines.push('## Method');
	lines.push('');
	lines.push(
		'Each prompt runs through the grounded assistant once. The single response is then served two ways — variant **visible** keeps the `[slug]` citation chips intact, variant **hidden** strips them. An LLM judge sees both (with order randomised per pair) and scores each on three dimensions, then picks one to show a shopper.'
	);
	lines.push('');
	lines.push(
		'Same model + same system prompt + same tools — only the user-visible reasoning differs. So this experiment is about UX, not grounding.'
	);
	lines.push('');
	lines.push('## Aggregate scores');
	lines.push('');
	lines.push('| Variant | Trustworthiness | Clarity | Usefulness | Forced preferences |');
	lines.push('|---|---:|---:|---:|---:|');
	lines.push(
		`| Visible (with slug chips) | ${fmt(visibleAvg.trust)} | ${fmt(visibleAvg.clarity)} | ${fmt(visibleAvg.useful)} | **${visibleWins} / ${outcomes.length}** |`
	);
	lines.push(
		`| Hidden (slugs stripped)   | ${fmt(hiddenAvg.trust)} | ${fmt(hiddenAvg.clarity)} | ${fmt(hiddenAvg.useful)} | **${hiddenWins} / ${outcomes.length}** |`
	);
	lines.push('');

	lines.push('## Per-prompt');
	lines.push('');
	for (const o of outcomes) {
		const r1IsVisible = o.firstShown === 'visible';
		const visibleScores = r1IsVisible ? o.judge.scores.response_1 : o.judge.scores.response_2;
		const hiddenScores = r1IsVisible ? o.judge.scores.response_2 : o.judge.scores.response_1;
		lines.push(`### Prompt — _${escapeMd(o.prompt)}_`);
		lines.push('');
		lines.push(
			`**Preferred:** ${o.preferredVariant === 'visible' ? 'visible (slug chips)' : 'hidden (plain prose)'} · **Judge saw ${o.firstShown} first**`
		);
		lines.push('');
		lines.push(
			`**Scores (trust / clarity / usefulness)** — visible: ${visibleScores.trustworthiness} / ${visibleScores.clarity} / ${visibleScores.usefulness} · hidden: ${hiddenScores.trustworthiness} / ${hiddenScores.clarity} / ${hiddenScores.usefulness}`
		);
		lines.push('');
		lines.push(`**Rationale:** ${escapeMd(o.judge.rationale)}`);
		lines.push('');
		lines.push('<details><summary>Visible variant</summary>');
		lines.push('');
		lines.push('```');
		lines.push(o.visible.trim());
		lines.push('```');
		lines.push('');
		lines.push('</details>');
		lines.push('');
		lines.push('<details><summary>Hidden variant</summary>');
		lines.push('');
		lines.push('```');
		lines.push(o.hidden.trim());
		lines.push('```');
		lines.push('');
		lines.push('</details>');
		lines.push('');
	}

	lines.push('## Caveats');
	lines.push('');
	lines.push(
		'- The judge is the same model family as the writer, which is a known weakness of LLM-as-judge — same biases on both sides. Cross-family judging (e.g. Claude judges GPT) would strengthen the result; we did not run that here.'
	);
	lines.push(
		'- Order randomisation only blocks the crudest position bias. Wording (which variant is labelled "Response 1") can still leak signal.'
	);
	lines.push(
		'- Sample size is small. Treat the headline as directional, not significant. Reasonable next step: 30+ prompts with bootstrap CIs.'
	);
	lines.push(
		'- The "hidden" variant strips only the `[slug]` brackets. Real-world removal of "reasoning" UI would also drop the tool-call chips, which the experiment cannot measure end-to-end without an actual user study.'
	);
	return lines.join('\n');
}

function escapeMd(s: string): string {
	return s.replace(/_/g, '\\_').replace(/\*/g, '\\*').replace(/\n/g, ' ');
}

async function main(): Promise<void> {
	console.log(`→ Running Experiment B across ${PROMPTS.length} prompts on ${MODEL}`);
	console.log(`  judge: ${JUDGE_MODEL}\n`);

	const outcomes: Outcome[] = [];
	for (const prompt of PROMPTS) {
		process.stdout.write(`  · "${prompt.slice(0, 60)}…"\n`);
		try {
			outcomes.push(await runOne(prompt));
		} catch (e) {
			console.error(`    ✗ failed: ${(e as Error).message}`);
		}
	}

	if (outcomes.length === 0) {
		console.error('All prompts failed — nothing to write.');
		process.exit(1);
	}

	const report = buildReport(outcomes);
	const outDir = path.join(process.cwd(), 'docs');
	await mkdir(outDir, { recursive: true });
	const outPath = path.join(outDir, 'experiment-b.md');
	await writeFile(outPath, report, 'utf8');
	console.log(`\n✓ Wrote ${path.relative(process.cwd(), outPath)}`);
}

main().catch((err) => {
	console.error('Experiment B failed:', err);
	process.exit(1);
});

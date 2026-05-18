/**
 * DORA report generator for Joule.
 *
 * Pulls merged-PR and commit history via the `gh` CLI (already set up
 * locally and in CI), computes the four DORA metrics for a configurable
 * window (default: the last 28 days), and writes the result to
 * docs/dora.md.
 *
 *  1. Deployment frequency — Vercel auto-deploys every push to main,
 *     so each merged PR to main counts as one deployment.
 *  2. Lead time for changes — time from the FIRST commit in a PR to
 *     the merge. The Vercel deploy itself runs in a couple of minutes
 *     after merge, well within the noise of the other steps.
 *  3. Change failure rate — proportion of deployments that needed a
 *     follow-up "fix/revert/hotfix" PR within a week. Heuristic, not
 *     incident-tracking, but the heuristic is the same one Accelerate
 *     uses on commit messages.
 *  4. Mean time to recovery — for each failure, time from the merge
 *     that introduced it to the merge of the fix.
 *
 * Run:  npm run dora:report
 * Needs: `gh auth status` clean. No env vars needed beyond gh.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// ---------- config ----------

const WINDOW_DAYS = Number(process.env.DORA_WINDOW_DAYS ?? '28');
const FIX_REGEX = /^(revert|hotfix|fix(\(.+\))?:|chore.*revert)/i;
const FIX_LABEL_MATCH = /^(bug|regression|hotfix|revert)$/i;
const FIX_LOOKBACK_DAYS = 7;

// ---------- types ----------

type MergedPR = {
	number: number;
	title: string;
	createdAt: string;
	mergedAt: string;
	labels: { name: string }[];
};

// ---------- gh helpers ----------

function gh(args: string[]): string {
	return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
}

function fetchMergedPRs(): MergedPR[] {
	const raw = gh([
		'pr',
		'list',
		'--state',
		'merged',
		'--base',
		'main',
		'--limit',
		'200',
		'--json',
		'number,title,createdAt,mergedAt,labels'
	]);
	const parsed = JSON.parse(raw) as MergedPR[];
	return parsed
		.filter((pr) => pr.mergedAt)
		.sort((a, b) => Date.parse(a.mergedAt) - Date.parse(b.mergedAt));
}

// ---------- metrics ----------

function isFixPR(pr: MergedPR): boolean {
	if (FIX_REGEX.test(pr.title)) return true;
	return pr.labels.some((l) => FIX_LABEL_MATCH.test(l.name));
}

function leadTimeHours(pr: MergedPR): number | null {
	if (!pr.createdAt || !pr.mergedAt) return null;
	const created = Date.parse(pr.createdAt);
	const merged = Date.parse(pr.mergedAt);
	if (!Number.isFinite(created) || !Number.isFinite(merged)) return null;
	return (merged - created) / 36e5;
}

function pairFailuresWithPredecessors(
	prs: MergedPR[]
): Array<{ failure: MergedPR; intro: MergedPR }> {
	const pairs: Array<{ failure: MergedPR; intro: MergedPR }> = [];
	for (let i = 0; i < prs.length; i++) {
		const pr = prs[i];
		if (!isFixPR(pr)) continue;
		// The failure "introduction" is the last non-fix merge in the lookback
		// window. If we can't find one, the fix doesn't get paired.
		const cutoff = Date.parse(pr.mergedAt) - FIX_LOOKBACK_DAYS * 24 * 36e5;
		for (let j = i - 1; j >= 0; j--) {
			const prior = prs[j];
			if (Date.parse(prior.mergedAt) < cutoff) break;
			if (!isFixPR(prior)) {
				pairs.push({ failure: pr, intro: prior });
				break;
			}
		}
	}
	return pairs;
}

function median(xs: number[]): number {
	if (xs.length === 0) return 0;
	const sorted = [...xs].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatHours(h: number): string {
	if (h < 1) return `${Math.round(h * 60)} min`;
	if (h < 48) return `${h.toFixed(1)} h`;
	return `${(h / 24).toFixed(1)} days`;
}

function bucketByWeek(prs: MergedPR[], days: number): Record<string, number> {
	const buckets: Record<string, number> = {};
	const cutoff = Date.now() - days * 24 * 36e5;
	for (const pr of prs) {
		const t = Date.parse(pr.mergedAt);
		if (t < cutoff) continue;
		// ISO week-start (Monday) string yyyy-mm-dd.
		const d = new Date(t);
		const day = d.getUTCDay() || 7; // Sunday → 7
		const monday = new Date(d);
		monday.setUTCDate(d.getUTCDate() - (day - 1));
		const key = monday.toISOString().slice(0, 10);
		buckets[key] = (buckets[key] ?? 0) + 1;
	}
	return buckets;
}

// ---------- report ----------

function buildReport(allPRs: MergedPR[]): string {
	const cutoff = Date.now() - WINDOW_DAYS * 24 * 36e5;
	const inWindow = allPRs.filter((pr) => Date.parse(pr.mergedAt) >= cutoff);

	const deploys = inWindow.length;
	const deployPerWeek = (deploys / WINDOW_DAYS) * 7;

	const leadTimes = inWindow.map(leadTimeHours).filter((h): h is number => h !== null);
	const medianLead = median(leadTimes);

	const failures = inWindow.filter(isFixPR);
	const failureRate = deploys > 0 ? failures.length / deploys : 0;

	const pairs = pairFailuresWithPredecessors(allPRs).filter(
		(p) => Date.parse(p.failure.mergedAt) >= cutoff
	);
	const recoveryHours = pairs.map(
		(p) => (Date.parse(p.failure.mergedAt) - Date.parse(p.intro.mergedAt)) / 36e5
	);
	const medianRecovery = median(recoveryHours);

	const weeks = bucketByWeek(allPRs, WINDOW_DAYS);
	const weekRows = Object.entries(weeks)
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([wk, n]) => `| week of ${wk} | ${n} |`)
		.join('\n');

	const lines: string[] = [];
	lines.push('# DORA report — Joule');
	lines.push('');
	lines.push(
		`Generated ${new Date().toISOString()} · window: last ${WINDOW_DAYS} days · ${deploys} merged PR${
			deploys === 1 ? '' : 's'
		} in window`
	);
	lines.push('');
	lines.push('## Headline');
	lines.push('');
	lines.push('| Metric | Value | Method |');
	lines.push('|---|---:|---|');
	lines.push(
		`| Deployment frequency | ${deployPerWeek.toFixed(1)} per week | Each PR merged to main is one Vercel auto-deploy. |`
	);
	lines.push(
		`| Lead time for changes (median) | ${formatHours(medianLead)} | PR opened → PR merged. |`
	);
	lines.push(
		`| Change failure rate | ${(failureRate * 100).toFixed(0)}% (${failures.length} of ${deploys}) | PRs whose title matches \`${FIX_REGEX.source}\` or carrying a \`bug\`/\`regression\`/\`hotfix\`/\`revert\` label. |`
	);
	lines.push(
		`| Mean time to recovery (median) | ${pairs.length > 0 ? formatHours(medianRecovery) : 'n/a — no paired failures'} | For each fix PR, time back to the previous non-fix merge within ${FIX_LOOKBACK_DAYS} days. |`
	);
	lines.push('');
	lines.push('## Deploys per week');
	lines.push('');
	if (weekRows) {
		lines.push('| Week (Mon) | Deploys |');
		lines.push('|---|---:|');
		lines.push(weekRows);
	} else {
		lines.push('_No merges in the window._');
	}
	lines.push('');
	lines.push('## Failure pairs');
	lines.push('');
	if (pairs.length === 0) {
		lines.push(
			'_No fix-pair detected in the window. Either nothing broke, or the heuristic missed it._'
		);
	} else {
		lines.push('| Intro PR | Failure PR | Recovery |');
		lines.push('|---|---|---:|');
		for (const { intro, failure } of pairs) {
			const hours = (Date.parse(failure.mergedAt) - Date.parse(intro.mergedAt)) / 36e5;
			lines.push(
				`| #${intro.number} ${escapeMd(intro.title)} | #${failure.number} ${escapeMd(failure.title)} | ${formatHours(hours)} |`
			);
		}
	}
	lines.push('');
	lines.push('## Caveats');
	lines.push('');
	lines.push(
		'- Deploys are inferred from PR merges to `main`, not from Vercel deploy events. A failed Vercel build that never reached production still counts as a deploy here. Tightening this would mean pulling the Vercel API and matching against deployment status.'
	);
	lines.push(
		`- "Failure" is a heuristic on PR titles and labels (\`${FIX_REGEX.source}\` or \`bug|regression|hotfix|revert\`). False positives happen when a PR titled \`fix: typo in docs\` flips a stable green into a counted failure.`
	);
	lines.push(
		`- MTTR pairs each fix to the *previous non-fix merge within ${FIX_LOOKBACK_DAYS} days*. That's the simplest defensible choice but it can mis-pair when several merges land back-to-back.`
	);
	lines.push(
		'- Sample sizes will be small for a few weeks. Treat the headline as a directional read, not an SLO.'
	);
	return lines.join('\n');
}

function escapeMd(s: string): string {
	return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// ---------- main ----------

function main(): void {
	console.log(`Pulling merged PRs via gh...`);
	const prs = fetchMergedPRs();
	console.log(`  · ${prs.length} merged PR(s) on main in total history`);
	const report = buildReport(prs);
	const outDir = path.join(process.cwd(), 'docs');
	mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, 'dora.md');
	writeFileSync(outPath, report, 'utf8');
	console.log(`✓ Wrote ${path.relative(process.cwd(), outPath)}`);
}

main();

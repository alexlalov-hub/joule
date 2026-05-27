#!/usr/bin/env node
/**
 * Provision the "Joule" quality gate in SonarQube via the REST API,
 * and apply it to the `joule` project.
 *
 * Idempotent — re-running converges to the spec below. Existing
 * conditions on the gate get wiped and rebuilt, so the gate
 * definition lives here, in git, and not in a SonarQube admin's head.
 *
 * What it does:
 *   1. Creates a quality gate named "Joule" (or no-ops if it exists).
 *   2. Removes any conditions currently attached to it.
 *   3. Adds the conditions in QUALITY_GATE below.
 *   4. Applies the gate to the `joule` project.
 *
 * Auth (either works):
 *   - SONAR_TOKEN — a token belonging to an admin user. SonarQube
 *     convention: passed as Basic auth username with an empty password.
 *   - SONAR_ADMIN_USER + SONAR_ADMIN_PASS — plain admin credentials.
 *     Useful right after first-run when you haven't generated a token
 *     yet.
 *
 * Host:
 *   - SONAR_HOST_URL (default http://localhost:9000).
 *
 * Usage:
 *   export SONAR_TOKEN=<admin-scoped-token>
 *   npm run sonar:setup
 */

import process from 'node:process';

const HOST = (process.env.SONAR_HOST_URL || 'http://localhost:9000').replace(/\/$/, '');
const TOKEN = process.env.SONAR_TOKEN;
const ADMIN_USER = process.env.SONAR_ADMIN_USER;
const ADMIN_PASS = process.env.SONAR_ADMIN_PASS;

if (!TOKEN && !(ADMIN_USER && ADMIN_PASS)) {
	console.error('Need either SONAR_TOKEN (admin-scoped) or SONAR_ADMIN_USER + SONAR_ADMIN_PASS.');
	process.exit(1);
}

const GATE_NAME = 'Joule';
const PROJECT_KEY = 'joule';

/**
 * Quality gate definition.
 *
 * The `op` is the FAILURE operator — "error when measured value [op]
 * threshold". So for "coverage must be at least 85%", the condition is
 * "error if `new_coverage` is LT 85".
 *
 * Ratings (maintainability / reliability / security): 1=A, 2=B, 3=C,
 * 4=D, 5=E. "error if rating GT 1" means anything worse than A fails.
 */
const QUALITY_GATE = [
	{
		metric: 'new_coverage',
		op: 'LT',
		error: '85',
		label: 'New code line coverage ≥ 85%'
	},
	{
		metric: 'new_branch_coverage',
		op: 'LT',
		error: '75',
		label: 'New code branch coverage ≥ 75%'
	},
	{
		metric: 'new_duplicated_lines_density',
		op: 'GT',
		error: '3',
		label: 'New code duplication < 3%'
	},
	{
		metric: 'new_maintainability_rating',
		op: 'GT',
		error: '1',
		label: 'New code maintainability ≤ A (no new code smells past A grade)'
	},
	{
		metric: 'new_reliability_rating',
		op: 'GT',
		error: '1',
		label: 'New code reliability ≤ A (no new bugs)'
	},
	{
		metric: 'new_security_rating',
		op: 'GT',
		error: '1',
		label: 'New code security ≤ A (no new vulnerabilities)'
	},
	{
		metric: 'new_security_hotspots_reviewed',
		op: 'LT',
		error: '100',
		label: 'All new security hotspots reviewed'
	}
];

function authHeader() {
	const user = TOKEN ?? ADMIN_USER;
	const pass = TOKEN ? '' : ADMIN_PASS;
	return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

async function api(path, opts = {}) {
	const method = opts.method ?? 'GET';
	const body = opts.body;
	const headers = {
		Authorization: authHeader(),
		Accept: 'application/json'
	};
	if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';

	const res = await fetch(`${HOST}${path}`, { method, headers, body });
	const text = await res.text();
	let payload;
	try {
		payload = text ? JSON.parse(text) : {};
	} catch {
		payload = text;
	}
	if (!res.ok) {
		throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(payload)}`);
	}
	return payload;
}

const form = (params) => new URLSearchParams(params).toString();

async function ensureGate() {
	const { qualitygates = [] } = await api('/api/qualitygates/list');
	const existing = qualitygates.find((g) => g.name === GATE_NAME);
	if (existing) {
		console.log(`[sonar-setup] gate "${GATE_NAME}" already exists (id ${existing.id})`);
		return;
	}
	console.log(`[sonar-setup] creating gate "${GATE_NAME}"`);
	await api('/api/qualitygates/create', {
		method: 'POST',
		body: form({ name: GATE_NAME })
	});
}

async function clearConditions() {
	const gate = await api(`/api/qualitygates/show?${form({ name: GATE_NAME })}`);
	const conditions = gate.conditions ?? [];
	for (const c of conditions) {
		console.log(`[sonar-setup]   - removing existing condition: ${c.metric}`);
		await api('/api/qualitygates/delete_condition', {
			method: 'POST',
			body: form({ id: c.id })
		});
	}
}

async function applyConditions() {
	for (const c of QUALITY_GATE) {
		console.log(`[sonar-setup]   + ${c.label}`);
		await api('/api/qualitygates/create_condition', {
			method: 'POST',
			body: form({ gateName: GATE_NAME, metric: c.metric, op: c.op, error: c.error })
		});
	}
}

async function applyToProject() {
	try {
		await api('/api/qualitygates/select', {
			method: 'POST',
			body: form({ projectKey: PROJECT_KEY, gateName: GATE_NAME })
		});
		console.log(`[sonar-setup] applied "${GATE_NAME}" to project "${PROJECT_KEY}"`);
	} catch (err) {
		console.warn(
			`[sonar-setup] could not apply to project "${PROJECT_KEY}": ${err.message}\n` +
				`[sonar-setup] this is expected if you haven't run an initial scan yet —\n` +
				`             run "npm run sonar:scan" once to register the project, then\n` +
				`             re-run "npm run sonar:setup".`
		);
	}
}

async function main() {
	console.log(`[sonar-setup] target: ${HOST}`);
	await ensureGate();
	await clearConditions();
	await applyConditions();
	await applyToProject();
	console.log('[sonar-setup] done.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

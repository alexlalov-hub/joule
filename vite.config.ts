import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		expect: { requireAssertions: true },
		coverage: {
			// lcov is what SonarCloud expects; text + html make local runs readable.
			reporter: ['text', 'html', 'lcov'],
			reportsDirectory: './coverage',
			// Coverage scope is the logic tier under src/lib/. Routes (+page.server.ts,
			// +server.ts) are exercised by BDD; Svelte components by manual UX testing
			// and the same BDD scenarios. Trying to hit a line-coverage target on the
			// whole app would produce hollow render-and-don't-throw tests that don't
			// actually catch regressions.
			include: ['src/lib/**/*.ts'],
			exclude: [
				'src/lib/**/*.d.ts',
				'src/lib/server/db/types.ts',
				// AI streaming endpoints — exercised end-to-end by Experiments A + B
				// and the L2 BDD scenarios, not by unit tests.
				'src/lib/server/ai/assistant.ts',
				'src/lib/server/ai/compare.ts',
				'src/lib/server/ai/review-intelligence.ts',
				'src/lib/server/ai/gateway.ts',
				// Static prompt text — nothing to test.
				'src/lib/server/ai/prompts.ts',
				// Lazy supabase-admin singleton — testing it would require mocking
				// the supabase client itself, which isn't useful.
				'src/lib/server/supabaseAdmin.ts',
				'src/lib/server/stripe.ts',
				// Svelte 5 rune store: $state/$derived are runtime-bound by the
				// Svelte compiler and don't run cleanly under node. Exercised by
				// the compare-tray BDD scenario instead.
				'src/lib/compare/store.svelte.ts',
				// Browser-only Supabase client constructor — runs in the layout
				// load, not in any unit-testable path.
				'src/lib/supabase/client.ts'
			],
			// CI gate: drops below these and `npm run test:coverage` exits
			// non-zero, which fails the SonarCloud workflow + any PR check
			// downstream. Conservative leeway under the actuals (lines 96%,
			// branches 85%, functions 96%) so a small refactor doesn't
			// immediately break the build.
			thresholds: {
				lines: 85,
				branches: 75,
				functions: 80,
				statements: 85
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					// Unit tests live under tests/unit/ in a layout that mirrors src/.
					// Anything matching the .svelte test suffix runs as a separate
					// browser/jsdom project (none currently, but the exclude keeps
					// the option open).
					include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
					exclude: ['tests/unit/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

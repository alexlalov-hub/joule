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
			include: ['src/**/*.{ts,svelte}'],
			exclude: [
				'src/**/*.d.ts',
				'src/lib/server/db/types.ts',
				'src/app.d.ts',
				'src/app.html',
				'tests/**'
			]
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

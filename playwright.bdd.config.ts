import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Layer 2 scenarios (tagged @ai) hit live model endpoints and require an
// AI_GATEWAY_API_KEY. Skip them when the key isn't configured — CI without
// a gateway key simply won't run them, while local dev with the key will.
const aiAvailable = Boolean(process.env.AI_GATEWAY_API_KEY);
const tagsExpression = aiAvailable ? undefined : 'not @ai';

const testDir = defineBddConfig({
	features: 'tests/bdd/features/**/*.feature',
	steps: 'tests/bdd/steps/*.ts',
	tags: tagsExpression
});

export default defineConfig({
	testDir,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 180_000
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});

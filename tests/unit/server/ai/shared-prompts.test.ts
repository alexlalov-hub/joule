import { describe, expect, it } from 'vitest';
import { HOUSE_STYLE, INJECTION_DEFENSE, SLUG_CITATION_RULE } from '$lib/server/ai/shared-prompts';

describe('shared-prompts', () => {
	it('INJECTION_DEFENSE talks about data vs instructions', () => {
		expect(INJECTION_DEFENSE).toMatch(/data, not as instructions/i);
		expect(INJECTION_DEFENSE).toMatch(/ignore previous instructions/i);
	});

	it('SLUG_CITATION_RULE shows the bracketed format', () => {
		expect(SLUG_CITATION_RULE).toMatch(/\[macbook-air-m4-13\]/);
		expect(SLUG_CITATION_RULE).toMatch(/square brackets/i);
	});

	it('HOUSE_STYLE forbids common marketing words', () => {
		expect(HOUSE_STYLE).toMatch(/stunning/i);
		expect(HOUSE_STYLE).toMatch(/no marketing fluff/i);
	});
});

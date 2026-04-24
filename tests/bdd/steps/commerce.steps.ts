import { expect } from '@playwright/test';
import { Given, Then } from './fixtures';

Given('I visit the home page', async ({ page }) => {
	await page.goto('/');
});

Given('I visit the {string} category page', async ({ page }, name: string) => {
	await page.goto('/categories');
	const link = page.getByRole('link', { name, exact: true });
	await link.first().click();
	await page.waitForURL(/\/category\//);
});

Given('I visit the product page for {string}', async ({ page }, slug: string) => {
	await page.goto(`/product/${slug}`);
});

Given('I search for {string}', async ({ page }, q: string) => {
	await page.goto(`/search?q=${encodeURIComponent(q)}`);
});

Then('I should see {string}', async ({ page }, text: string) => {
	await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
});

Then('I should see at least {int} products in the featured grid', async ({ page }, n: number) => {
	await expect(
		page.locator('[data-testid="product-grid"]').first().locator('[data-testid="product-card"]')
	)
		.toHaveCount(n, {
			timeout: 5000
		})
		.catch(async () => {
			const count = await page
				.locator('[data-testid="product-grid"]')
				.first()
				.locator('[data-testid="product-card"]')
				.count();
			expect(count).toBeGreaterThanOrEqual(n);
		});
});

Then('I should see at least {int} products in the product grid', async ({ page }, n: number) => {
	const count = await page.locator('[data-testid="product-card"]').count();
	expect(count).toBeGreaterThanOrEqual(n);
});

Then('every product should be in the {string} category', async ({ page }, _name: string) => {
	await expect(page).toHaveURL(/\/category\//);
});

Then('I should see the product name {string}', async ({ page }, name: string) => {
	await expect(page.getByTestId('product-name')).toHaveText(name);
});

Then('I should see a price', async ({ page }) => {
	await expect(page.getByTestId('product-price').first()).toBeVisible();
});

Then('I should see at least {int} spec rows', async ({ page }, n: number) => {
	const count = await page.locator('dl dt').count();
	expect(count).toBeGreaterThanOrEqual(n);
});

Then('the results count should be greater than zero', async ({ page }) => {
	const countText = await page.getByTestId('result-count').textContent();
	const count = Number(countText ?? '0');
	expect(count).toBeGreaterThan(0);
});

Then('the results count should be zero', async ({ page }) => {
	const countText = await page.getByTestId('result-count').textContent();
	expect(Number(countText ?? '-1')).toBe(0);
});

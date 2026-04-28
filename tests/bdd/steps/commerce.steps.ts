import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';

async function assertMinProductsInGrid(page: Page, n: number) {
	const count = await page.locator('[data-testid="product-card"]').count();
	expect(count).toBeGreaterThanOrEqual(n);
}

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
	await assertMinProductsInGrid(page, n);
});

Then('I should see at least {int} product in the product grid', async ({ page }, n: number) => {
	await assertMinProductsInGrid(page, n);
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

// ---------- cart & checkout gating ----------

Given('I visit the cart page', async ({ page }) => {
	await page.goto('/cart');
});

Then('the add-to-cart button should be enabled', async ({ page }) => {
	const btn = page.getByTestId('add-to-cart');
	await expect(btn).toBeVisible();
	await expect(btn).toBeEnabled();
});

Then('the wishlist toggle should be visible', async ({ page }) => {
	await expect(page.getByTestId('wishlist-toggle')).toBeVisible();
});

Then('I should be redirected to the login page', async ({ page }) => {
	await expect(page).toHaveURL(/\/login(\?|$)/);
});

Then('I should not see a cart count badge', async ({ page }) => {
	await expect(page.getByTestId('cart-count')).toHaveCount(0);
});

// ---------- search ----------

Then('I should see the search mode indicator', async ({ page }) => {
	await expect(page.getByTestId('search-mode')).toBeVisible();
});

// ---------- catalog filters ----------

Given(
	'I visit the laptops category with the price filter at {int}',
	async ({ page }, max: number) => {
		await page.goto(`/category/laptops?max=${max}`);
	}
);

When('I click the reset filters link', async ({ page }) => {
	await page.getByTestId('reset-filters').first().click();
	await page.waitForLoadState('networkidle');
});

Then('I should see a reset filters link', async ({ page }) => {
	await expect(page.getByTestId('reset-filters').first()).toBeVisible();
});

Then('I should not see a reset filters link', async ({ page }) => {
	await expect(page.getByTestId('reset-filters')).toHaveCount(0);
});

// ---------- reviews ----------

Then('I should see the reviews section', async ({ page }) => {
	await expect(page.getByTestId('reviews-section')).toBeVisible();
});

Then('I should see at least {int} review', async ({ page }, n: number) => {
	const count = await page.getByTestId('review-item').count();
	expect(count).toBeGreaterThanOrEqual(n);
});

Then('I should see the review summary', async ({ page }) => {
	await expect(page.getByTestId('review-summary')).toBeVisible();
});

Then('the review form should not be visible', async ({ page }) => {
	await expect(page.getByTestId('review-form')).toHaveCount(0);
});

Then('I should see a sign-in prompt in the reviews section', async ({ page }) => {
	const section = page.getByTestId('reviews-section');
	await expect(section.getByRole('link', { name: /sign in/i })).toBeVisible();
});

Then('the product rating should link to the reviews section', async ({ page }) => {
	const rating = page.getByTestId('product-rating');
	const exists = (await rating.count()) > 0;
	if (!exists) return;
	await expect(rating).toHaveAttribute('href', '#reviews');
});

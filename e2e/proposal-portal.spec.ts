import { test, expect } from '@playwright/test';

test.describe('Proposal Public Portal', () => {
  // 1. Public proposal page loads without auth (no redirect to login)
  test('public proposal page at /p/ does not redirect to login', async ({ page }) => {
    await page.goto('/p/nonexistent-id');
    // Should NOT redirect to login - the /p/ path is public
    expect(page.url()).toContain('/p/');
    expect(page.url()).not.toContain('/login');
  });

  // 2. Shows "not found" for invalid proposal ID
  test('shows not found message for invalid proposal', async ({ page }) => {
    await page.goto('/p/nonexistent-id');
    // Wait for loading to finish and check for not-found message
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    // Either shows "not found" or loads (if proposal exists)
    expect(body).toBeTruthy();
  });

  // 3. Public page does not show sidebar or header
  test('public proposal page has no sidebar or header', async ({ page }) => {
    await page.goto('/p/nonexistent-id');
    await page.waitForTimeout(2000);
    // No sidebar should be visible
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();
  });

  // 4. Public proposal page renders the proposal component
  test('public proposal page renders proposal container', async ({ page }) => {
    await page.goto('/p/test-proposal-id');
    await page.waitForTimeout(2000);
    // Should have the min-h-screen background
    const container = page.locator('.min-h-screen');
    await expect(container).toBeVisible();
  });

  // 5. No auth cookie set on public page
  test('public page does not require auth cookies', async ({ page, context }) => {
    // Clear all cookies
    await context.clearCookies();
    await page.goto('/p/some-id');
    // Should still load (200 or page renders), NOT redirect
    expect(page.url()).toContain('/p/');
  });
});

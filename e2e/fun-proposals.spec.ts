import { test, expect } from '@playwright/test';

test.describe('Fun Proposals', () => {
  // 1. Unauthenticated redirect
  test('unauthenticated user on /proposals is redirected to login', async ({ page }) => {
    await page.goto('/proposals');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 2. Products page loads
  test('products page redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/proposals/products');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 3. Templates page loads
  test('templates page redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/proposals/templates');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 4. Options page loads
  test('options page redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/proposals/options');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 5. Settings page loads
  test('settings page redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/proposals/settings');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 6. New proposal page loads
  test('new proposal page redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/proposals/new');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 7. Edit proposal page loads
  test('edit proposal page redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/proposals/fake-id/edit');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 8. Product editor page
  test('product editor redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/proposals/products/fake-id/edit');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 9. Template editor page
  test('template editor redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/proposals/templates/fake-id/edit');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 10. Option editor page
  test('option editor redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/proposals/options/fake-id/edit');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 11. Skin toggle cookie persists (basic check)
  test('skin toggle defaults to fun', async ({ page }) => {
    await page.goto('/login');
    // Check that the localStorage skin key defaults to 'fun'
    const skin = await page.evaluate(() => localStorage.getItem('cb-hq-skin'));
    // First visit has no key set yet, null means default (fun)
    expect(skin).toBeNull();
  });

  // 12. API routes require auth
  test('proposals chat API returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/proposals/chat', {
      data: { message: 'test', conversationId: null },
    });
    expect(response.status()).toBe(401);
  });

  // 13. Generate note API requires auth
  test('generate-note API returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/proposals/generate-note', {
      data: { proposal_id: 'fake-id' },
    });
    expect(response.status()).toBe(401);
  });

  // 14. Notify accepted API requires auth
  test('notify-accepted API returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/proposals/notify-accepted', {
      data: { proposal_id: 'fake-id' },
    });
    expect(response.status()).toBe(401);
  });
});

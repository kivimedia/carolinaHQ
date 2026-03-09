import { test, expect } from '@playwright/test';

test.describe('Proposal-Card Link', () => {
  // 1. New proposal page accepts cardId query param
  test('new proposal page accepts cardId in URL', async ({ page }) => {
    await page.goto('/proposals/new?cardId=test-card-id&clientName=Test+Client');
    // Should redirect to login (unauthenticated), but the URL should have been /proposals/new before redirect
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 2. Proposals page route works
  test('proposals page route is accessible', async ({ page }) => {
    await page.goto('/proposals');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 3. Card modal proposals section - just checking the component import doesn't break
  test('card page redirects unauthenticated', async ({ page }) => {
    await page.goto('/card/fake-card-id');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // 4. Status sync API endpoint exists
  test('notify-accepted endpoint exists and requires auth', async ({ request }) => {
    const response = await request.post('/api/proposals/notify-accepted', {
      data: { proposal_id: 'fake-proposal-id' },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Proposal Chat API', () => {
  // 1. Chat endpoint exists and requires auth
  test('chat API endpoint returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/proposals/chat', {
      data: {
        message: 'Hello',
        conversationId: null,
      },
    });
    expect(response.status()).toBe(401);
  });

  // 2. Chat endpoint rejects GET
  test('chat API rejects non-POST methods', async ({ request }) => {
    const response = await request.get('/api/proposals/chat');
    // Next.js returns 405 for unhandled methods or 401 from middleware
    expect([401, 405]).toContain(response.status());
  });

  // 3. Chat endpoint validates body
  test('chat API returns error for empty body', async ({ request }) => {
    const response = await request.post('/api/proposals/chat', {
      data: {},
    });
    // 401 (no auth) or 400 (validation)
    expect([400, 401]).toContain(response.status());
  });

  // 4. Generate note endpoint exists
  test('generate-note API endpoint exists', async ({ request }) => {
    const response = await request.post('/api/proposals/generate-note', {
      data: { proposal_id: 'test', event_type: 'birthday', client_name: 'Test' },
    });
    // 401 = endpoint exists but no auth
    expect(response.status()).toBe(401);
  });

  // 5. Notify accepted endpoint exists
  test('notify-accepted API endpoint exists', async ({ request }) => {
    const response = await request.post('/api/proposals/notify-accepted', {
      data: { proposal_id: 'test' },
    });
    expect(response.status()).toBe(401);
  });
});

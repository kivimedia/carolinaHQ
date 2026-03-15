import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

// We test the webhook handler by importing the POST function directly.
// Need to mock NextRequest/NextResponse from next/server.
vi.mock('next/server', () => {
  return {
    NextRequest: class {
      private _body: string;
      private _headers: Map<string, string>;

      constructor(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
        this._body = init?.body ?? '';
        this._headers = new Map(Object.entries(init?.headers ?? {}));
      }

      async text() {
        return this._body;
      }

      get headers() {
        return {
          get: (name: string) => this._headers.get(name) ?? null,
        };
      }
    },
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => ({
        body,
        status: init?.status ?? 200,
        json: () => Promise.resolve(body),
      }),
    },
  };
});

describe('QuickBooks Webhook', () => {
  const VERIFIER_TOKEN = 'bd45876c-a499-48be-bf25-5c4a3bcbbd46';

  beforeEach(() => {
    process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN = VERIFIER_TOKEN;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN;
    vi.resetModules();
  });

  function signPayload(payload: string): string {
    return createHmac('sha256', VERIFIER_TOKEN).update(payload).digest('base64');
  }

  function createWebhookPayload(events: Array<{
    realmId: string;
    entities: Array<{ name: string; id: string; operation: string; lastUpdated: string }>;
  }>) {
    return JSON.stringify({
      eventNotifications: events.map((e) => ({
        realmId: e.realmId,
        dataChangeEvent: { entities: e.entities },
      })),
    });
  }

  it('accepts validly signed webhook and returns 200', async () => {
    const { POST } = await import('@/app/api/quickbooks/webhook/route');
    const { NextRequest } = await import('next/server');

    const body = createWebhookPayload([
      {
        realmId: 'realm-123',
        entities: [
          { name: 'Invoice', id: '101', operation: 'Create', lastUpdated: '2026-03-15T12:00:00Z' },
        ],
      },
    ]);

    const signature = signPayload(body);
    const request = new NextRequest('https://example.com/api/quickbooks/webhook', {
      method: 'POST',
      body,
      headers: { 'intuit-signature': signature },
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('rejects webhook with invalid signature', async () => {
    const { POST } = await import('@/app/api/quickbooks/webhook/route');
    const { NextRequest } = await import('next/server');

    const body = createWebhookPayload([
      {
        realmId: 'realm-123',
        entities: [
          { name: 'Payment', id: '200', operation: 'Update', lastUpdated: '2026-03-15T12:00:00Z' },
        ],
      },
    ]);

    const request = new NextRequest('https://example.com/api/quickbooks/webhook', {
      method: 'POST',
      body,
      headers: { 'intuit-signature': 'invalid-signature' },
    });

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });

  it('rejects webhook with missing signature header', async () => {
    const { POST } = await import('@/app/api/quickbooks/webhook/route');
    const { NextRequest } = await import('next/server');

    const body = createWebhookPayload([]);
    const request = new NextRequest('https://example.com/api/quickbooks/webhook', {
      method: 'POST',
      body,
      headers: {},
    });

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });

  it('handles multiple event notifications in a single webhook', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { POST } = await import('@/app/api/quickbooks/webhook/route');
    const { NextRequest } = await import('next/server');

    const body = createWebhookPayload([
      {
        realmId: 'realm-123',
        entities: [
          { name: 'Invoice', id: '101', operation: 'Create', lastUpdated: '2026-03-15T12:00:00Z' },
          { name: 'Customer', id: '42', operation: 'Update', lastUpdated: '2026-03-15T12:01:00Z' },
        ],
      },
      {
        realmId: 'realm-456',
        entities: [
          { name: 'Payment', id: '200', operation: 'Create', lastUpdated: '2026-03-15T12:02:00Z' },
        ],
      },
    ]);

    const signature = signPayload(body);
    const request = new NextRequest('https://example.com/api/quickbooks/webhook', {
      method: 'POST',
      body,
      headers: { 'intuit-signature': signature },
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);

    // Should have logged 3 events
    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(logSpy.mock.calls[0][0]).toContain('Create Invoice #101');
    expect(logSpy.mock.calls[1][0]).toContain('Update Customer #42');
    expect(logSpy.mock.calls[2][0]).toContain('Create Payment #200');

    logSpy.mockRestore();
  });

  it('returns 200 even on processing errors to prevent webhook disabling', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { POST } = await import('@/app/api/quickbooks/webhook/route');
    const { NextRequest } = await import('next/server');

    // Send malformed JSON with valid signature
    const body = 'not-json';
    const signature = signPayload(body);
    const request = new NextRequest('https://example.com/api/quickbooks/webhook', {
      method: 'POST',
      body,
      headers: { 'intuit-signature': signature },
    });

    const response = await POST(request as any);
    // Should still return 200 to prevent Intuit from disabling the webhook
    expect(response.status).toBe(200);

    errorSpy.mockRestore();
  });
});

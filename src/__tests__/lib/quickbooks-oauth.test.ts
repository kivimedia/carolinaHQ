import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('QuickBooks OAuth', () => {
  beforeEach(() => {
    process.env.QUICKBOOKS_CLIENT_ID = 'test-client-id';
    process.env.QUICKBOOKS_CLIENT_SECRET = 'test-client-secret';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://carolina-hq.vercel.app';
    mockFetch.mockReset();
  });

  afterEach(() => {
    delete process.env.QUICKBOOKS_CLIENT_ID;
    delete process.env.QUICKBOOKS_CLIENT_SECRET;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.resetModules();
  });

  describe('getAuthorizationUrl', () => {
    it('builds a valid Intuit authorization URL with all required params', async () => {
      const { getAuthorizationUrl } = await import('@/lib/quickbooks/oauth');
      const url = getAuthorizationUrl('test-state-123');

      expect(url).toContain('https://appcenter.intuit.com/connect/oauth2');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=com.intuit.quickbooks.accounting');
      expect(url).toContain('state=test-state-123');
    });

    it('uses NEXT_PUBLIC_SITE_URL for redirect URI', async () => {
      const { getAuthorizationUrl } = await import('@/lib/quickbooks/oauth');
      const url = getAuthorizationUrl('state');

      expect(url).toContain(
        encodeURIComponent('https://carolina-hq.vercel.app/api/integrations/quickbooks/callback'),
      );
    });

    it('falls back to localhost when no site URL is set', async () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXTAUTH_URL;

      vi.resetModules();
      const { getAuthorizationUrl } = await import('@/lib/quickbooks/oauth');
      const url = getAuthorizationUrl('state');

      expect(url).toContain(encodeURIComponent('http://localhost:3000'));
    });

    it('throws when QUICKBOOKS_CLIENT_ID is not set', async () => {
      delete process.env.QUICKBOOKS_CLIENT_ID;
      vi.resetModules();
      const { getAuthorizationUrl } = await import('@/lib/quickbooks/oauth');

      expect(() => getAuthorizationUrl('state')).toThrow('QUICKBOOKS_CLIENT_ID not set');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('exchanges authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
        token_type: 'bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokens),
      });

      const { exchangeCodeForTokens } = await import('@/lib/quickbooks/oauth');
      const result = await exchangeCodeForTokens('auth-code-789');

      expect(result).toEqual(mockTokens);
      expect(mockFetch).toHaveBeenCalledOnce();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toMatch(/^Basic /);
      expect(options.headers['Accept']).toBe('application/json');

      const body = new URLSearchParams(options.body);
      expect(body.get('code')).toBe('auth-code-789');
      expect(body.get('grant_type')).toBe('authorization_code');
    });

    it('uses Basic auth with base64-encoded client credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { exchangeCodeForTokens } = await import('@/lib/quickbooks/oauth');
      await exchangeCodeForTokens('code');

      const authHeader = mockFetch.mock.calls[0][1].headers['Authorization'];
      const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('test-client-id:test-client-secret');
    });

    it('throws on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      const { exchangeCodeForTokens } = await import('@/lib/quickbooks/oauth');
      await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow(
        'QuickBooks token exchange failed: 400 Bad Request',
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('refreshes using the refresh_token grant type', async () => {
      const newTokens = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
        token_type: 'bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newTokens),
      });

      const { refreshAccessToken } = await import('@/lib/quickbooks/oauth');
      const result = await refreshAccessToken('old-refresh-token');

      expect(result).toEqual(newTokens);

      const body = new URLSearchParams(mockFetch.mock.calls[0][1].body);
      expect(body.get('refresh_token')).toBe('old-refresh-token');
      expect(body.get('grant_type')).toBe('refresh_token');
    });

    it('throws on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const { refreshAccessToken } = await import('@/lib/quickbooks/oauth');
      await expect(refreshAccessToken('expired')).rejects.toThrow(
        'QuickBooks token refresh failed: 401',
      );
    });
  });

  describe('revokeToken', () => {
    it('sends revocation request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { revokeToken } = await import('@/lib/quickbooks/oauth');
      await revokeToken('token-to-revoke');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://developer.api.intuit.com/v2/oauth2/tokens/revoke');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(options.body)).toEqual({ token: 'token-to-revoke' });
    });

    it('does not throw on revocation failure (warns instead)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

      const { revokeToken } = await import('@/lib/quickbooks/oauth');
      await expect(revokeToken('already-revoked')).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith('QuickBooks token revocation returned', 400);
      warnSpy.mockRestore();
    });
  });
});

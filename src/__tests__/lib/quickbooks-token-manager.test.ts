import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock encryption module
vi.mock('@/lib/encryption', () => ({
  encryptToHex: vi.fn((val: string) => `encrypted:${val}`),
  decryptFromHex: vi.fn((val: string) => val.replace('encrypted:', '')),
}));

// Mock oauth module
vi.mock('@/lib/quickbooks/oauth', () => ({
  refreshAccessToken: vi.fn(),
}));

import { encryptToHex, decryptFromHex } from '@/lib/encryption';
import { refreshAccessToken } from '@/lib/quickbooks/oauth';
import {
  storeTokens,
  getValidAccessToken,
  getIntegrationStatus,
  removeTokens,
} from '@/lib/quickbooks/token-manager';

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chainable: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return {
    from: vi.fn(() => chainable),
    _chain: chainable,
  };
}

const mockTokens = {
  access_token: 'access-123',
  refresh_token: 'refresh-456',
  expires_in: 3600,
  x_refresh_token_expires_in: 8726400,
  token_type: 'bearer',
};

describe('QuickBooks Token Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('storeTokens', () => {
    it('encrypts and upserts tokens into quickbooks_integrations', async () => {
      const supabase = createMockSupabase();

      await storeTokens(supabase as any, 'user-1', mockTokens, 'realm-123', 'Test Co');

      expect(supabase.from).toHaveBeenCalledWith('quickbooks_integrations');
      expect(encryptToHex).toHaveBeenCalledWith('access-123');
      expect(encryptToHex).toHaveBeenCalledWith('refresh-456');

      const upsertCall = (supabase._chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0];
      const row = upsertCall[0];
      expect(row.user_id).toBe('user-1');
      expect(row.realm_id).toBe('realm-123');
      expect(row.access_token_encrypted).toBe('encrypted:access-123');
      expect(row.refresh_token_encrypted).toBe('encrypted:refresh-456');
      expect(row.company_name).toBe('Test Co');
      expect(row.is_active).toBe(true);
      expect(upsertCall[1]).toEqual({ onConflict: 'user_id' });
    });

    it('throws when upsert fails', async () => {
      const supabase = createMockSupabase({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      });

      await expect(
        storeTokens(supabase as any, 'user-1', mockTokens, 'realm-123'),
      ).rejects.toThrow('Failed to store QuickBooks tokens: DB error');
    });
  });

  describe('getValidAccessToken', () => {
    it('returns decrypted token when not expired', async () => {
      const futureExpiry = new Date(Date.now() + 600_000).toISOString(); // 10min from now

      const supabase = createMockSupabase({
        single: vi.fn().mockResolvedValue({
          data: {
            access_token_encrypted: 'encrypted:valid-token',
            refresh_token_encrypted: 'encrypted:refresh-token',
            token_expires_at: futureExpiry,
            refresh_token_expires_at: new Date(Date.now() + 86400_000).toISOString(),
            realm_id: 'realm-123',
            is_active: true,
          },
          error: null,
        }),
      });

      const result = await getValidAccessToken(supabase as any, 'user-1');

      expect(result).toEqual({ accessToken: 'valid-token', realmId: 'realm-123' });
      expect(decryptFromHex).toHaveBeenCalledWith('encrypted:valid-token');
    });

    it('returns null when no integration exists', async () => {
      const supabase = createMockSupabase({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });

      const result = await getValidAccessToken(supabase as any, 'user-1');
      expect(result).toBeNull();
    });

    it('refreshes expired access token automatically', async () => {
      const expiredTime = new Date(Date.now() - 1000).toISOString(); // already expired
      const refreshExpiry = new Date(Date.now() + 86400_000).toISOString(); // refresh still valid

      const supabase = createMockSupabase({
        single: vi.fn().mockResolvedValue({
          data: {
            access_token_encrypted: 'encrypted:old-token',
            refresh_token_encrypted: 'encrypted:refresh-token',
            token_expires_at: expiredTime,
            refresh_token_expires_at: refreshExpiry,
            realm_id: 'realm-456',
            is_active: true,
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      });

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
        token_type: 'bearer',
      };

      (refreshAccessToken as ReturnType<typeof vi.fn>).mockResolvedValueOnce(newTokens);

      const result = await getValidAccessToken(supabase as any, 'user-1');

      expect(refreshAccessToken).toHaveBeenCalledWith('refresh-token');
      expect(result).toEqual({ accessToken: 'new-access-token', realmId: 'realm-456' });
    });

    it('marks integration inactive when refresh token has expired', async () => {
      const expiredAccess = new Date(Date.now() - 1000).toISOString();
      const expiredRefresh = new Date(Date.now() - 1000).toISOString(); // refresh also expired

      const supabase = createMockSupabase({
        single: vi.fn().mockResolvedValue({
          data: {
            access_token_encrypted: 'encrypted:old',
            refresh_token_encrypted: 'encrypted:old-refresh',
            token_expires_at: expiredAccess,
            refresh_token_expires_at: expiredRefresh,
            realm_id: 'realm-789',
            is_active: true,
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      });

      const result = await getValidAccessToken(supabase as any, 'user-1');

      expect(result).toBeNull();
      expect(refreshAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('getIntegrationStatus', () => {
    it('returns connected status with company info', async () => {
      const supabase = createMockSupabase({
        single: vi.fn().mockResolvedValue({
          data: { company_name: 'Carolina Balloons', realm_id: 'realm-123', is_active: true },
          error: null,
        }),
      });

      const result = await getIntegrationStatus(supabase as any, 'user-1');

      expect(result).toEqual({
        connected: true,
        companyName: 'Carolina Balloons',
        realmId: 'realm-123',
      });
    });

    it('returns disconnected when no integration exists', async () => {
      const supabase = createMockSupabase({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await getIntegrationStatus(supabase as any, 'user-1');

      expect(result).toEqual({
        connected: false,
        companyName: null,
        realmId: null,
      });
    });
  });

  describe('removeTokens', () => {
    it('deletes the integration row', async () => {
      const supabase = createMockSupabase({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await removeTokens(supabase as any, 'user-1');

      expect(supabase.from).toHaveBeenCalledWith('quickbooks_integrations');
    });

    it('throws on delete failure', async () => {
      const supabase = createMockSupabase({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'FK violation' } }),
      });

      await expect(removeTokens(supabase as any, 'user-1')).rejects.toThrow(
        'Failed to remove QuickBooks tokens: FK violation',
      );
    });
  });
});

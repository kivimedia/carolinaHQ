/**
 * Manages encrypted QuickBooks OAuth tokens stored in the `quickbooks_integrations` table.
 *
 * Tokens are AES-256-GCM encrypted via encryption.ts before hitting the DB.
 * Automatically refreshes expired access tokens.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { encryptToHex, decryptFromHex } from '@/lib/encryption';
import { refreshAccessToken, QuickBooksTokens } from './oauth';

export interface StoredQuickBooksIntegration {
  id: string;
  user_id: string;
  realm_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  refresh_token_expires_at: string | null;
  company_name: string | null;
  connected_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Store tokens after initial OAuth exchange.
 */
export async function storeTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: QuickBooksTokens,
  realmId: string,
  companyName?: string | null,
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const refreshExpiresAt = new Date(
    Date.now() + tokens.x_refresh_token_expires_in * 1000,
  ).toISOString();

  const row = {
    user_id: userId,
    realm_id: realmId,
    access_token_encrypted: encryptToHex(tokens.access_token),
    refresh_token_encrypted: encryptToHex(tokens.refresh_token),
    token_expires_at: expiresAt,
    refresh_token_expires_at: refreshExpiresAt,
    company_name: companyName ?? null,
    is_active: true,
  };

  // Upsert -- one integration row per user
  const { error } = await supabase
    .from('quickbooks_integrations')
    .upsert(row, { onConflict: 'user_id' });

  if (error) throw new Error(`Failed to store QuickBooks tokens: ${error.message}`);
}

/**
 * Retrieve a valid access token and realm ID for the user.
 * Transparently refreshes if the current token has expired (or will in <60s).
 * Returns null if the user has no integration.
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ accessToken: string; realmId: string } | null> {
  const { data, error } = await supabase
    .from('quickbooks_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  const row = data as StoredQuickBooksIntegration;
  const expiresAt = new Date(row.token_expires_at).getTime();
  const bufferMs = 60_000;

  if (Date.now() < expiresAt - bufferMs) {
    return {
      accessToken: decryptFromHex(row.access_token_encrypted),
      realmId: row.realm_id,
    };
  }

  // Check if refresh token itself has expired (100-day lifetime)
  if (row.refresh_token_expires_at) {
    const refreshExpiry = new Date(row.refresh_token_expires_at).getTime();
    if (Date.now() >= refreshExpiry) {
      // Mark as inactive -- user needs to re-authorize
      await supabase
        .from('quickbooks_integrations')
        .update({ is_active: false })
        .eq('user_id', userId);
      return null;
    }
  }

  // Refresh the access token
  const refreshToken = decryptFromHex(row.refresh_token_encrypted);
  const newTokens = await refreshAccessToken(refreshToken);

  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
  const newRefreshExpiry = new Date(
    Date.now() + newTokens.x_refresh_token_expires_in * 1000,
  ).toISOString();

  await supabase
    .from('quickbooks_integrations')
    .update({
      access_token_encrypted: encryptToHex(newTokens.access_token),
      refresh_token_encrypted: encryptToHex(newTokens.refresh_token),
      token_expires_at: newExpiry,
      refresh_token_expires_at: newRefreshExpiry,
    })
    .eq('user_id', userId);

  return {
    accessToken: newTokens.access_token,
    realmId: row.realm_id,
  };
}

/**
 * Fetch the integration row (without decrypting tokens) for display purposes.
 */
export async function getIntegrationStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  connected: boolean;
  companyName: string | null;
  realmId: string | null;
}> {
  const { data } = await supabase
    .from('quickbooks_integrations')
    .select('company_name, realm_id, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (!data) return { connected: false, companyName: null, realmId: null };
  return {
    connected: true,
    companyName: data.company_name,
    realmId: data.realm_id,
  };
}

/**
 * Remove the user's QuickBooks integration (tokens deleted from DB).
 */
export async function removeTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('quickbooks_integrations')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to remove QuickBooks tokens: ${error.message}`);
}

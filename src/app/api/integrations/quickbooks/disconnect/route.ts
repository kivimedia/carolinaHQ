import { getAuthContext, errorResponse, successResponse } from '@/lib/api-helpers';
import { decryptFromHex } from '@/lib/encryption';
import { revokeToken } from '@/lib/quickbooks/oauth';
import { removeTokens } from '@/lib/quickbooks/token-manager';

export async function POST() {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  try {
    const { supabase, userId } = auth.ctx;

    // Fetch the refresh token to revoke it with Intuit
    const { data } = await supabase
      .from('quickbooks_integrations')
      .select('refresh_token_encrypted')
      .eq('user_id', userId)
      .single();

    if (data?.refresh_token_encrypted) {
      const refreshToken = decryptFromHex(data.refresh_token_encrypted);
      await revokeToken(refreshToken);
    }

    // Delete the integration row
    await removeTokens(supabase, userId);

    return successResponse({ disconnected: true });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
}

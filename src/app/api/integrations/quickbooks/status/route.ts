import { getAuthContext, errorResponse, successResponse } from '@/lib/api-helpers';
import { getValidAccessToken, getIntegrationStatus } from '@/lib/quickbooks/token-manager';
import { getCompanyInfo } from '@/lib/quickbooks/client';

/**
 * GET /api/integrations/quickbooks/status
 *
 * Read-only connection check. Fetches company info from QBO to verify
 * the OAuth tokens are valid and the API is reachable. Changes nothing.
 */
export async function GET() {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;

  // Quick check: is there even an integration row?
  const status = await getIntegrationStatus(supabase, userId);
  if (!status.connected) {
    return successResponse({
      connected: false,
      message: 'No QuickBooks integration found. Connect via /api/integrations/quickbooks/connect.',
    });
  }

  // Try to get a valid access token (auto-refreshes if needed)
  const creds = await getValidAccessToken(supabase, userId);
  if (!creds) {
    return successResponse({
      connected: false,
      message: 'QuickBooks tokens expired. Please reconnect.',
    });
  }

  // Hit the read-only Company Info endpoint to verify the connection
  try {
    const info = (await getCompanyInfo({
      accessToken: creds.accessToken,
      realmId: creds.realmId,
    })) as { CompanyInfo?: { CompanyName?: string; Country?: string; CompanyAddr?: { City?: string; CountrySubDivisionCode?: string } } };

    const company = info.CompanyInfo;

    return successResponse({
      connected: true,
      realmId: creds.realmId,
      companyName: company?.CompanyName ?? null,
      country: company?.Country ?? null,
      location: company?.CompanyAddr
        ? `${company.CompanyAddr.City ?? ''}, ${company.CompanyAddr.CountrySubDivisionCode ?? ''}`.replace(/^, |, $/g, '')
        : null,
      message: 'QuickBooks connection is working.',
    });
  } catch (err) {
    return errorResponse(
      `Connection failed: ${(err as Error).message}`,
      502,
    );
  }
}

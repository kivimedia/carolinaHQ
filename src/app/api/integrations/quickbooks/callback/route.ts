import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/quickbooks/oauth';
import { storeTokens } from '@/lib/quickbooks/token-manager';
import { getCompanyInfo } from '@/lib/quickbooks/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const realmId = searchParams.get('realmId');
  const error = searchParams.get('error');

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/settings?quickbooks_error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      `${baseUrl}/settings?quickbooks_error=missing_params`,
    );
  }

  try {
    // Decode state to get the user ID
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    const userId = stateData.userId;
    if (!userId) throw new Error('Invalid state: no userId');

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch company name from QBO
    let companyName: string | null = null;
    try {
      const info = (await getCompanyInfo({
        accessToken: tokens.access_token,
        realmId,
      })) as { CompanyInfo?: { CompanyName?: string } };
      companyName = info.CompanyInfo?.CompanyName ?? null;
    } catch {
      // Non-critical -- company name is just for display
    }

    // Store encrypted tokens
    const supabase = createServerSupabaseClient();
    await storeTokens(supabase, userId, tokens, realmId, companyName);

    return NextResponse.redirect(`${baseUrl}/settings?quickbooks_connected=true`);
  } catch (err) {
    console.error('QuickBooks callback error:', err);
    return NextResponse.redirect(
      `${baseUrl}/settings?quickbooks_error=${encodeURIComponent((err as Error).message)}`,
    );
  }
}

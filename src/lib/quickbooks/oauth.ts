/**
 * QuickBooks Online OAuth 2.0 utilities.
 *
 * Uses raw fetch (no npm dependency) against Intuit's OAuth endpoints.
 * Tokens are encrypted before storage via encryption.ts.
 */

const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QB_REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';

/** Scopes for QuickBooks accounting access */
export const QB_SCOPES = ['com.intuit.quickbooks.accounting'];

function getClientId(): string {
  const id = process.env.QUICKBOOKS_CLIENT_ID;
  if (!id) throw new Error('QUICKBOOKS_CLIENT_ID not set');
  return id;
}

function getClientSecret(): string {
  const secret = process.env.QUICKBOOKS_CLIENT_SECRET;
  if (!secret) throw new Error('QUICKBOOKS_CLIENT_SECRET not set');
  return secret;
}

function getRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';
  return `${base}/api/integrations/quickbooks/callback`;
}

/** Basic auth header required by Intuit's token endpoint */
function getBasicAuthHeader(): string {
  const credentials = `${getClientId()}:${getClientSecret()}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds (typically 3600)
  x_refresh_token_expires_in: number; // seconds (typically 8726400 = 100 days)
  token_type: string;
}

/**
 * Build the authorization URL that sends the user to Intuit's consent screen.
 * `state` should include a CSRF token or user identifier.
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: QB_SCOPES.join(' '),
    state,
  });
  return `${QB_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the one-time authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<QuickBooksTokens> {
  const res = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: getBasicAuthHeader(),
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      code,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Use a refresh token to get a fresh access token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<QuickBooksTokens> {
  const res = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: getBasicAuthHeader(),
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Revoke the user's token (access or refresh).
 */
export async function revokeToken(token: string): Promise<void> {
  const res = await fetch(QB_REVOKE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getBasicAuthHeader(),
      Accept: 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    console.warn('QuickBooks token revocation returned', res.status);
  }
}

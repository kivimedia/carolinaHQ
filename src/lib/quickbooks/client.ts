/**
 * QuickBooks Online API client helpers.
 *
 * Uses raw fetch against the QBO REST API.
 * All methods require a valid access token and realm ID (company ID).
 */

const QB_API_BASE_PRODUCTION = 'https://quickbooks.api.intuit.com';
const QB_API_BASE_SANDBOX = 'https://sandbox-quickbooks.api.intuit.com';

function getApiBase(): string {
  return process.env.QUICKBOOKS_ENVIRONMENT === 'production'
    ? QB_API_BASE_PRODUCTION
    : QB_API_BASE_SANDBOX;
}

interface QBRequestOptions {
  accessToken: string;
  realmId: string;
}

/**
 * Make an authenticated GET request to the QBO API.
 */
async function qbGet<T>(
  path: string,
  { accessToken, realmId }: QBRequestOptions,
): Promise<T> {
  const url = `${getApiBase()}/v3/company/${realmId}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBO API GET ${path} failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Make an authenticated POST request to the QBO API.
 */
async function qbPost<T>(
  path: string,
  body: unknown,
  { accessToken, realmId }: QBRequestOptions,
): Promise<T> {
  const url = `${getApiBase()}/v3/company/${realmId}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBO API POST ${path} failed: ${res.status} ${text}`);
  }

  return res.json();
}

// ── Company Info ──────────────────────────────────────────────────────

export async function getCompanyInfo(opts: QBRequestOptions) {
  return qbGet(`/companyinfo/${opts.realmId}`, opts);
}

// ── Customers ─────────────────────────────────────────────────────────

export async function queryCustomers(
  query: string,
  opts: QBRequestOptions,
) {
  const encoded = encodeURIComponent(query);
  return qbGet(`/query?query=${encoded}`, opts);
}

export async function getCustomer(customerId: string, opts: QBRequestOptions) {
  return qbGet(`/customer/${customerId}`, opts);
}

export async function createCustomer(
  customer: { DisplayName: string; PrimaryEmailAddr?: { Address: string }; PrimaryPhone?: { FreeFormNumber: string } },
  opts: QBRequestOptions,
) {
  return qbPost('/customer', customer, opts);
}

// ── Invoices ──────────────────────────────────────────────────────────

export async function queryInvoices(
  query: string,
  opts: QBRequestOptions,
) {
  const encoded = encodeURIComponent(query);
  return qbGet(`/query?query=${encoded}`, opts);
}

export async function getInvoice(invoiceId: string, opts: QBRequestOptions) {
  return qbGet(`/invoice/${invoiceId}`, opts);
}

export async function createInvoice(
  invoice: Record<string, unknown>,
  opts: QBRequestOptions,
) {
  return qbPost('/invoice', invoice, opts);
}

export async function sendInvoice(invoiceId: string, email: string, opts: QBRequestOptions) {
  return qbPost(`/invoice/${invoiceId}/send?sendTo=${encodeURIComponent(email)}`, {}, opts);
}

// ── Payments ──────────────────────────────────────────────────────────

export async function queryPayments(
  query: string,
  opts: QBRequestOptions,
) {
  const encoded = encodeURIComponent(query);
  return qbGet(`/query?query=${encoded}`, opts);
}

export async function getPayment(paymentId: string, opts: QBRequestOptions) {
  return qbGet(`/payment/${paymentId}`, opts);
}

// ── Items (Products/Services) ─────────────────────────────────────────

export async function queryItems(
  query: string,
  opts: QBRequestOptions,
) {
  const encoded = encodeURIComponent(query);
  return qbGet(`/query?query=${encoded}`, opts);
}

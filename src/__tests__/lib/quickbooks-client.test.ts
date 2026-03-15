import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  getCompanyInfo,
  queryCustomers,
  getCustomer,
  createCustomer,
  queryInvoices,
  getInvoice,
  createInvoice,
  sendInvoice,
  queryPayments,
  getPayment,
  queryItems,
} from '@/lib/quickbooks/client';

const opts = { accessToken: 'test-token', realmId: '12345' };

describe('QuickBooks API Client', () => {
  beforeEach(() => {
    process.env.QUICKBOOKS_ENVIRONMENT = 'sandbox';
    mockFetch.mockReset();
  });

  afterEach(() => {
    delete process.env.QUICKBOOKS_ENVIRONMENT;
  });

  describe('environment toggle', () => {
    it('uses sandbox base URL by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ CompanyInfo: {} }),
      });

      await getCompanyInfo(opts);

      expect(mockFetch.mock.calls[0][0]).toContain('sandbox-quickbooks.api.intuit.com');
    });

    it('uses production base URL when configured', async () => {
      process.env.QUICKBOOKS_ENVIRONMENT = 'production';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ CompanyInfo: {} }),
      });

      await getCompanyInfo(opts);

      expect(mockFetch.mock.calls[0][0]).toContain('quickbooks.api.intuit.com');
      expect(mockFetch.mock.calls[0][0]).not.toContain('sandbox');
    });
  });

  describe('getCompanyInfo', () => {
    it('fetches company info with correct URL and auth header', async () => {
      const mockResponse = { CompanyInfo: { CompanyName: 'Test Co' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getCompanyInfo(opts);

      expect(result).toEqual(mockResponse);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/v3/company/12345/companyinfo/12345');
      expect(options.headers['Authorization']).toBe('Bearer test-token');
      expect(options.headers['Accept']).toBe('application/json');
    });
  });

  describe('customers', () => {
    it('queryCustomers sends URL-encoded query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ QueryResponse: { Customer: [] } }),
      });

      await queryCustomers("SELECT * FROM Customer WHERE DisplayName = 'Acme'", opts);

      expect(mockFetch.mock.calls[0][0]).toContain('/v3/company/12345/query?query=');
    });

    it('getCustomer fetches by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Customer: { Id: '42' } }),
      });

      await getCustomer('42', opts);

      expect(mockFetch.mock.calls[0][0]).toContain('/customer/42');
    });

    it('createCustomer sends POST with customer data', async () => {
      const customer = { DisplayName: 'Jane Doe' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Customer: { Id: '99', ...customer } }),
      });

      await createCustomer(customer, opts);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/customer');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual(customer);
    });
  });

  describe('invoices', () => {
    it('queryInvoices sends query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ QueryResponse: { Invoice: [] } }),
      });

      await queryInvoices('SELECT * FROM Invoice', opts);

      expect(mockFetch.mock.calls[0][0]).toContain('/query?query=');
    });

    it('getInvoice fetches by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Invoice: { Id: '101' } }),
      });

      await getInvoice('101', opts);

      expect(mockFetch.mock.calls[0][0]).toContain('/invoice/101');
    });

    it('createInvoice posts invoice data', async () => {
      const invoice = { CustomerRef: { value: '42' }, Line: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Invoice: { Id: '102' } }),
      });

      await createInvoice(invoice, opts);

      const options = mockFetch.mock.calls[0][1];
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('sendInvoice posts to send endpoint with email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Invoice: { Id: '102', EmailStatus: 'EmailSent' } }),
      });

      await sendInvoice('102', 'client@example.com', opts);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/invoice/102/send?sendTo=client%40example.com');
    });
  });

  describe('payments', () => {
    it('queryPayments sends query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ QueryResponse: { Payment: [] } }),
      });

      await queryPayments('SELECT * FROM Payment', opts);

      expect(mockFetch.mock.calls[0][0]).toContain('/query?query=');
    });

    it('getPayment fetches by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Payment: { Id: '200' } }),
      });

      await getPayment('200', opts);

      expect(mockFetch.mock.calls[0][0]).toContain('/payment/200');
    });
  });

  describe('items', () => {
    it('queryItems sends query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ QueryResponse: { Item: [] } }),
      });

      await queryItems('SELECT * FROM Item', opts);

      expect(mockFetch.mock.calls[0][0]).toContain('/query?query=');
    });
  });

  describe('error handling', () => {
    it('throws on non-OK GET response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(getCompanyInfo(opts)).rejects.toThrow(
        'QBO API GET /companyinfo/12345 failed: 401 Unauthorized',
      );
    });

    it('throws on non-OK POST response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Validation error'),
      });

      await expect(createInvoice({}, opts)).rejects.toThrow(
        'QBO API POST /invoice failed: 400 Validation error',
      );
    });
  });
});

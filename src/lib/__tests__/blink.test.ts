import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkBlinkInvoiceStatus, createBlinkInvoice } from '../blink';

// Mock ENV
vi.mock('../env', () => ({
  ENV: {
    BLINK: {
      API_KEY: 'test-api-key',
      WALLET_ID: 'test-wallet-id',
    },
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('blink lib', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('checkBlinkInvoiceStatus', () => {
    it('should use lnInvoicePaymentStatusByHash and return status', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            lnInvoicePaymentStatusByHash: {
              status: 'PAID',
            },
          },
        }),
      });

      const status = await checkBlinkInvoiceStatus('test-hash');
      
      expect(status).toBe('PAID');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.blink.sv/graphql',
        expect.objectContaining({
          body: expect.stringContaining('lnInvoicePaymentStatusByHash'),
        })
      );
      
      const lastCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(lastCallBody.variables.input.paymentHash).toBe('test-hash');
      expect(lastCallBody.query).toContain('lnInvoicePaymentStatusByHash($input: LnInvoicePaymentStatusByHashInput!)');
    });

    it('should throw if Blink returns errors', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          errors: [{ message: 'Some Blink error' }],
        }),
      });

      await expect(checkBlinkInvoiceStatus('test-hash')).rejects.toThrow('Blink API Error: Some Blink error');
    });
  });

  describe('createBlinkInvoice', () => {
    it('should create an invoice and return details', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            lnInvoiceCreate: {
              invoice: {
                paymentRequest: 'lnbc1...',
                paymentHash: 'hash123',
                paymentSecret: 'secret123',
                satoshis: 1000,
              },
              errors: [],
            },
          },
        }),
      });

      const invoice = await createBlinkInvoice(1000, 'test memo');
      
      expect(invoice.paymentRequest).toBe('lnbc1...');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.blink.sv/graphql',
        expect.objectContaining({
          body: expect.stringContaining('lnInvoiceCreate'),
        })
      );
    });
  });
});

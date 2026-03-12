import { ENV } from './env';

const BLINK_API_URL = "https://api.blink.sv/graphql";

/**
 * Basic GraphQL fetcher for Blink API.
 */
async function fetchBlink(query: string, variables: Record<string, unknown> = {}) {
  const apiKey = ENV.BLINK.API_KEY;
  if (!apiKey) throw new Error("BLINK_API_KEY is missing from environment");

  const response = await fetch(BLINK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(`Blink API Error: ${result.errors[0].message}`);
  }
  return result.data;
}

/**
 * Creates a Lightning Invoice for NIP-05 registration.
 * Amount is in Satoshis.
 */
export async function createBlinkInvoice(amount: number, memo: string) {
  const walletId = ENV.BLINK.WALLET_ID;
  if (!walletId) throw new Error("BLINK_WALLET_ID is missing from environment");

  const mutation = `
    mutation lnInvoiceCreate($input: LnInvoiceCreateInput!) {
      lnInvoiceCreate(input: $input) {
        errors {
          message
        }
        invoice {
          paymentRequest
          paymentHash
          paymentSecret
          satoshis
        }
      }
    }
  `;

  const variables = {
    input: {
      amount,
      walletId,
      memo,
    },
  };

  const data = await fetchBlink(mutation, variables);
  
  if (!data?.lnInvoiceCreate?.invoice) {
    const error = data?.lnInvoiceCreate?.errors?.[0]?.message || "Unknown Blink error";
    throw new Error(`Failed to create invoice: ${error}`);
  }

  return data.lnInvoiceCreate.invoice;
}

/**
 * Checks the status of a Lightning Invoice.
 * Returns 'PENDING', 'PAID', or 'EXPIRED'.
 */
export async function checkBlinkInvoiceStatus(paymentHash: string) {
  const query = `
    query lnInvoicePaymentStatus($input: LnInvoicePaymentStatusInput!) {
      lnInvoicePaymentStatus(input: $input) {
        status
        errors {
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      paymentHash,
    },
  };

  const data = await fetchBlink(query, variables);
  return data.lnInvoicePaymentStatus.status;
}

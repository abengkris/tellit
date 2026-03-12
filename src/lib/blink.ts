const BLINK_API_URL = "https://api.blink.sv/graphql";
const BLINK_API_KEY = process.env.BLINK_API_KEY;
const BLINK_WALLET_ID = process.env.BLINK_WALLET_ID;

/**
 * Basic GraphQL fetcher for Blink API.
 */
async function fetchBlink(query: string, variables: Record<string, unknown> = {}) {
  if (!BLINK_API_KEY) throw new Error("BLINK_API_KEY is missing");

  const response = await fetch(BLINK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": BLINK_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

/**
 * Creates a Lightning Invoice for NIP-05 registration.
 * Amount is in Satoshis.
 */
export async function createBlinkInvoice(amount: number, memo: string) {
  if (!BLINK_WALLET_ID) throw new Error("BLINK_WALLET_ID is missing");

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
      walletId: BLINK_WALLET_ID,
      memo,
    },
  };

  const data = await fetchBlink(mutation, variables);
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

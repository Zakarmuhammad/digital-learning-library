/**
 * Paystack wrapper for a ONE-TIME ₦1,000 charge.
 * Deliberately does NOT use Paystack's plan/subscription endpoints —
 * this is a single transaction, never recurring.
 */

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!SECRET_KEY && process.env.NODE_ENV !== "test") {
  console.warn("[paystack] PAYSTACK_SECRET_KEY is not set — payments will fail.");
}

async function paystackFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok || data.status === false) {
    throw new Error(`Paystack error (${path}): ${data.message ?? res.statusText}`);
  }
  return data;
}

export function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  callbackUrl: string;
  reference: string;
  metadata?: Record<string, any>;
}) {
  return paystackFetch<{ data: { authorization_url: string; access_code: string; reference: string } }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        callback_url: params.callbackUrl,
        reference: params.reference,
        metadata: params.metadata,
      }),
    }
  );
}

export function verifyTransaction(reference: string) {
  return paystackFetch<{
    data: {
      status: "success" | "failed" | "abandoned";
      reference: string;
      amount: number;
      currency: string;
      paid_at: string | null;
      customer: { email: string };
    };
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

const crypto = require("crypto") as typeof import("crypto");

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !SECRET_KEY) return false;
  const hash = crypto.createHmac("sha512", SECRET_KEY).update(rawBody).digest("hex");
  return hash === signature;
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/paystack";
import { sendEmail, paymentConfirmationEmail } from "@/lib/email";

// POST /api/payment/webhook
// Register this URL in Paystack Dashboard → Settings → API Keys & Webhooks.
// This is the ONLY place a payment is authoritatively marked successful and
// access is granted. The /api/payment/verify endpoint (called after the
// redirect) is a UX convenience only — this webhook is the real gate.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    await handleChargeSuccess(event.data);
  }
  // Other events (charge.failed, etc.) aren't relevant to a one-time
  // registration fee — nothing to renew or disable.

  return NextResponse.json({ received: true });
}

async function handleChargeSuccess(data: any) {
  const reference: string = data.reference;

  const payment = await prisma.payment.findUnique({ where: { transactionReference: reference } });
  if (!payment) {
    // Unknown reference — log for manual reconciliation, but don't error
    // the webhook (Paystack would just retry indefinitely).
    console.error(`[webhook] charge.success for unknown reference ${reference}`);
    return;
  }

  // IDEMPOTENCY: only transition pending -> successful once. If this
  // reference was already processed (e.g. Paystack retried the webhook),
  // updateMany affects 0 rows and we skip re-granting access / re-emailing.
  const result = await prisma.payment.updateMany({
    where: { transactionReference: reference, status: "pending" },
    data: {
      status: "successful",
      verifiedAt: new Date(),
      providerResponse: data,
    },
  });

  if (result.count === 0) {
    return; // already processed — idempotent no-op
  }

  const user = await prisma.user.update({
    where: { id: payment.userId },
    data: { hasPaidAccess: true },
  });

  const { subject, html } = paymentConfirmationEmail(user.fullName, payment.amount / 100);
  await sendEmail({ to: user.email, subject, html });
}

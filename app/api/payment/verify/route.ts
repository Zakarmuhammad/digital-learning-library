import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access-control";
import { verifyTransaction } from "@/lib/paystack";

// GET /api/payment/verify?reference=xxx
// Called from the dashboard after Paystack redirects back. Does a real
// server-to-server call to Paystack — never trusts the redirect alone.
// Shares the exact same idempotent transition as the webhook, so whichever
// arrives first (this call or the webhook) wins; the other is a no-op.
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { transactionReference: reference } });
  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ error: "Payment not found for this user." }, { status: 404 });
  }

  if (payment.status === "successful") {
    return NextResponse.json({ status: "successful" });
  }

  const result = await verifyTransaction(reference);

  if (result.data.status !== "success") {
    if (result.data.status === "failed") {
      await prisma.payment.updateMany({
        where: { transactionReference: reference, status: "pending" },
        data: { status: "failed", providerResponse: result.data },
      });
    }
    return NextResponse.json({ status: result.data.status });
  }

  const updated = await prisma.payment.updateMany({
    where: { transactionReference: reference, status: "pending" },
    data: { status: "successful", verifiedAt: new Date(), providerResponse: result.data },
  });

  if (updated.count > 0) {
    await prisma.user.update({ where: { id: user.id }, data: { hasPaidAccess: true } });
  }

  return NextResponse.json({ status: "successful" });
}

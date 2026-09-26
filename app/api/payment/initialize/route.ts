import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access-control";
import { initializeTransaction } from "@/lib/paystack";
import { getSetting } from "@/lib/settings";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// POST /api/payment/initialize
// Starts the ONE-TIME registration payment. No plan code, no recurrence.
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

  const withinLimit = await checkRateLimit({
    identifier: user.id,
    routeKey: "payment-initialize",
    ...RATE_LIMITS.paymentInitialize,
  });
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many payment attempts. Please wait a moment and try again." }, { status: 429 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (dbUser.hasPaidAccess) {
    return NextResponse.json({ error: "You already have active access." }, { status: 409 });
  }

  const amountKobo = Number(await getSetting("registration_fee_kobo"));
  const reference = `reg_${dbUser.id}_${Date.now()}`;
  const origin = new URL(req.url).origin;

  const result = await initializeTransaction({
    email: dbUser.email,
    amountKobo,
    reference,
    callbackUrl: `${origin}/dashboard?ref=${reference}`,
    metadata: { userId: dbUser.id, paymentType: "one_time_registration" },
  });

  await prisma.payment.create({
    data: {
      userId: dbUser.id,
      transactionReference: reference,
      amount: amountKobo,
      currency: "NGN",
      status: "pending",
      paymentType: "one_time_registration",
    },
  });

  return NextResponse.json({
    authorizationUrl: result.data.authorization_url,
    reference,
  });
}

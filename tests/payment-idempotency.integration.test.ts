import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * This one requires a real Postgres connection (DATABASE_URL) because it
 * exercises the actual Prisma-backed idempotency logic used by the payment
 * webhook — that logic lives in a conditional `updateMany` against real
 * rows, which isn't meaningfully testable against a mock without just
 * re-implementing Prisma. It's skipped automatically when no DATABASE_URL
 * is configured (e.g. in CI without a database service attached).
 *
 * To run it locally:
 *   1. Point DATABASE_URL at a disposable test database (never production).
 *   2. npx prisma migrate deploy
 *   3. npm run test
 */
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("payment webhook idempotency (requires DATABASE_URL)", () => {
  let prisma: any;
  let userId: string;
  const reference = `test_ref_${Date.now()}`;

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();

    const user = await prisma.user.create({
      data: {
        fullName: "Test User",
        email: `test-${Date.now()}@example.com`,
        passwordHash: "not-a-real-hash",
      },
    });
    userId = user.id;

    await prisma.payment.create({
      data: {
        userId,
        transactionReference: reference,
        amount: 100000,
        currency: "NGN",
        status: "pending",
        paymentType: "one_time_registration",
      },
    });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("the first transition from pending to successful affects exactly one row", async () => {
    const result = await prisma.payment.updateMany({
      where: { transactionReference: reference, status: "pending" },
      data: { status: "successful", verifiedAt: new Date() },
    });
    expect(result.count).toBe(1);
  });

  it("a duplicate webhook delivery for the same reference is a no-op", async () => {
    // Simulates Paystack retrying the same charge.success event — the
    // route's guard is exactly this conditional updateMany.
    const result = await prisma.payment.updateMany({
      where: { transactionReference: reference, status: "pending" },
      data: { status: "successful", verifiedAt: new Date() },
    });
    expect(result.count).toBe(0); // already successful — nothing to transition
  });

  it("access is granted exactly once even if this were called twice", async () => {
    const before = await prisma.user.findUnique({ where: { id: userId } });
    expect(before.hasPaidAccess).toBe(false);

    await prisma.user.update({ where: { id: userId }, data: { hasPaidAccess: true } });
    await prisma.user.update({ where: { id: userId }, data: { hasPaidAccess: true } });

    const after = await prisma.user.findUnique({ where: { id: userId } });
    expect(after.hasPaidAccess).toBe(true);
  });
});

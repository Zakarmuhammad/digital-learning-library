import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // pending | successful | failed | refunded
  const q = searchParams.get("q"); // name / email / reference

  const payments = await prisma.payment.findMany({
    where: {
      status: status ? (status as any) : undefined,
      ...(q
        ? {
            OR: [
              { transactionReference: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { fullName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true, email: true } } },
    take: 200,
  });

  return NextResponse.json({ payments });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const [
    totalUsers,
    paidUsers,
    totalPayments,
    successfulPayments,
    totalEbooks,
    publishedEbooks,
    totalCourses,
    totalLessons,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", hasPaidAccess: true } }),
    prisma.payment.count(),
    prisma.payment.count({ where: { status: "successful" } }),
    prisma.ebook.count(),
    prisma.ebook.count({ where: { published: true } }),
    prisma.course.count(),
    prisma.lesson.count(),
  ]);

  const revenueKobo = await prisma.payment.aggregate({
    where: { status: "successful" },
    _sum: { amount: true },
  });

  return NextResponse.json({
    totalUsers,
    paidUsers,
    unpaidUsers: totalUsers - paidUsers,
    totalPayments,
    successfulPayments,
    totalEbooks,
    publishedEbooks,
    totalCourses,
    totalLessons,
    totalRevenueNaira: (revenueKobo._sum.amount ?? 0) / 100,
  });
}

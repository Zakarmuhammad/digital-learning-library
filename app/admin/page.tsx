import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
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

  const revenue = await prisma.payment.aggregate({ where: { status: "successful" }, _sum: { amount: true } });

  const stats = [
    { label: "Total Users", value: totalUsers },
    { label: "Paid Users", value: paidUsers },
    { label: "Unpaid Users", value: totalUsers - paidUsers },
    { label: "Total Payments", value: totalPayments },
    { label: "Successful Payments", value: successfulPayments },
    { label: "Total Revenue", value: `₦${((revenue._sum.amount ?? 0) / 100).toLocaleString()}` },
    { label: "Total E-Books", value: totalEbooks },
    { label: "Published E-Books", value: publishedEbooks },
    { label: "Total Courses", value: totalCourses },
    { label: "Total Lessons", value: totalLessons },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import PaymentVerifier from "./payment-verifier";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) return null; // middleware already redirects unauthenticated users

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const feeNaira = Number(await getSetting("registration_fee_kobo")) / 100;

  const [ebooks, readingProgress, enrollments] = await Promise.all([
    dbUser?.hasPaidAccess
      ? prisma.ebook.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } })
      : [],
    dbUser?.hasPaidAccess
      ? prisma.readingProgress.findMany({ where: { userId: user.id }, include: { ebook: true } })
      : [],
    dbUser?.hasPaidAccess
      ? prisma.enrollment.findMany({ where: { userId: user.id }, include: { course: true } })
      : [],
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Suspense fallback={null}>
        <PaymentVerifier />
      </Suspense>

      <h1 className="text-2xl font-bold">Welcome, {dbUser?.fullName}</h1>

      {!dbUser?.hasPaidAccess ? (
        <div className="mt-8 rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-lg font-semibold">Unlock your learning library</p>
          <p className="mt-2 text-gray-600">One-time registration fee: ₦{feeNaira.toLocaleString()}</p>
          <Link
            href="/payment"
            className="mt-5 inline-block rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Pay ₦{feeNaira.toLocaleString()}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700">
            Your access is active
          </div>

          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">Continue Learning</h2>
            {readingProgress.length === 0 ? (
              <p className="text-sm text-gray-500">No reading activity yet — open a book below to get started.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {readingProgress.map((p) => (
                  <Link
                    key={p.id}
                    href={`/ebooks/${p.ebook.slug}/read`}
                    className="rounded-xl border border-gray-200 p-4 hover:border-brand-600"
                  >
                    <p className="font-medium">{p.ebook.title}</p>
                    <p className="text-sm text-gray-500">Page {p.lastPage} of {p.ebook.pageCount}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">My E-Books</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {ebooks.map((b) => (
                <Link key={b.id} href={`/ebooks/${b.slug}`} className="rounded-xl border border-gray-200 p-4 hover:border-brand-600">
                  <p className="font-medium">{b.title}</p>
                  <p className="text-sm text-gray-500">by {b.author}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">My Courses</h2>
            {enrollments.length === 0 ? (
              <p className="text-sm text-gray-500">
                Not enrolled in anything yet — visit the <Link href="/courses" className="text-brand-600">course library</Link>.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {enrollments.map((e) => (
                  <Link
                    key={e.id}
                    href={`/courses/${e.course.slug}`}
                    className="rounded-xl border border-gray-200 p-4 hover:border-brand-600"
                  >
                    <p className="font-medium">{e.course.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-2 text-lg font-semibold">Payment History</h2>
            <PaymentHistory userId={user.id} />
          </section>
        </>
      )}
    </div>
  );
}

async function PaymentHistory({ userId }: { userId: string }) {
  const payments = await prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (payments.length === 0) return <p className="text-sm text-gray-500">No payments yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="py-2">Date</th>
          <th className="py-2">Amount</th>
          <th className="py-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id} className="border-t border-gray-100">
            <td className="py-2">{p.createdAt.toLocaleDateString()}</td>
            <td className="py-2">₦{(p.amount / 100).toLocaleString()}</td>
            <td className="py-2 capitalize">{p.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

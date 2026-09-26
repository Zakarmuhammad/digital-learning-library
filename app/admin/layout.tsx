import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/access-control";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/403");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 p-4">
        <p className="mb-6 text-sm font-bold text-brand-700">Admin</p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/admin" className="rounded-md px-3 py-2 hover:bg-gray-100">Dashboard</Link>
          <Link href="/admin/users" className="rounded-md px-3 py-2 hover:bg-gray-100">Users</Link>
          <Link href="/admin/payments" className="rounded-md px-3 py-2 hover:bg-gray-100">Payments</Link>
          <Link href="/admin/ebooks" className="rounded-md px-3 py-2 hover:bg-gray-100">E-Books</Link>
          <Link href="/admin/courses" className="rounded-md px-3 py-2 hover:bg-gray-100">Courses</Link>
          <Link href="/admin/categories" className="rounded-md px-3 py-2 hover:bg-gray-100">Categories</Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

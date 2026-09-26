import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-gray-200">403</p>
      <h1 className="mt-4 text-xl font-semibold">You don&apos;t have permission to access this content.</h1>
      <Link href="/dashboard" className="mt-6 rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">
        Back to dashboard
      </Link>
    </div>
  );
}

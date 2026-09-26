import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="mt-4 text-xl font-semibold">Page not found.</h1>
      <Link href="/" className="mt-6 rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">
        Back to home
      </Link>
    </div>
  );
}

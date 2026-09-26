import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";

export default async function LandingPage() {
  const settings = await getAllSettings();
  const feeNaira = Number(settings.registration_fee_kobo) / 100;

  const [ebooks, courses] = await Promise.all([
    prisma.ebook.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
    prisma.course.findMany({ where: { published: true }, take: 3, include: { modules: { include: { lessons: true } } } }),
  ]);

  return (
    <div>
      {/* HEADER */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-brand-700">{settings.app_name}</span>
          <nav className="hidden gap-6 text-sm font-medium text-gray-600 md:flex">
            <Link href="/">Home</Link>
            <Link href="/ebooks">E-Books</Link>
            <Link href="/courses">E-Courses</Link>
            <Link href="/about">About</Link>
          </nav>
          <div className="flex gap-3 text-sm">
            <Link href="/login" className="rounded-md px-4 py-2 font-medium text-gray-700 hover:bg-gray-50">
              Login
            </Link>
            <Link href="/register" className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Learn. Read. Grow.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Access valuable digital e-books and practical courses from one platform, built for
          learners who want to move at their own pace.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/register" className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            Get Access for ₦{feeNaira.toLocaleString()}
          </Link>
          <Link href="/ebooks" className="rounded-md border border-gray-300 px-6 py-3 font-semibold text-gray-800 hover:bg-gray-50">
            Explore Library
          </Link>
        </div>
      </section>

      {/* PRICING */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <div className="rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">One-Time Access</p>
          <p className="mt-2 text-5xl font-extrabold">
            ₦{feeNaira.toLocaleString()} <span className="text-lg font-medium text-gray-500">ONE-TIME</span>
          </p>
          <p className="mt-3 text-gray-600">Pay once to register and unlock premium learning content.</p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 sm:grid-cols-3">
          {[
            "Premium e-books",
            "Practical courses",
            "Learn at your own pace",
            "Mobile-friendly",
            "Secure access",
            "Personal learning dashboard",
          ].map((f) => (
            <div key={f} className="text-center">
              <p className="font-semibold">{f}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED E-BOOKS */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-6 text-2xl font-bold">Featured E-Books</h2>
        {ebooks.length === 0 ? (
          <p className="text-gray-500">No e-books published yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-3">
            {ebooks.map((b) => (
              <div key={b.id} className="rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-medium uppercase text-brand-600">{b.isPremium ? "Premium" : "Free"}</p>
                <h3 className="mt-1 font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-gray-500">by {b.author}</p>
                <p className="mt-2 line-clamp-3 text-sm text-gray-600">{b.description}</p>
                <p className="mt-2 text-xs text-gray-400">{b.pageCount} pages</p>
                <Link
                  href={`/ebooks/${b.slug}`}
                  className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  {b.isPremium ? "Get Access" : "Read"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FEATURED COURSES */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="mb-6 text-2xl font-bold">Featured Courses</h2>
        {courses.length === 0 ? (
          <p className="text-gray-500">No courses published yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-3">
            {courses.map((c) => {
              const lessonCount = c.modules.reduce((sum, m) => sum + m.lessons.length, 0);
              return (
                <div key={c.id} className="rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{c.instructor}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">{c.description}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {lessonCount} lessons · {c.level}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-10 text-center text-sm text-gray-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 sm:flex-row sm:justify-between">
          <p>{settings.footer_text}</p>
          <div className="flex gap-4">
            <Link href="/about">About</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

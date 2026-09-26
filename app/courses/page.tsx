import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CoursesPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();

  const courses = await prisma.course.findMany({
    where: {
      published: true,
      ...(q
        ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { instructor: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: { category: true, modules: { include: { lessons: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold">Courses</h1>

      <form className="mt-4 max-w-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by title or instructor…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {courses.map((c) => {
          const lessonCount = c.modules.reduce((sum, m) => sum + m.lessons.filter((l) => l.published).length, 0);
          return (
            <Link key={c.id} href={`/courses/${c.slug}`} className="rounded-xl border border-gray-200 p-5 hover:border-brand-600">
              <p className="text-xs font-medium uppercase text-brand-600">{c.isPremium ? "Premium" : "Free"}</p>
              <h3 className="mt-1 font-semibold">{c.title}</h3>
              {c.instructor && <p className="mt-1 text-sm text-gray-500">by {c.instructor}</p>}
              {c.category && <p className="mt-1 text-xs text-gray-400">{c.category.name}</p>}
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">{c.description}</p>
              <p className="mt-2 text-xs text-gray-400">
                {lessonCount} lessons · {c.level}
              </p>
            </Link>
          );
        })}
        {courses.length === 0 && <p className="text-gray-500">No courses found.</p>}
      </div>
    </div>
  );
}

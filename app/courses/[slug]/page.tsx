import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/access-control";
import EnrollButton from "./enroll-button";

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { where: { published: true }, orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!course || !course.published) notFound();

  const session = await getSession();
  const userId = (session?.user as any)?.id as string | undefined;
  const hasAccess = !course.isPremium || (session?.user as any)?.hasPaidAccess;

  let enrolled = false;
  let percent = 0;
  let resumeLessonId: string | null = null;

  if (userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    enrolled = !!enrollment;

    if (enrolled) {
      const lessons = course.modules.flatMap((m) => m.lessons);
      const progressRows = await prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
      });
      const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));
      const completedCount = lessons.filter((l) => progressByLesson.get(l.id)?.completed).length;
      percent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
      resumeLessonId = (lessons.find((l) => !progressByLesson.get(l.id)?.completed) ?? lessons[lessons.length - 1])?.id ?? null;
    }
  }

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs font-medium uppercase text-brand-600">{course.isPremium ? "Premium" : "Free"}</p>
      <h1 className="mt-1 text-3xl font-bold">{course.title}</h1>
      <p className="mt-1 text-gray-500">
        {course.instructor && `by ${course.instructor}`}
        {course.category && ` · ${course.category.name}`} · {course.level}
      </p>
      <p className="mt-1 text-sm text-gray-400">{totalLessons} lessons</p>

      <p className="mt-6 whitespace-pre-line text-gray-700">{course.description}</p>

      <div className="mt-8">
        {!session ? (
          <Link href="/register" className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            Register to Get Access
          </Link>
        ) : !hasAccess ? (
          <Link href="/payment" className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            Get Access — ₦1,000
          </Link>
        ) : enrolled ? (
          <div>
            <div className="mb-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-brand-600" style={{ width: `${percent}%` }} />
            </div>
            <p className="mb-3 text-sm text-gray-500">{percent}% complete</p>
            {resumeLessonId && (
              <Link
                href={`/courses/${course.slug}/learn/${resumeLessonId}`}
                className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
              >
                Continue Learning
              </Link>
            )}
          </div>
        ) : (
          <EnrollButton courseId={course.id} slug={course.slug} firstLessonId={course.modules[0]?.lessons[0]?.id} />
        )}
      </div>

      <div className="mt-10 space-y-6">
        {course.modules.map((m) => (
          <div key={m.id}>
            <h2 className="font-semibold">{m.title}</h2>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {m.lessons.map((l) => (
                <li key={l.id} className="rounded-md border border-gray-100 px-3 py-2">
                  {l.title}
                  {l.durationSeconds ? ` · ${Math.round(l.durationSeconds / 60)} min` : ""}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

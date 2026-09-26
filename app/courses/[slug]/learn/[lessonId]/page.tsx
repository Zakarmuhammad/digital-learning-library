import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access-control";
import LessonPlayer from "./lesson-player";

export default async function LearnPage({ params }: { params: { slug: string; lessonId: string } }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { where: { published: true }, orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!course || !course.published) notFound();

  if (course.isPremium) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { hasPaidAccess: true } });
    if (!dbUser?.hasPaidAccess) redirect(`/courses/${course.slug}`);
  }

  const allLessons = course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
  const currentLesson = allLessons.find((l) => l.id === params.lessonId);
  if (!currentLesson) notFound();

  // Silently enroll — reaching this page at all means access was already
  // verified above; an explicit "Enroll" click isn't needed a second time
  // for someone who followed a direct/continue-learning link.
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    update: {},
    create: { userId: user.id, courseId: course.id },
  });

  const progressRows = await prisma.lessonProgress.findMany({
    where: { userId: user.id, lessonId: { in: allLessons.map((l) => l.id) } },
  });
  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));

  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <LessonPlayer
      courseSlug={course.slug}
      courseTitle={course.title}
      lesson={{
        id: currentLesson.id,
        title: currentLesson.title,
        description: currentLesson.description,
        moduleTitle: currentLesson.moduleTitle,
        hasVideo: !!(currentLesson.videoUrl || currentLesson.videoStorageKey),
        externalVideoUrl: currentLesson.videoUrl,
        hasStoredVideo: !!currentLesson.videoStorageKey,
        hasResource: !!(currentLesson.resourceUrl || currentLesson.resourceStorageKey),
        externalResourceUrl: currentLesson.resourceUrl,
        hasStoredResource: !!currentLesson.resourceStorageKey,
      }}
      prevLessonId={prevLesson?.id ?? null}
      nextLessonId={nextLesson?.id ?? null}
      completed={progressByLesson.get(currentLesson.id)?.completed ?? false}
      sidebar={course.modules.map((m) => ({
        title: m.title,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          completed: progressByLesson.get(l.id)?.completed ?? false,
        })),
      }))}
    />
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access-control";

// POST /api/lesson-progress   Body: { lessonId, completed?, lastWatchedPosition? }
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const { lessonId, completed, lastWatchedPosition } = await req.json();
  if (!lessonId) return NextResponse.json({ error: "lessonId is required" }, { status: 400 });

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: {
      ...(typeof completed === "boolean" ? { completed } : {}),
      ...(typeof lastWatchedPosition === "number" ? { lastWatchedPosition } : {}),
    },
    create: {
      userId: user.id,
      lessonId,
      completed: completed ?? false,
      lastWatchedPosition: lastWatchedPosition ?? 0,
    },
  });

  return NextResponse.json({ progress });
}

// GET /api/lesson-progress?courseId=xxx
// Returns progress for every lesson in the course, plus which lesson to
// resume at (first incomplete lesson in order, or the last one if all done).
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

  const modules = await prisma.courseModule.findMany({
    where: { courseId },
    orderBy: { sortOrder: "asc" },
    include: { lessons: { where: { published: true }, orderBy: { sortOrder: "asc" } } },
  });
  const lessons = modules.flatMap((m) => m.lessons);

  const progressRows = await prisma.lessonProgress.findMany({
    where: { userId: user.id, lessonId: { in: lessons.map((l) => l.id) } },
  });
  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));

  const completedCount = lessons.filter((l) => progressByLesson.get(l.id)?.completed).length;
  const percent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const resumeLesson = lessons.find((l) => !progressByLesson.get(l.id)?.completed) ?? lessons[lessons.length - 1];

  return NextResponse.json({
    percent,
    completedCount,
    totalLessons: lessons.length,
    resumeLessonId: resumeLesson?.id ?? null,
    lessons: lessons.map((l) => ({
      id: l.id,
      completed: progressByLesson.get(l.id)?.completed ?? false,
      lastWatchedPosition: progressByLesson.get(l.id)?.lastWatchedPosition ?? 0,
    })),
  });
}

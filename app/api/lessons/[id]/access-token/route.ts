import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access-control";
import { issueFileAccess } from "@/lib/storage";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// GET /api/lessons/:id/access-token?type=video|resource
// Same signed-access pattern as e-book files: re-checks access on every
// call, never exposes the storage key, short-lived either way.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (type !== "video" && type !== "resource") {
    return NextResponse.json({ error: "type must be 'video' or 'resource'" }, { status: 400 });
  }

  const withinLimit = await checkRateLimit({
    identifier: user.id,
    routeKey: "lesson-access-token",
    ...RATE_LIMITS.fileAccessToken,
  });
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many requests. Please slow down and try again shortly." }, { status: 429 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: { module: { include: { course: true } } },
  });
  if (!lesson || !lesson.published) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  const course = lesson.module.course;
  if (course.isPremium) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { hasPaidAccess: true } });
    if (!dbUser?.hasPaidAccess) {
      return NextResponse.json({ error: "This course requires the ₦1,000 one-time access." }, { status: 403 });
    }
  }

  const storageKey = type === "video" ? lesson.videoStorageKey : lesson.resourceStorageKey;
  if (!storageKey) {
    return NextResponse.json({ error: `This lesson has no private ${type} file (it may use an external link instead).` }, { status: 404 });
  }

  const access = await issueFileAccess({ userId: user.id, resourceId: lesson.id, storageKey });
  if (access.kind === "redirect") {
    return NextResponse.json({ mode: "redirect", url: access.url });
  }
  return NextResponse.json({ mode: "proxy", token: access.token });
}

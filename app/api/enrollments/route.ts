import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access-control";

// POST /api/enrollments   Body: { courseId }
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const { courseId } = await req.json();
  if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.published) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (course.isPremium) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { hasPaidAccess: true } });
    if (!dbUser?.hasPaidAccess) {
      return NextResponse.json(
        { error: "This course requires the ₦1,000 one-time access to be unlocked first." },
        { status: 403 }
      );
    }
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    update: {},
    create: { userId: user.id, courseId },
  });

  return NextResponse.json({ enrollment });
}

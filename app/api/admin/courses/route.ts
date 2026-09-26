import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      category: true,
      modules: { include: { lessons: true } },
      _count: { select: { enrollments: true } },
    },
  });
  return NextResponse.json({ courses });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json();
  const required = ["title", "slug", "description"];
  for (const field of required) {
    if (!body[field]) return NextResponse.json({ error: `${field} is required` }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: {
      title: body.title,
      slug: body.slug,
      description: body.description,
      thumbnailUrl: body.thumbnailUrl ?? null,
      categoryId: body.categoryId ?? null,
      level: body.level ?? "beginner",
      instructor: body.instructor ?? null,
      isPremium: body.isPremium ?? true,
      published: body.published ?? false,
    },
  });

  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "COURSE_CREATED", entity: "Course", entityId: course.id },
  });

  return NextResponse.json({ course });
}

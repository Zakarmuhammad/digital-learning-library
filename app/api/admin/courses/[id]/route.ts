import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: { modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ course });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json();
  const allowed = ["title", "description", "thumbnailUrl", "categoryId", "level", "instructor", "isPremium", "published", "sortOrder"];
  const data: Record<string, any> = {};
  for (const key of allowed) if (key in body) data[key] = body[key];

  const course = await prisma.course.update({ where: { id: params.id }, data });

  await prisma.auditLog.create({
    data: {
      adminId: admin.adminId,
      action: "published" in body ? (body.published ? "COURSE_PUBLISHED" : "COURSE_UNPUBLISHED") : "COURSE_UPDATED",
      entity: "Course",
      entityId: course.id,
    },
  });

  return NextResponse.json({ course });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const enrollmentCount = await prisma.enrollment.count({ where: { courseId: params.id } });
  if (enrollmentCount > 0) {
    await prisma.course.update({ where: { id: params.id }, data: { published: false } });
    await prisma.auditLog.create({
      data: { adminId: admin.adminId, action: "COURSE_UNPUBLISHED", entity: "Course", entityId: params.id },
    });
    return NextResponse.json({ message: "Course has enrolled learners — unpublished instead of deleted." });
  }

  await prisma.course.delete({ where: { id: params.id } });
  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "COURSE_DELETED", entity: "Course", entityId: params.id },
  });
  return NextResponse.json({ message: "Deleted." });
}

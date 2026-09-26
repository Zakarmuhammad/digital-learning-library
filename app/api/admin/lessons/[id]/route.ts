import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json();
  const allowed = [
    "title",
    "description",
    "videoUrl",
    "videoStorageKey",
    "resourceUrl",
    "resourceStorageKey",
    "durationSeconds",
    "sortOrder",
    "published",
  ];
  const data: Record<string, any> = {};
  for (const key of allowed) if (key in body) data[key] = body[key];

  const lesson = await prisma.lesson.update({ where: { id: params.id }, data });

  await prisma.auditLog.create({
    data: {
      adminId: admin.adminId,
      action: "published" in body ? (body.published ? "LESSON_PUBLISHED" : "LESSON_UNPUBLISHED") : "LESSON_UPDATED",
      entity: "Lesson",
      entityId: lesson.id,
    },
  });

  return NextResponse.json({ lesson });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  await prisma.lessonProgress.deleteMany({ where: { lessonId: params.id } });
  await prisma.lesson.delete({ where: { id: params.id } });

  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "LESSON_DELETED", entity: "Lesson", entityId: params.id },
  });

  return NextResponse.json({ message: "Deleted." });
}

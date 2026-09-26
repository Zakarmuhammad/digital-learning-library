import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json();
  if (!body.title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const existingCount = await prisma.lesson.count({ where: { moduleId: params.id } });

  const lesson = await prisma.lesson.create({
    data: {
      moduleId: params.id,
      title: body.title,
      description: body.description ?? null,
      videoUrl: body.videoUrl ?? null,
      videoStorageKey: body.videoStorageKey ?? null,
      resourceUrl: body.resourceUrl ?? null,
      resourceStorageKey: body.resourceStorageKey ?? null,
      durationSeconds: body.durationSeconds ?? null,
      sortOrder: body.sortOrder ?? existingCount,
      published: body.published ?? false,
    },
  });

  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "LESSON_CREATED", entity: "Lesson", entityId: lesson.id },
  });

  return NextResponse.json({ lesson });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json();
  const data: Record<string, any> = {};
  if ("title" in body) data.title = body.title;
  if ("sortOrder" in body) data.sortOrder = body.sortOrder;

  const courseModule = await prisma.courseModule.update({ where: { id: params.id }, data });
  return NextResponse.json({ module: courseModule });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  await prisma.lesson.deleteMany({ where: { moduleId: params.id } });
  await prisma.courseModule.delete({ where: { id: params.id } });

  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "MODULE_DELETED", entity: "CourseModule", entityId: params.id },
  });

  return NextResponse.json({ message: "Deleted." });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { title, sortOrder } = await req.json();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const existingCount = await prisma.courseModule.count({ where: { courseId: params.id } });

  const courseModule = await prisma.courseModule.create({
    data: { courseId: params.id, title, sortOrder: sortOrder ?? existingCount },
  });

  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "MODULE_CREATED", entity: "CourseModule", entityId: courseModule.id },
  });

  return NextResponse.json({ module: courseModule });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "A category name of at least 2 characters is required." }, { status: 400 });
  }

  const category = await prisma.category.update({
    where: { id: params.id },
    data: { name: name.trim() },
  });

  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "CATEGORY_UPDATED", entity: "Category", entityId: category.id },
  });

  return NextResponse.json({ category });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const [ebookCount, courseCount] = await Promise.all([
    prisma.ebook.count({ where: { categoryId: params.id } }),
    prisma.course.count({ where: { categoryId: params.id } }),
  ]);
  if (ebookCount > 0 || courseCount > 0) {
    return NextResponse.json(
      { error: `Can't delete — ${ebookCount} e-book(s) and ${courseCount} course(s) still use this category. Reassign them first.` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id: params.id } });
  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "CATEGORY_DELETED", entity: "Category", entityId: params.id },
  });

  return NextResponse.json({ message: "Deleted." });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json();
  const allowed = [
    "title",
    "author",
    "description",
    "categoryId",
    "coverUrl",
    "isPremium",
    "downloadEnabled",
    "published",
    "sortOrder",
  ];
  const data: Record<string, any> = {};
  for (const key of allowed) if (key in body) data[key] = body[key];

  const ebook = await prisma.ebook.update({ where: { id: params.id }, data });

  await prisma.auditLog.create({
    data: {
      adminId: admin.adminId,
      action: "published" in body ? (body.published ? "BOOK_PUBLISHED" : "BOOK_UNPUBLISHED") : "BOOK_UPDATED",
      entity: "Ebook",
      entityId: ebook.id,
      metadata: data,
    },
  });

  return NextResponse.json({ ebook });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  // Soft-delete via unpublish is safer than a hard delete once readers
  // have progress recorded against the book; hard delete only if no
  // reading progress exists.
  const readerCount = await prisma.readingProgress.count({ where: { ebookId: params.id } });
  if (readerCount > 0) {
    await prisma.ebook.update({ where: { id: params.id }, data: { published: false } });
    await prisma.auditLog.create({
      data: { adminId: admin.adminId, action: "BOOK_UNPUBLISHED", entity: "Ebook", entityId: params.id },
    });
    return NextResponse.json({ message: "Book has reader history — unpublished instead of deleted." });
  }

  await prisma.ebook.delete({ where: { id: params.id } });
  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "BOOK_DELETED", entity: "Ebook", entityId: params.id },
  });

  return NextResponse.json({ message: "Deleted." });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const ebooks = await prisma.ebook.findMany({
    orderBy: { sortOrder: "asc" },
    include: { category: true, _count: { select: { readingProgress: true } } },
  });

  return NextResponse.json({ ebooks });
}

// POST /api/admin/ebooks
// Note: this endpoint creates the DB record only. The actual PDF file must
// already exist in private storage at the given fileStorageKey (uploaded
// via your storage provider's admin upload flow) — this scaffold doesn't
// include a browser file-upload UI yet, see README "what's not built".
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json();
  const required = ["title", "slug", "author", "description", "fileStorageKey", "pageCount"];
  for (const field of required) {
    if (!body[field]) return NextResponse.json({ error: `${field} is required` }, { status: 400 });
  }

  const ebook = await prisma.ebook.create({
    data: {
      title: body.title,
      slug: body.slug,
      author: body.author,
      description: body.description,
      categoryId: body.categoryId ?? null,
      coverUrl: body.coverUrl ?? null,
      fileStorageKey: body.fileStorageKey,
      pageCount: body.pageCount,
      isPremium: body.isPremium ?? true,
      downloadEnabled: body.downloadEnabled ?? false,
      published: body.published ?? false,
    },
  });

  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "BOOK_CREATED", entity: "Ebook", entityId: ebook.id },
  });

  return NextResponse.json({ ebook });
}

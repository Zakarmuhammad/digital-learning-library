import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { ebooks: true, courses: true } } },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "A category name of at least 2 characters is required." }, { status: 400 });
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "A category with this name already exists." }, { status: 409 });
  }

  const category = await prisma.category.create({ data: { name: name.trim(), slug } });
  await prisma.auditLog.create({
    data: { adminId: admin.adminId, action: "CATEGORY_CREATED", entity: "Category", entityId: category.id },
  });

  return NextResponse.json({ category });
}

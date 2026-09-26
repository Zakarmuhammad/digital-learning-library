import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const courses = await prisma.course.findMany({
    where: {
      published: true,
      ...(q
        ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { instructor: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: { category: true, modules: { include: { lessons: true } } },
  });

  return NextResponse.json({ courses });
}

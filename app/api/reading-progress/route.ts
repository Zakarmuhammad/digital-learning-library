import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePaidAccess } from "@/lib/access-control";

// POST /api/reading-progress  { ebookId, lastPage, percent }
export async function POST(req: Request) {
  const auth = await requirePaidAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { ebookId, lastPage, percent } = await req.json();
  if (!ebookId || typeof lastPage !== "number") {
    return NextResponse.json({ error: "ebookId and lastPage are required" }, { status: 400 });
  }

  const progress = await prisma.readingProgress.upsert({
    where: { userId_ebookId: { userId: auth.userId, ebookId } },
    update: { lastPage, percent: percent ?? 0 },
    create: { userId: auth.userId, ebookId, lastPage, percent: percent ?? 0 },
  });

  return NextResponse.json({ progress });
}

// GET /api/reading-progress?ebookId=xxx
export async function GET(req: Request) {
  const auth = await requirePaidAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const ebookId = searchParams.get("ebookId");
  if (!ebookId) return NextResponse.json({ error: "ebookId is required" }, { status: 400 });

  const progress = await prisma.readingProgress.findUnique({
    where: { userId_ebookId: { userId: auth.userId, ebookId } },
  });

  return NextResponse.json({ progress: progress ?? { lastPage: 1, percent: 0 } });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access-control";
import { readLocalFile, verifyAccessToken, isLocalDriver } from "@/lib/storage";

// GET /api/lessons/:id/file?type=video|resource&token=...
// Only relevant when STORAGE_DRIVER=local — see /access-token route.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!isLocalDriver()) {
    return NextResponse.json({ error: "Disabled when STORAGE_DRIVER=s3 — use the presigned URL instead." }, { status: 404 });
  }

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const token = searchParams.get("token");
  if (type !== "video" && type !== "resource") {
    return NextResponse.json({ error: "type must be 'video' or 'resource'" }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: params.id } });
  if (!lesson || !lesson.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!token || !verifyAccessToken({ userId: user.id, resourceId: lesson.id, token })) {
    return NextResponse.json({ error: "Invalid or expired access token." }, { status: 403 });
  }

  const storageKey = type === "video" ? lesson.videoStorageKey : lesson.resourceStorageKey;
  if (!storageKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = await readLocalFile(storageKey);
  const contentType = type === "video" ? "video/mp4" : "application/octet-stream";

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": type === "resource" ? `attachment; filename="${lesson.title}"` : "inline",
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "bytes",
    },
  });
}

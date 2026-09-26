import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access-control";
import { readLocalFile, verifyAccessToken, isLocalDriver } from "@/lib/storage";

// GET /api/ebooks/:slug/file?token=...
// ONLY relevant when STORAGE_DRIVER=local (see lib/storage.ts) — when
// STORAGE_DRIVER=s3, the reader talks to the presigned S3 URL directly and
// never hits this route. Streams the private PDF only if the caller is
// authenticated AND holds a valid, unexpired signed token for this exact
// resource. The storage key itself is never exposed to the client.
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  if (!isLocalDriver()) {
    return NextResponse.json(
      { error: "This route is disabled when STORAGE_DRIVER=s3 — use the presigned URL from /access-token instead." },
      { status: 404 }
    );
  }

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const ebook = await prisma.ebook.findUnique({ where: { slug: params.slug } });
  if (!ebook || !ebook.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!token || !verifyAccessToken({ userId: user.id, resourceId: ebook.id, token })) {
    return NextResponse.json({ error: "Invalid or expired access token." }, { status: 403 });
  }

  const bytes = await readLocalFile(ebook.fileStorageKey);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ebook.slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

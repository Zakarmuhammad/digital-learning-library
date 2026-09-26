import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePaidAccess } from "@/lib/access-control";
import { issueFileAccess } from "@/lib/storage";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// GET /api/ebooks/:slug/access-token
// Returns short-lived, authenticated access to the e-book's bytes:
//   - local storage driver -> a signed token for our own /file route
//   - s3 storage driver    -> a presigned S3 URL the browser fetches directly
// Either way, re-checks paid access against the DB on every call — a user
// whose access lapses immediately loses the ability to mint new access,
// even if they have an old reader tab open.
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const auth = await requirePaidAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const withinLimit = await checkRateLimit({
    identifier: auth.userId,
    routeKey: "ebook-access-token",
    ...RATE_LIMITS.fileAccessToken,
  });
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many requests. Please slow down and try again shortly." }, { status: 429 });
  }

  const ebook = await prisma.ebook.findUnique({ where: { slug: params.slug } });
  if (!ebook || !ebook.published) {
    return NextResponse.json({ error: "E-book not found." }, { status: 404 });
  }

  const access = await issueFileAccess({
    userId: auth.userId,
    resourceId: ebook.id,
    storageKey: ebook.fileStorageKey,
  });

  if (access.kind === "redirect") {
    // S3 driver — hand the browser a presigned URL directly.
    return NextResponse.json({ mode: "redirect", url: access.url, ebookId: ebook.id });
  }
  // Local driver — hand back a token for our own file-serving route.
  return NextResponse.json({ mode: "proxy", token: access.token, ebookId: ebook.id });
}

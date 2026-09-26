import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import { getStorageDriver, isLocalDriver } from "@/lib/storage";
import { validateUpload, type UploadKind } from "@/lib/upload-validation";

// POST /api/admin/uploads/presign   Body: { kind, filename, contentType, sizeBytes }
// Returns a presigned PUT URL the ADMIN'S BROWSER uploads directly to —
// bytes never pass through our server. This is the correct path for large
// course video files. Only works when STORAGE_DRIVER=s3; on the local
// driver, use /api/admin/uploads (proxy upload) instead for files under
// its size ceiling.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  if (isLocalDriver()) {
    return NextResponse.json(
      {
        error:
          "Direct presigned uploads require STORAGE_DRIVER=s3. In local dev, use /api/admin/uploads (proxy upload) for files under its size limit instead.",
      },
      { status: 400 }
    );
  }

  const { kind, filename, contentType, sizeBytes } = await req.json();
  if (!kind || !filename || !contentType || !sizeBytes) {
    return NextResponse.json({ error: "kind, filename, contentType, and sizeBytes are required" }, { status: 400 });
  }

  const validation = validateUpload(kind as UploadKind, { type: contentType, size: sizeBytes, name: filename });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const driver = getStorageDriver();
  const uploadUrl = await driver.getSignedUploadUrl(validation.storageKey, contentType, 60 * 10); // 10 min to complete the upload

  return NextResponse.json({ uploadUrl, storageKey: validation.storageKey });
}

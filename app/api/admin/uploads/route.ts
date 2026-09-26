import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access-control";
import { getStorageDriver } from "@/lib/storage";
import { validateUpload, PROXY_UPLOAD_MAX_BYTES, type UploadKind } from "@/lib/upload-validation";

// POST /api/admin/uploads  (multipart/form-data: file, kind)
// Uploads a file into private storage (whichever driver is active — local
// disk in dev, S3-compatible bucket in production) and returns the
// storageKey to attach to an Ebook/Lesson record. The file is never made
// public — it's only ever reachable again through a signed
// token/presigned URL issued to an authenticated, paid user.
//
// For very large files (course videos), use /api/admin/uploads/presign
// instead — this route proxies bytes through our own server and isn't
// suitable for multi-hundred-MB uploads, especially on serverless hosts.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const form = await req.formData();
  const file = form.get("file");
  const kind = form.get("kind") as UploadKind | null;

  if (!(file instanceof File) || !kind) {
    return NextResponse.json({ error: "file and kind are required" }, { status: 400 });
  }
  if (file.size > PROXY_UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      {
        error: `File is larger than ${(PROXY_UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)}MB. Use the direct-upload flow (/api/admin/uploads/presign) for large files instead.`,
      },
      { status: 413 }
    );
  }

  const validation = validateUpload(kind, file);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const driver = getStorageDriver();
  await driver.putObject(validation.storageKey, buffer, file.type);

  return NextResponse.json({ storageKey: validation.storageKey });
}

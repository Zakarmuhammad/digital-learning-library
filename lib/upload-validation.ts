import { generateStorageKey } from "./storage";

export type UploadKind = "ebook-file" | "lesson-video" | "lesson-resource";

const RULES: Record<UploadKind, { allowedMime: string[]; maxBytes: number; prefix: string }> = {
  "ebook-file": {
    allowedMime: ["application/pdf"],
    maxBytes: 100 * 1024 * 1024, // 100MB
    prefix: "ebooks",
  },
  "lesson-resource": {
    allowedMime: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
    ],
    maxBytes: 50 * 1024 * 1024, // 50MB
    prefix: "lesson-resources",
  },
  "lesson-video": {
    allowedMime: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: 2 * 1024 * 1024 * 1024, // 2GB — realistically only usable via the
    // presigned direct-to-S3 path (see /api/admin/uploads/presign); the proxy
    // upload route will reject anything that won't fit through your host's
    // request body limit long before this ceiling matters.
    prefix: "lesson-videos",
  },
};

export function validateUpload(kind: UploadKind, file: { type: string; size: number; name: string }) {
  const rule = RULES[kind];
  if (!rule) return { ok: false as const, error: `Unknown upload kind: ${kind}` };

  if (!rule.allowedMime.includes(file.type)) {
    return {
      ok: false as const,
      error: `File type ${file.type || "unknown"} not allowed for ${kind}. Allowed: ${rule.allowedMime.join(", ")}`,
    };
  }
  if (file.size > rule.maxBytes) {
    return {
      ok: false as const,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max for ${kind} is ${(rule.maxBytes / 1024 / 1024).toFixed(0)}MB.`,
    };
  }

  const storageKey = generateStorageKey({ prefix: rule.prefix, originalFilename: file.name });
  return { ok: true as const, storageKey };
}

/**
 * A conservative body-size ceiling for the PROXY upload route (bytes pass
 * through our own server). Vercel's serverless functions hard-cap request
 * bodies at 4.5MB regardless of anything we configure here — if you're on
 * Vercel, anything bigger than that must go through the presigned direct
 * upload instead. On a persistent-server host (Railway/Render/Fly) this
 * limit is ours to set; 25MB comfortably covers e-book PDFs and lesson
 * resources without inviting abuse.
 */
export const PROXY_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

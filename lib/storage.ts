import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Storage abstraction with two drivers, selected by STORAGE_DRIVER:
 *
 *   - "local" (default, DEV ONLY): reads/writes ./private-storage on disk.
 *     Works fine on a host with a persistent filesystem (a VM, Railway,
 *     Render, Fly.io). Do NOT use this on serverless platforms (Vercel,
 *     AWS Lambda) — their filesystem is ephemeral and wiped on every
 *     deploy/cold-start, so uploaded files disappear.
 *
 *   - "s3": any S3-compatible object store — AWS S3, Cloudflare R2,
 *     Backblaze B2, Supabase Storage, DigitalOcean Spaces, etc. Files are
 *     never public; every read goes through a presigned GET URL that
 *     expires in ACCESS_TOKEN_TTL_SECONDS. This is the one to use in
 *     production.
 *
 * Both drivers implement the same interface, so nothing above this file
 * (API routes, reader UI) needs to know which one is active.
 */

export interface StorageDriver {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  getSignedUrl(key: string, expiresSeconds: number): Promise<string | null>;
  /**
   * A presigned PUT URL the browser can upload directly to, bypassing our
   * server entirely — the only practical way to accept large files (course
   * videos) without hitting serverless request-body limits. Returns null
   * on the local driver, which has no such concept.
   */
  getSignedUploadUrl(key: string, contentType: string, expiresSeconds: number): Promise<string | null>;
}

// 5 minutes, not 60 seconds: pdf.js issues range requests against the
// SAME URL while a person scrolls through a long PDF, so a too-short TTL
// causes reads to fail mid-book. Still short-lived by any normal
// definition, and a fresh token/URL is re-minted on every reader page load.
const ACCESS_TOKEN_TTL_SECONDS = 300;
const STORAGE_ROOT = process.env.PRIVATE_STORAGE_DIR ?? path.join(process.cwd(), "private-storage");
const SIGNING_SECRET = process.env.FILE_SIGNING_SECRET ?? process.env.AUTH_SECRET ?? "dev-only-insecure-secret";

// ── Local filesystem driver (dev only) ────────────────────────────────
class LocalDriver implements StorageDriver {
  private storagePathFor(key: string) {
    const safe = key.split("/").filter((seg) => seg !== "..").join("/");
    return path.join(STORAGE_ROOT, safe);
  }

  async putObject(key: string, body: Buffer) {
    const dest = this.storagePathFor(key);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, body);
  }

  async deleteObject(key: string) {
    await fs.promises.rm(this.storagePathFor(key), { force: true });
  }

  async getSignedUrl(): Promise<string | null> {
    return null; // local files are served through our own token-checked route
  }

  async getSignedUploadUrl(): Promise<string | null> {
    return null; // local driver has no direct-upload concept — use the proxy upload route
  }

  async readFile(key: string): Promise<Buffer> {
    return fs.promises.readFile(this.storagePathFor(key));
  }
}

// ── S3-compatible driver (production) ─────────────────────────────────
class S3Driver implements StorageDriver {
  private clientPromise: Promise<any> | null = null;
  private bucket = process.env.S3_BUCKET!;

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { S3Client } = await import("@aws-sdk/client-s3");
        return new S3Client({
          region: process.env.S3_REGION ?? "auto",
          endpoint: process.env.S3_ENDPOINT,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
          },
        });
      })();
    }
    return this.clientPromise;
  }

  async putObject(key: string, body: Buffer, contentType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: "private",
      })
    );
  }

  async deleteObject(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getSignedUrl(key: string, expiresSeconds: number): Promise<string> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await this.getClient();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresSeconds,
    });
  }

  async getSignedUploadUrl(key: string, contentType: string, expiresSeconds: number): Promise<string> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await this.getClient();
    return getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType, ACL: "private" }),
      { expiresIn: expiresSeconds }
    );
  }
}

let driverInstance: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (driverInstance) return driverInstance;
  const kind = process.env.STORAGE_DRIVER ?? "local";
  driverInstance = kind === "s3" ? new S3Driver() : new LocalDriver();
  return driverInstance;
}

export function isLocalDriver() {
  return (process.env.STORAGE_DRIVER ?? "local") !== "s3";
}

/** Only valid when using the local driver — reads bytes directly off disk. */
export async function readLocalFile(key: string): Promise<Buffer> {
  const driver = getStorageDriver();
  if (!(driver instanceof LocalDriver)) {
    throw new Error("readLocalFile() called while STORAGE_DRIVER=s3 — use getSignedUrl() instead.");
  }
  return driver.readFile(key);
}

// ── Signed access tokens (used by the local driver's own file route) ──
export function signAccessToken(params: { userId: string; resourceId: string }) {
  const expires = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS;
  const payload = `${params.userId}:${params.resourceId}:${expires}`;
  const signature = crypto.createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex");
  return { token: `${expires}.${signature}`, expires };
}

export function verifyAccessToken(params: { userId: string; resourceId: string; token: string }): boolean {
  const [expiresStr, signature] = params.token.split(".");
  const expires = Number(expiresStr);
  if (!expires || !signature) return false;
  if (Date.now() / 1000 > expires) return false;

  const payload = `${params.userId}:${params.resourceId}:${expires}`;
  const expected = crypto.createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * The single function every route should call to get something it can
 * hand to the browser to fetch a protected file's bytes. Returns either:
 *   - { kind: "redirect", url }   -> S3 presigned URL, browser fetches directly
 *   - { kind: "proxy", token }    -> local driver, browser must call our
 *                                     own /api/.../file?token=... route
 */
export async function issueFileAccess(params: {
  userId: string;
  resourceId: string;
  storageKey: string;
}): Promise<{ kind: "redirect"; url: string } | { kind: "proxy"; token: string }> {
  const driver = getStorageDriver();
  const signedUrl = await driver.getSignedUrl(params.storageKey, ACCESS_TOKEN_TTL_SECONDS);
  if (signedUrl) return { kind: "redirect", url: signedUrl };

  const { token } = signAccessToken({ userId: params.userId, resourceId: params.resourceId });
  return { kind: "proxy", token };
}

/** Safe, collision-resistant storage key generator for admin uploads. */
export function generateStorageKey(params: { prefix: string; originalFilename: string }) {
  const ext = path.extname(params.originalFilename).toLowerCase();
  const random = crypto.randomBytes(16).toString("hex");
  return `${params.prefix}/${random}${ext}`;
}

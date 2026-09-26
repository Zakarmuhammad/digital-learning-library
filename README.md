# Digital Learning Library

A one-time-payment (₦1,000, non-recurring) digital learning platform: premium e-books and
courses, built with Next.js (App Router) + Prisma + PostgreSQL + NextAuth + Paystack.

**I cannot deploy this to a live URL from this sandbox** — no network access here, and no
`npm install` (registry access is blocked), so no dependency install, no build, no live
database, no real Paystack webhook. Everything below is real, reviewed code; running it is
on you. See the final chat report for exact deploy steps.

---

## What's built

**Core (previous pass):** registration/login (bcrypt + NextAuth), one-time ₦1,000 Paystack
payment (server-verified redirect + signature-checked webhook, idempotent), protected e-book
PDF delivery, in-browser PDF reader with progress, user dashboard, admin dashboard/users/
payments, landing + legal pages.

**This pass:**
- **Course system, end to end**: admin can create courses → modules → lessons (with either an
  external video link or an uploaded video file, plus an optional downloadable resource);
  users browse `/courses`, enroll, watch lessons, mark them complete, and get a "Continue
  Learning" link that resumes at their first incomplete lesson. Progress bar on the course
  page.
- **Admin e-book upload**: `/admin/ebooks` now has a real form — pick a PDF, fill in
  metadata, submit; the file is uploaded and the DB record created in one step. No more
  manually placing files and calling the API by hand.
- **Category management**: `/admin/categories` — create, rename (delete blocked while any
  e-book/course still uses it).
- **Production-ready storage** (`lib/storage.ts`): a driver interface with two
  implementations —
  - `local` (dev only, current default): reads/writes `./private-storage` on disk.
  - `s3`: any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean
    Spaces). Reads go through presigned GET URLs (5 min expiry); large uploads (course
    videos) go through a presigned PUT the browser uses directly, bypassing our server
    entirely. Nothing is ever public.
  Switch with one env var: `STORAGE_DRIVER=s3`. No API-route code needed to change — every
  route already calls the same `issueFileAccess()`/`getStorageDriver()` functions.
- **Rate limiting** (`lib/rate-limit.ts`): applied to login, registration, payment
  initialization, and file-access-token issuance. In-memory by default (fine for a
  single-instance deploy); auto-upgrades to Upstash Redis if `UPSTASH_REDIS_REST_URL`/
  `_TOKEN` are set (required for correctness on multi-instance serverless).
- **Automated tests** (`tests/`, Vitest): signed-token round-trip/expiry/tamper checks,
  rate-limiter behavior, registration validation, upload MIME/size validation, plus a
  DB-backed idempotency test for the payment webhook logic that auto-skips when no
  `DATABASE_URL` is configured (documented in the test file — I can't run it here, no DB).

## What's still not built

- Automated **end-to-end/integration tests** beyond the DB-gated idempotency test above (no
  Playwright/Cypress suite driving the actual UI) — the acceptance-test checklist below is
  still a manual pass.
- Admin UI for reordering modules/lessons by drag-and-drop (the `sortOrder` field exists and
  defaults sensibly on creation, but there's no reorder control yet).
- Course thumbnail upload (thumbnails are a pasted external URL, same as before — same
  reasoning as e-book covers: they're meant to be public-facing anyway, so a private-storage
  round trip doesn't buy anything).
- I did **not** run `npm install` / `next build` / `npm test` — this sandbox has no network
  access (confirmed: `npm install` returns 403 from the registry). Everything above was
  built with careful manual review instead: I checked every new import resolves to a real
  file, checked brace/paren balance on the largest files, verified the Prisma schema changes
  are syntactically valid and additive-only, and traced the data flow through the new routes
  by hand. That is a real but different thing from an actual green build — run
  `npm install && npm run build && npm test` yourself as the first step after downloading
  this, before anything else.

---

## Setup

### 1. Install
```bash
npm install
```

### 2. Environment
Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `AUTH_SECRET`
(`openssl rand -base64 32`), `PAYSTACK_SECRET_KEY`/`PAYSTACK_PUBLIC_KEY` (test keys to
start), `NEXT_PUBLIC_APP_URL`. Leave `STORAGE_DRIVER=local` for local dev.

### 3. Database
```bash
npx prisma migrate dev --name add_courses_uploads_storage
```

### 4. Storage (local dev)
The two e-book PDFs are already at:
```
private-storage/ebooks/how-to-make-money-with-artificial-intelligence-ai.pdf   (36 pages, verified)
private-storage/ebooks/50-ways-to-make-money-online.pdf                         (345 pages, verified)
```

### 5. Seed
```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=a-strong-password npm run seed
```

### 6. Run
```bash
npm run dev
```

### 7. Test
```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest — pure-logic tests, no DB needed
```

---

## Production storage — required reading before deploying

**Do not deploy with `STORAGE_DRIVER=local` on Vercel or any serverless platform.** Their
filesystem is wiped on every deploy/cold start; your uploaded PDFs and videos will vanish.

To go to production:
1. Create a bucket with any S3-compatible provider (Cloudflare R2 is a common cheap choice —
   no egress fees). Make sure it's **private** (no public bucket policy).
2. Set in your production environment:
   ```
   STORAGE_DRIVER=s3
   S3_BUCKET=your-bucket-name
   S3_REGION=auto
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com   # blank for real AWS S3
   ```
3. **Move the existing files.** The two e-book PDFs currently sit in local
   `private-storage/ebooks/`. Upload them to your bucket at the same key paths
   (`ebooks/how-to-make-money-with-artificial-intelligence-ai.pdf` and
   `ebooks/50-ways-to-make-money-online.pdf`) using your provider's CLI/console, or
   re-upload them through `/admin/ebooks`'s upload form and update the `Ebook.fileStorageKey`
   in the database to match (Prisma Studio, or a one-off script).
4. Redeploy. Every route already reads `STORAGE_DRIVER` at runtime — no code changes needed.

---

## Deployment

1. Push this repo to GitHub.
2. Provision a managed Postgres (Neon, Supabase, Railway) and an S3-compatible bucket (step
   above).
3. Deploy the Next.js app (Vercel is the default choice for Next.js; any Node host works).
   Set every variable from `.env.example` in the platform's environment settings, using
   **live** Paystack keys and `STORAGE_DRIVER=s3`.
4. Run the migration against production once, before first traffic:
   ```bash
   npx prisma migrate deploy
   ```
5. Seed production once (`ADMIN_EMAIL`/`ADMIN_PASSWORD` set, pointed at the prod
   `DATABASE_URL`), or create the admin manually via Prisma Studio.
6. In the Paystack dashboard, switch to **Live mode** and set the webhook URL to
   `https://yourdomain.com/api/payment/webhook`.
7. Do one real, small live payment end-to-end before announcing the site — confirm in
   Paystack's webhook delivery log that it actually fired and your dashboard flipped to
   "access active".

---

## Manual acceptance checklist

(Automated coverage is the `tests/` unit suite above; this list is what still needs a human
click-through, ideally against a staging deploy before going live.)

- [ ] Register → `/dashboard` shows "₦1,000 One-Time Registration Fee"
- [ ] Pay with a Paystack test card → redirected back → access flips to active without a
      manual refresh
- [ ] `/ebooks/how-to-make-money-with-artificial-intelligence-ai/read` renders the real PDF
- [ ] Close/reopen the reader — resumes from the last page
- [ ] `/courses` → open a course → Enroll → watch a lesson → Mark complete → auto-advances →
      progress bar on the course page updates
- [ ] `/admin/ebooks` → upload a new PDF through the form → it appears in `/ebooks` once
      published
- [ ] `/admin/courses/:id` → add a module, add a lesson with an uploaded video file → it
      plays for a paid user, 403s for an unpaid one
- [ ] Non-admin visiting `/admin` → redirected to `/403`
- [ ] Hit `/api/payment/webhook` twice with the same `charge.success` payload → access
      granted once, not double-processed (also covered by
      `tests/payment-idempotency.integration.test.ts` against a real test DB)
- [ ] Log in 11 times in a row with a wrong password within a minute → 10th+ attempt gets
      rate-limited

---

## Security notes

- Passwords: bcrypt, cost factor 12.
- Every premium route re-checks `hasPaidAccess`/enrollment against Postgres, never the JWT
  alone.
- Files: never a public path, either driver. Local dev uses a 5-minute HMAC-signed token
  checked on every byte-serving request; production S3 uses genuine presigned URLs with the
  same 5-minute window.
- Webhook: HMAC-SHA512 signature verified before any DB write; invalid signatures get 401 and
  touch nothing.
- Idempotency: `pending → successful` is a conditional `updateMany` — duplicate webhook
  delivery is a guaranteed no-op.
- Rate limiting on login/register/payment-init/file-access-token issuance, with a documented
  upgrade path to Redis for multi-instance deploys.
- Uploads validated by MIME type and size ceiling per asset kind before ever touching
  storage.
- All admin mutations write an `AuditLog` row.

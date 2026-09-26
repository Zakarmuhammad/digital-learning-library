import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [ebooks, courses] = await Promise.all([
    prisma.ebook.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.course.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/ebooks`, lastModified: new Date() },
    { url: `${base}/courses`, lastModified: new Date() },
    ...ebooks.map((b) => ({ url: `${base}/ebooks/${b.slug}`, lastModified: b.updatedAt })),
    ...courses.map((c) => ({ url: `${base}/courses/${c.slug}`, lastModified: c.updatedAt })),
  ];
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/access-control";

export default async function EbookDetailPage({ params }: { params: { slug: string } }) {
  const ebook = await prisma.ebook.findUnique({ where: { slug: params.slug }, include: { category: true } });
  if (!ebook || !ebook.published) notFound();

  const session = await getSession();
  const hasAccess = !ebook.isPremium || (session?.user as any)?.hasPaidAccess;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs font-medium uppercase text-brand-600">{ebook.isPremium ? "Premium" : "Free"}</p>
      <h1 className="mt-1 text-3xl font-bold">{ebook.title}</h1>
      <p className="mt-1 text-gray-500">
        by {ebook.author}
        {ebook.category && ` · ${ebook.category.name}`}
      </p>
      <p className="mt-1 text-sm text-gray-400">{ebook.pageCount} pages · PDF</p>

      <p className="mt-6 whitespace-pre-line text-gray-700">{ebook.description}</p>

      <div className="mt-8">
        {hasAccess ? (
          <Link href={`/ebooks/${ebook.slug}/read`} className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            Read Now
          </Link>
        ) : session ? (
          <Link href="/payment" className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            Get Access — ₦1,000
          </Link>
        ) : (
          <Link href="/register" className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            Register to Get Access
          </Link>
        )}
      </div>
    </div>
  );
}

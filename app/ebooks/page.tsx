import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function EbooksPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();

  const ebooks = await prisma.ebook.findMany({
    where: {
      published: true,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { author: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: { category: true },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold">E-Book Library</h1>

      <form className="mt-4 max-w-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by title or author…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {ebooks.map((b) => (
          <Link key={b.id} href={`/ebooks/${b.slug}`} className="rounded-xl border border-gray-200 p-5 hover:border-brand-600">
            <p className="text-xs font-medium uppercase text-brand-600">{b.isPremium ? "Premium" : "Free"}</p>
            <h3 className="mt-1 font-semibold">{b.title}</h3>
            <p className="mt-1 text-sm text-gray-500">by {b.author}</p>
            {b.category && <p className="mt-1 text-xs text-gray-400">{b.category.name}</p>}
            <p className="mt-2 line-clamp-3 text-sm text-gray-600">{b.description}</p>
            <p className="mt-2 text-xs text-gray-400">{b.pageCount} pages</p>
          </Link>
        ))}
        {ebooks.length === 0 && <p className="text-gray-500">No e-books found.</p>}
      </div>
    </div>
  );
}

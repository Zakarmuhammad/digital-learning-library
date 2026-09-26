import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access-control";
import PdfReader from "./pdf-reader";

export default async function ReadEbookPage({ params }: { params: { slug: string } }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const ebook = await prisma.ebook.findUnique({ where: { slug: params.slug } });
  if (!ebook || !ebook.published) notFound();

  if (ebook.isPremium) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { hasPaidAccess: true } });
    if (!dbUser?.hasPaidAccess) redirect("/payment");
  }

  const progress = await prisma.readingProgress.findUnique({
    where: { userId_ebookId: { userId: user.id, ebookId: ebook.id } },
  });

  return (
    <PdfReader
      slug={ebook.slug}
      title={ebook.title}
      pageCount={ebook.pageCount}
      downloadEnabled={ebook.downloadEnabled}
      startPage={progress?.lastPage ?? 1}
    />
  );
}

import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getBook } from "@/lib/books";
import { listArtifacts } from "@/lib/artifacts";
import { BookDetailView } from "@/components/BookDetailView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const book = await getBook(id, session?.user?.id);

  if (!book) {
    notFound();
  }

  const artifacts = await listArtifacts(id);

  return <BookDetailView book={book} initialArtifacts={artifacts} />;
}

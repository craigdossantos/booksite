import { notFound } from "next/navigation";
import { getAuthUserId } from "@/lib/supabase/auth-helpers";
import { getBook } from "@/lib/books";
import { listArtifacts } from "@/lib/artifacts";
import { BookDetailView } from "@/components/BookDetailView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params;
  const userId = await getAuthUserId();
  const book = await getBook(id, userId ?? undefined);

  if (!book) {
    notFound();
  }

  const artifacts = await listArtifacts(id);

  return <BookDetailView book={book} initialArtifacts={artifacts} />;
}

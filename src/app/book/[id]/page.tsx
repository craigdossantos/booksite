import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook } from "@/lib/books";
import { ChapterList } from "@/components/ChapterList";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params;
  const book = await getBook(id);

  if (!book) {
    notFound();
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
      >
        <span>←</span>
        <span>Back to library</span>
      </Link>

      {/* Book header */}
      <header className="flex gap-8 mb-12">
        {/* Cover */}
        <div className="w-32 shrink-0">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              className="w-full rounded-lg shadow-md"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-4xl">📖</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
            {book.title}
          </h1>
          <p className="text-xl text-gray-600 mb-4">{book.author}</p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{book.chapterCount} chapters</span>
            {book.voiceProfile && (
              <span className="capitalize">
                {book.voiceProfile.tone} · {book.voiceProfile.style}
              </span>
            )}
          </div>

          {book.status !== "ready" && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              <span className="animate-pulse">●</span>
              <span className="capitalize">{book.status}</span>
            </div>
          )}
        </div>
      </header>

      {/* Chapter list */}
      <section>
        <h2 className="text-xl font-serif font-semibold text-gray-900 mb-6">
          Chapters
        </h2>
        <ChapterList bookId={id} chapters={book.chapters} />
      </section>
    </main>
  );
}

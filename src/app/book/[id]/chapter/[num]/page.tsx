import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getBook, getChapterContent } from "@/lib/books";
import { ChapterNav } from "@/components/ChapterNav";
import { Summary } from "@/components/Summary";

interface Props {
  params: Promise<{ id: string; num: string }>;
}

export default async function ChapterPage({ params }: Props) {
  const { id, num } = await params;
  const session = await auth();
  const book = await getBook(id, session?.user?.id);
  const chapterNum = parseInt(num, 10);

  if (!book) {
    notFound();
  }

  const chapter = book.chapters[chapterNum - 1];
  if (!chapter) {
    notFound();
  }

  const content = await getChapterContent(id, chapter.markdownPath);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <ChapterNav
        bookId={id}
        currentChapter={chapterNum}
        totalChapters={book.chapterCount}
      />

      <article className="mt-8">
        {/* Chapter title */}
        <header className="mb-8">
          <p className="text-sm text-gray-400 mb-2">
            {book.title} · Chapter {chapterNum}
          </p>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            {chapter.title}
          </h1>
        </header>

        {/* Summary */}
        {chapter.summary && (
          <div className="mb-8">
            <Summary content={chapter.summary.content} />
          </div>
        )}

        {/* Chapter content */}
        <div className="prose prose-lg prose-gray max-w-none">
          {content.split("\n").map((paragraph, i) => {
            if (!paragraph.trim()) return null;

            // Handle headings
            if (paragraph.startsWith("# ")) {
              return (
                <h1 key={i} className="text-2xl font-serif font-bold mt-8 mb-4">
                  {paragraph.slice(2)}
                </h1>
              );
            }
            if (paragraph.startsWith("## ")) {
              return (
                <h2 key={i} className="text-xl font-serif font-bold mt-6 mb-3">
                  {paragraph.slice(3)}
                </h2>
              );
            }
            if (paragraph.startsWith("### ")) {
              return (
                <h3 key={i} className="text-lg font-serif font-bold mt-4 mb-2">
                  {paragraph.slice(4)}
                </h3>
              );
            }

            // Handle list items
            if (paragraph.startsWith("- ")) {
              return (
                <li key={i} className="ml-4 text-gray-700">
                  {paragraph.slice(2)}
                </li>
              );
            }

            // Regular paragraph
            return (
              <p key={i} className="text-gray-700 leading-relaxed mb-4">
                {paragraph}
              </p>
            );
          })}
        </div>
      </article>

      <ChapterNav
        bookId={id}
        currentChapter={chapterNum}
        totalChapters={book.chapterCount}
        position="bottom"
      />
    </main>
  );
}

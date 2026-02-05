"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ChapterNavProps {
  bookId: string;
  currentChapter: number;
  totalChapters: number;
  position?: "top" | "bottom";
}

export function ChapterNav({
  bookId,
  currentChapter,
  totalChapters,
  position = "top",
}: ChapterNavProps) {
  const router = useRouter();
  const hasPrev = currentChapter > 1;
  const hasNext = currentChapter < totalChapters;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && hasPrev) {
        router.push(`/book/${bookId}/chapter/${currentChapter - 1}`);
      } else if (e.key === "ArrowRight" && hasNext) {
        router.push(`/book/${bookId}/chapter/${currentChapter + 1}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bookId, currentChapter, hasPrev, hasNext, router]);

  return (
    <nav
      className={`flex items-center justify-between ${position === "bottom" ? "mt-12 pt-8 border-t" : ""}`}
    >
      <div>
        {hasPrev ? (
          <Link
            href={`/book/${bookId}/chapter/${currentChapter - 1}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>←</span>
            <span>Previous</span>
          </Link>
        ) : (
          <Link
            href={`/book/${bookId}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>←</span>
            <span>Back to book</span>
          </Link>
        )}
      </div>

      <span className="text-sm text-gray-400">
        {currentChapter} of {totalChapters}
      </span>

      <div>
        {hasNext ? (
          <Link
            href={`/book/${bookId}/chapter/${currentChapter + 1}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>Next</span>
            <span>→</span>
          </Link>
        ) : (
          <Link
            href={`/book/${bookId}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>Finish</span>
            <span>→</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

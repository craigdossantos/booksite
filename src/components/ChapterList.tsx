"use client";

import Link from "next/link";
import type { Chapter } from "@/types/book";

interface ChapterListProps {
  bookId: string;
  chapters: Chapter[];
}

export function ChapterList({ bookId, chapters }: ChapterListProps) {
  return (
    <div className="space-y-4">
      {chapters.map((chapter) => (
        <Link
          key={chapter.number}
          href={`/book/${bookId}/chapter/${chapter.number}`}
          className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-4">
            <span className="text-sm text-gray-400 font-mono w-8 shrink-0">
              {String(chapter.number).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-semibold text-gray-900 mb-2">
                {chapter.title}
              </h3>
              {chapter.summary && (
                <p className="text-gray-600 text-sm line-clamp-3">
                  {chapter.summary.content}
                </p>
              )}
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                <span>{chapter.wordCount.toLocaleString()} words</span>
                {chapter.summary && (
                  <span>{chapter.summary.wordCount} word summary</span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

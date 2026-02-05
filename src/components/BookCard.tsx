"use client";

import Link from "next/link";
import type { Book } from "@/types/book";
import { BookmarkButton } from "./BookmarkButton";
import { VisibilityBadge } from "./VisibilityBadge";

interface BookCardProps {
  book: Book;
  showBookmarkButton?: boolean;
  showVisibilityBadge?: boolean;
  isBookmarked?: boolean;
  onBookmarkToggle?: (bookmarked: boolean) => void;
}

export function BookCard({
  book,
  showBookmarkButton = false,
  showVisibilityBadge = false,
  isBookmarked = false,
  onBookmarkToggle,
}: BookCardProps) {
  const isProcessing = book.status !== "ready" && book.status !== "error";

  return (
    <div className="relative group">
      <Link
        href={`/book/${book.id}`}
        className="block bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
      >
        {/* Cover Image */}
        <div className="aspect-[2/3] bg-gray-100 relative">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-4xl">📖</span>
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-center px-4">
                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm capitalize">{book.status}...</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {book.status === "error" && (
            <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
              <div className="text-white text-center px-4">
                <span className="text-2xl">⚠️</span>
                <p className="text-sm mt-1">Processing failed</p>
              </div>
            </div>
          )}

          {/* Visibility badge */}
          {showVisibilityBadge && (
            <div className="absolute top-2 left-2">
              <VisibilityBadge isPublic={book.isPublic} />
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="p-4">
          <h3 className="font-serif font-semibold text-gray-900 group-hover:text-gray-700 line-clamp-2 mb-1">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-1">{book.author}</p>
          <p className="text-xs text-gray-400 mt-2">
            {book.chapterCount} chapters
          </p>
        </div>
      </Link>

      {/* Bookmark button - positioned outside Link to avoid nesting interactive elements */}
      {showBookmarkButton && (
        <div className="absolute top-2 right-2">
          <BookmarkButton
            bookId={book.id}
            isBookmarked={isBookmarked}
            onToggle={onBookmarkToggle}
          />
        </div>
      )}
    </div>
  );
}

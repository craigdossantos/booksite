"use client";

import { useState } from "react";

interface BookmarkButtonProps {
  bookId: string;
  isBookmarked: boolean;
  onToggle?: (bookmarked: boolean) => void;
}

export function BookmarkButton({
  bookId,
  isBookmarked: initialBookmarked,
  onToggle,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      if (isBookmarked) {
        const res = await fetch(`/api/bookmarks/${bookId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setIsBookmarked(false);
          onToggle?.(false);
        }
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId }),
        });
        if (res.ok) {
          setIsBookmarked(true);
          onToggle?.(true);
        }
      }
    } catch (error) {
      console.error("Bookmark toggle failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`p-2 rounded-full transition-colors ${
        isBookmarked
          ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
          : "bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      title={isBookmarked ? "Remove from library" : "Add to library"}
    >
      <svg
        className="w-5 h-5"
        fill={isBookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    </button>
  );
}

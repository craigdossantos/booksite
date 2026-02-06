"use client";

import { useState } from "react";

interface VisibilityToggleProps {
  bookId: string;
  isPublic: boolean;
  onToggle?: (isPublic: boolean) => void;
}

export function VisibilityToggle({
  bookId,
  isPublic: initialPublic,
  onToggle,
}: VisibilityToggleProps) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/visibility`, {
        method: "PATCH",
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.book.isPublic);
        onToggle?.(data.book.isPublic);
      }
    } catch (error) {
      console.error("Visibility toggle failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        isPublic
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isPublic ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path
              fillRule="evenodd"
              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clipRule="evenodd"
            />
          </svg>
          Public
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          Private
        </>
      )}
    </button>
  );
}

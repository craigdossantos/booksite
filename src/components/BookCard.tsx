"use client";

import Link from "next/link";
import { useState } from "react";

interface BookData {
  id: string;
  title: string;
  author: string;
  chaptersCount: number;
  hasQuizzes: boolean;
  hasConcepts: boolean;
  completionPercentage: number;
}

export default function BookCard({ book }: { book: BookData }) {
  const [imageError, setImageError] = useState(false);
  const coverUrl = `/api/books/${book.id}/cover`;

  return (
    <Link href={`/book/${book.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-[var(--color-slate)] border border-white/5 card-hover">
        {/* Cover Image */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-obsidian)] via-transparent to-transparent z-10" />
          {!imageError && (
            <img
              src={coverUrl}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageError(true)}
            />
          )}
          {/* Fallback gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-electric-blue)]/20 to-[var(--color-electric-purple)]/20" />

          {/* Completion badge */}
          <div className="absolute top-3 right-3 z-20">
            <div className={`badge ${book.completionPercentage === 100 ? 'badge-emerald' : 'badge-blue'}`}>
              {book.completionPercentage}% Ready
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <h3 className="font-bold text-lg text-[var(--color-snow)] line-clamp-2 group-hover:text-[var(--color-electric-blue)] transition-colors">
            {book.title}
          </h3>
          <p className="text-sm text-[var(--color-silver)]">{book.author}</p>

          {/* Stats row */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-pearl)]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>{book.chaptersCount} chapters</span>
            </div>
            {book.hasQuizzes && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-electric-emerald)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Quizzes</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="progress-bar mt-3">
            <div
              className="progress-bar-fill"
              style={{ width: `${book.completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-electric-blue)]/10 to-transparent" />
        </div>
      </div>
    </Link>
  );
}

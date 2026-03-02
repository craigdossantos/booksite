"use client";

import { useState } from "react";
import type { Chapter } from "@/types/book";

interface ChapterListProps {
  bookId: string;
  chapters: Chapter[];
  onChapterExpand?: (chapterNumber: number | null) => void;
}

/**
 * Clean up raw chapter titles from EPUB extraction.
 * Strips .html/.xhtml suffixes and "xhtml" prefixes.
 * e.g. "xhtmlChapter01.html" -> "Chapter 01"
 */
function cleanTitle(title: string): string {
  let cleaned = title;
  // Strip file extensions
  cleaned = cleaned.replace(/\.(x?html?)$/i, "");
  // Strip leading "xhtml" prefix (case-insensitive)
  cleaned = cleaned.replace(/^xhtml/i, "");
  return cleaned.trim() || title;
}

/**
 * Render summary content as paragraphs.
 * Splits on double newlines and wraps each block in a <p> tag.
 */
function SummaryContent({ content }: { content: string }) {
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="text-[15px] leading-relaxed text-slate-700">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function ChapterList({
  bookId: _bookId,
  chapters,
  onChapterExpand,
}: ChapterListProps) {
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  const toggleChapter = (chapterNumber: number) => {
    const next = expandedChapter === chapterNumber ? null : chapterNumber;
    setExpandedChapter(next);
    onChapterExpand?.(next);
  };

  return (
    <div className="space-y-3">
      {chapters.map((chapter) => {
        const isExpanded = expandedChapter === chapter.number;
        const hasSummary = !!chapter.summary;

        return (
          <div
            key={chapter.number}
            className="border border-slate-200 rounded-lg bg-white overflow-hidden"
          >
            {/* Chapter header — always visible, clickable to expand */}
            <button
              type="button"
              onClick={() => hasSummary && toggleChapter(chapter.number)}
              className={`w-full text-left p-4 flex items-start gap-4 ${
                hasSummary
                  ? "cursor-pointer hover:bg-slate-50 transition-colors"
                  : "cursor-default"
              }`}
              aria-expanded={hasSummary ? isExpanded : undefined}
              disabled={!hasSummary}
            >
              {/* Chapter number */}
              <span className="text-sm text-slate-400 font-mono w-8 shrink-0 pt-0.5">
                {String(chapter.number).padStart(2, "0")}
              </span>

              {/* Title and meta */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 mb-1">
                  {cleanTitle(chapter.title)}
                </h3>

                {/* Preview text — only when collapsed and summary exists */}
                {hasSummary && !isExpanded && (
                  <p className="text-slate-500 text-sm line-clamp-2 mb-2">
                    {chapter.summary!.content}
                  </p>
                )}

                {/* No-summary state */}
                {!hasSummary && (
                  <p className="text-slate-400 text-sm italic">
                    Summary not available
                  </p>
                )}

                {/* Metadata badges */}
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>{chapter.wordCount.toLocaleString()} words</span>
                  {hasSummary && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {chapter.summary!.wordCount} word summary
                    </span>
                  )}
                </div>
              </div>

              {/* Expand/collapse chevron */}
              {hasSummary && (
                <span
                  className={`material-symbols-outlined text-xl text-slate-400 shrink-0 pt-0.5 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  expand_more
                </span>
              )}
            </button>

            {/* Collapsible summary content */}
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{
                gridTemplateRows: isExpanded ? "1fr" : "0fr",
              }}
            >
              <div className="overflow-hidden">
                <div className="border-t border-slate-100 px-4 pb-5 pt-4 pl-16">
                  {hasSummary && (
                    <SummaryContent content={chapter.summary!.content} />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

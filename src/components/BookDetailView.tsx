"use client";

import { useState, useCallback, useRef } from "react";
import type { BookWithChapters, ArtifactIndexEntry } from "@/types/book";
import { AppHeader } from "@/components/AppHeader";
import { ArtifactSidebar } from "@/components/ArtifactSidebar";
import { ChapterList } from "@/components/ChapterList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ArtifactViewer } from "@/components/artifacts/ArtifactViewer";

interface BookDetailViewProps {
  book: BookWithChapters;
  initialArtifacts: ArtifactIndexEntry[];
}

export function BookDetailView({
  book,
  initialArtifacts,
}: BookDetailViewProps) {
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  );
  const [activeView, setActiveView] = useState<
    { type: "chapter" | "artifact"; id: string } | undefined
  >(undefined);
  // Key to force ArtifactViewer to remount when the same artifact is updated
  const [viewerKey, setViewerKey] = useState(0);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const refreshArtifacts = useCallback(async () => {
    const res = await fetch(`/api/artifacts/${book.id}`);
    if (res.ok) {
      const data = await res.json();
      setArtifacts(data.artifacts);
    }
  }, [book.id]);

  const handleArtifactSelect = useCallback((artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setActiveView({ type: "artifact", id: artifactId });
    setViewerKey((k) => k + 1);
  }, []);

  // Called by ChatPanel when an artifact is created or updated
  const handleArtifactCreated = useCallback(
    async (artifactId: string) => {
      await refreshArtifacts();
      handleArtifactSelect(artifactId);
    },
    [refreshArtifacts, handleArtifactSelect],
  );

  const handleDeselectArtifact = useCallback(() => {
    setSelectedArtifactId(null);
    setActiveView(undefined);
  }, []);

  const handleCreateNew = useCallback(() => {
    // Focus the chat input to prompt the user to ask for a new artifact
    chatInputRef.current?.focus();
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <AppHeader
        bookTitle={book.title}
        authorName={book.author}
        onBookTitleClick={handleDeselectArtifact}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — artifact navigation */}
        <ArtifactSidebar
          artifacts={artifacts}
          selectedId={selectedArtifactId}
          onSelect={handleArtifactSelect}
          onCreateNew={handleCreateNew}
        />

        {/* Center — main content area */}
        <main className="flex-1 bg-slate-100 overflow-y-auto custom-scrollbar">
          {selectedArtifactId ? (
            <div className="p-6 md:p-10 h-full">
              <ArtifactViewer
                key={viewerKey}
                bookId={book.id}
                artifactId={selectedArtifactId}
              />
            </div>
          ) : (
            <div className="p-6 md:p-10 max-w-3xl mx-auto">
              {/* Book hero */}
              <header className="flex gap-6 mb-10">
                <div className="w-20 shrink-0">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={`Cover of ${book.title}`}
                      className="w-full rounded-lg shadow-md"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-slate-200 rounded-lg flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-3xl text-slate-400"
                        aria-hidden="true"
                      >
                        menu_book
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    {book.title}
                  </h1>
                  <p className="text-lg text-slate-600 mb-3">{book.author}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{book.chapterCount} chapters</span>
                    {book.voiceProfile && (
                      <span className="capitalize">
                        {book.voiceProfile.tone} &middot;{" "}
                        {book.voiceProfile.style}
                      </span>
                    )}
                  </div>
                </div>
              </header>

              {/* Chapter list */}
              <ChapterList bookId={book.id} chapters={book.chapters} />
            </div>
          )}
        </main>

        {/* Right panel — always-visible chat */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
          <ChatPanel
            bookId={book.id}
            activeView={activeView}
            onArtifactCreated={handleArtifactCreated}
            onArtifactSelect={handleArtifactSelect}
            chatInputRef={chatInputRef}
          />
        </aside>
      </div>
    </div>
  );
}

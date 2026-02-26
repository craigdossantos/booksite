"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { BookWithChapters, ArtifactIndexEntry } from "@/types/book";
import { AppHeader } from "@/components/AppHeader";
import { ArtifactSidebar } from "@/components/ArtifactSidebar";
import { ChapterList } from "@/components/ChapterList";
import { ProcessingOverlay } from "@/components/ProcessingOverlay";
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
  const router = useRouter();
  const [isReady, setIsReady] = useState(book.status === "ready");
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

  // Resizable chat panel
  const MIN_CHAT_WIDTH = 280;
  const MAX_CHAT_WIDTH_RATIO = 0.5;
  const [chatPanelWidth, setChatPanelWidth] = useState(320);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = chatPanelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [chatPanelWidth],
  );

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      const maxWidth = window.innerWidth * MAX_CHAT_WIDTH_RATIO;
      const newWidth = Math.min(
        maxWidth,
        Math.max(MIN_CHAT_WIDTH, dragStartWidth.current + delta),
      );
      setChatPanelWidth(newWidth);
    }

    function handleMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    function handleWindowResize() {
      setChatPanelWidth((prev) => {
        const maxWidth = window.innerWidth * MAX_CHAT_WIDTH_RATIO;
        return Math.min(maxWidth, Math.max(MIN_CHAT_WIDTH, prev));
      });
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("resize", handleWindowResize);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleWindowResize);
    };
  }, []);

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

  const handleReady = useCallback(() => {
    setIsReady(true);
    router.refresh();
  }, [router]);

  const setChatInputRef = useRef<((text: string) => void) | null>(null);

  const handleInputReady = useCallback((setter: (text: string) => void) => {
    setChatInputRef.current = setter;
  }, []);

  const handleCreateNewWithTemplate = useCallback((templatePrompt: string) => {
    setChatInputRef.current?.(templatePrompt);
    requestAnimationFrame(() => chatInputRef.current?.focus());
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
          onCreateNew={handleCreateNewWithTemplate}
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

              {/* Chapter list or processing overlay */}
              {isReady ? (
                <ChapterList bookId={book.id} chapters={book.chapters} />
              ) : (
                <ProcessingOverlay
                  bookId={book.id}
                  initialStatus={book.status}
                  onReady={handleReady}
                />
              )}
            </div>
          )}
        </main>

        {/* Drag handle for resizing chat panel */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleDragStart}
          className="w-1 relative cursor-col-resize group shrink-0 bg-slate-200 hover:bg-slate-300 transition-colors"
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 h-8 top-1/2 -translate-y-1/2 bg-slate-300 group-hover:bg-slate-400 rounded-full transition-colors" />
        </div>

        {/* Right panel — always-visible chat */}
        <aside
          className="bg-white border-l border-slate-200 flex flex-col shrink-0"
          style={{ width: chatPanelWidth }}
        >
          <ChatPanel
            bookId={book.id}
            activeView={activeView}
            onArtifactCreated={handleArtifactCreated}
            onArtifactSelect={handleArtifactSelect}
            chatInputRef={chatInputRef}
            onInputReady={handleInputReady}
          />
        </aside>
      </div>
    </div>
  );
}

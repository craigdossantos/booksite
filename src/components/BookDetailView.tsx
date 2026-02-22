"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { BookWithChapters, ArtifactIndexEntry } from "@/types/book";
import { ChapterList } from "@/components/ChapterList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ArtifactList } from "@/components/artifacts/ArtifactList";
import { ArtifactViewer } from "@/components/artifacts/ArtifactViewer";

interface BookDetailViewProps {
  book: BookWithChapters;
  initialArtifacts: ArtifactIndexEntry[];
}

type Tab = "chapters" | "artifacts";

export function BookDetailView({
  book,
  initialArtifacts,
}: BookDetailViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chapters");
  const [chatOpen, setChatOpen] = useState(true);
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  );
  const [activeView, setActiveView] = useState<
    { type: "chapter" | "artifact"; id: string } | undefined
  >(undefined);

  const refreshArtifacts = useCallback(async () => {
    const res = await fetch(`/api/artifacts/${book.id}`);
    if (res.ok) {
      const data = await res.json();
      setArtifacts(data.artifacts);
    }
  }, [book.id]);

  const handleArtifactSelect = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setActiveView({ type: "artifact", id: artifactId });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          <span>&larr;</span>
          <span>Back to library</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — book content */}
        <div
          className={`flex-1 overflow-y-auto ${chatOpen ? "border-r border-gray-200" : ""}`}
        >
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Book header */}
            <header className="flex gap-8 mb-8">
              <div className="w-24 shrink-0">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={`Cover of ${book.title}`}
                    className="w-full rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-3xl">{"\uD83D\uDCD6"}</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-serif font-bold text-gray-900 mb-1">
                  {book.title}
                </h1>
                <p className="text-lg text-gray-600 mb-3">{book.author}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
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

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-gray-200">
              <button
                onClick={() => {
                  setActiveTab("chapters");
                  setSelectedArtifactId(null);
                  setActiveView(undefined);
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "chapters"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Chapters
              </button>
              <button
                onClick={() => {
                  setActiveTab("artifacts");
                  refreshArtifacts();
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "artifacts"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Artifacts
                {artifacts.length > 0 && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {artifacts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "chapters" && (
              <ChapterList bookId={book.id} chapters={book.chapters} />
            )}

            {activeTab === "artifacts" && !selectedArtifactId && (
              <ArtifactList
                artifacts={artifacts}
                onSelect={handleArtifactSelect}
              />
            )}

            {activeTab === "artifacts" && selectedArtifactId && (
              <div>
                <button
                  onClick={() => {
                    setSelectedArtifactId(null);
                    setActiveView(undefined);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                  &larr; Back to artifacts
                </button>
                <div className="h-[600px] border border-gray-200 rounded-lg overflow-hidden">
                  <ArtifactViewer
                    bookId={book.id}
                    artifactId={selectedArtifactId}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — chat */}
        {chatOpen ? (
          <div className="w-96 flex flex-col bg-white">
            <ChatPanel
              bookId={book.id}
              activeView={activeView}
              onArtifactCreated={refreshArtifacts}
            />
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed right-4 bottom-4 w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
            title="Open chat"
          >
            {"\uD83D\uDCAC"}
          </button>
        )}
      </div>
    </div>
  );
}

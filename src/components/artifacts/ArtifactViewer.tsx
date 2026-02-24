"use client";

import { useState, useEffect } from "react";
import type { ArtifactMeta } from "@/types/book";
import { ARTIFACT_TYPE_CONFIG } from "@/lib/artifact-types";

interface ArtifactViewerProps {
  bookId: string;
  artifactId: string;
}

export function ArtifactViewer({ bookId, artifactId }: ArtifactViewerProps) {
  const [meta, setMeta] = useState<ArtifactMeta | null>(null);
  const [html, setHtml] = useState<string>("");
  const [viewVersion, setViewVersion] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(
        `/api/artifacts/${bookId}/${artifactId}${viewVersion ? `?version=${viewVersion}` : ""}`,
      );
      if (res.ok) {
        const data = await res.json();
        setMeta(data.meta);
        setHtml(data.html);
        if (!viewVersion) setViewVersion(data.meta.currentVersion);
      }
      setLoading(false);
    }
    load();
  }, [bookId, artifactId, viewVersion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span className="material-symbols-outlined animate-spin text-2xl mr-2">
          progress_activity
        </span>
        Loading...
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Artifact not found.
      </div>
    );
  }

  const artifactType = meta.type ?? "note";
  const typeConfig = ARTIFACT_TYPE_CONFIG[artifactType];
  const createdDate = meta.versions[0]?.createdAt;
  const timeAgo = createdDate ? formatTimeAgo(createdDate) : "";

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Type-colored header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`size-9 rounded-lg ${typeConfig.bgLight} flex items-center justify-center`}
          >
            <span
              className={`material-symbols-outlined text-xl ${typeConfig.color}`}
            >
              {typeConfig.icon}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {meta.title}
            </h3>
            <p className="text-xs text-slate-500">
              {typeConfig.label}
              {timeAgo && <> &middot; Created {timeAgo}</>}
              {meta.chapters.length > 0 && (
                <> &middot; Ch {meta.chapters.join(", ")}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Version nav */}
          <button
            onClick={() => setViewVersion((v) => Math.max(1, v - 1))}
            disabled={viewVersion <= 1}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
            aria-label="Previous version"
          >
            <span
              className="material-symbols-outlined text-lg"
              aria-hidden="true"
            >
              chevron_left
            </span>
          </button>
          <span className="text-xs text-slate-500 tabular-nums min-w-[3.5rem] text-center">
            v{viewVersion}/{meta.currentVersion}
          </span>
          <button
            onClick={() =>
              setViewVersion((v) => Math.min(meta.currentVersion, v + 1))
            }
            disabled={viewVersion >= meta.currentVersion}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
            aria-label="Next version"
          >
            <span
              className="material-symbols-outlined text-lg"
              aria-hidden="true"
            >
              chevron_right
            </span>
          </button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Action buttons */}
          <button
            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Edit artifact"
          >
            <span
              className="material-symbols-outlined text-lg"
              aria-hidden="true"
            >
              edit
            </span>
          </button>
          <button
            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Share artifact"
          >
            <span
              className="material-symbols-outlined text-lg"
              aria-hidden="true"
            >
              share
            </span>
          </button>
          <button
            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="More options"
          >
            <span
              className="material-symbols-outlined text-lg"
              aria-hidden="true"
            >
              more_horiz
            </span>
          </button>
        </div>
      </div>

      {/* Sandboxed iframe */}
      <div className="flex-1">
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          className="w-full h-full border-0"
          title={meta.title}
        />
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

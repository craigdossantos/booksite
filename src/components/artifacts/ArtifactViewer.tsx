"use client";

import { useState, useEffect } from "react";
import type { ArtifactMeta } from "@/types/book";

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
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading...
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Artifact not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with version nav */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700 truncate">
          {meta.title}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => setViewVersion((v) => Math.max(1, v - 1))}
            disabled={viewVersion <= 1}
            className="px-1 hover:text-gray-900 disabled:opacity-30"
          >
            &larr;
          </button>
          <span>
            v{viewVersion}/{meta.currentVersion}
          </span>
          <button
            onClick={() =>
              setViewVersion((v) => Math.min(meta.currentVersion, v + 1))
            }
            disabled={viewVersion >= meta.currentVersion}
            className="px-1 hover:text-gray-900 disabled:opacity-30"
          >
            &rarr;
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

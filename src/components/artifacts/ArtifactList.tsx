"use client";

import type { ArtifactIndexEntry } from "@/types/book";

interface ArtifactListProps {
  artifacts: ArtifactIndexEntry[];
  onSelect: (artifactId: string) => void;
  selectedId?: string;
}

export function ArtifactList({
  artifacts,
  onSelect,
  selectedId,
}: ArtifactListProps) {
  if (!artifacts.length) {
    return (
      <div className="text-center text-slate-400 text-sm py-8">
        <p>No artifacts yet.</p>
        <p className="mt-1">
          Ask the chat agent to create concept maps, study guides, or diagrams.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {artifacts.map((artifact) => (
        <button
          key={artifact.id}
          onClick={() => onSelect(artifact.id)}
          className={`w-full text-left p-4 border rounded-lg transition-all ${
            selectedId === artifact.id
              ? "border-slate-500 bg-slate-50"
              : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
          }`}
        >
          <h3 className="font-semibold text-slate-900 text-sm">
            {artifact.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{artifact.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>v{artifact.currentVersion}</span>
            {artifact.chapters.length > 0 && (
              <span>Ch {artifact.chapters.join(", ")}</span>
            )}
            <span>{new Date(artifact.updatedAt).toLocaleDateString()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

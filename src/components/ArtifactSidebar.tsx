"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { ArtifactIndexEntry } from "@/types/book";
import {
  ARTIFACT_TYPE_CONFIG,
  ARTIFACT_TYPE_ORDER,
  ARTIFACT_TEMPLATE_PROMPTS,
} from "@/lib/artifact-types";

interface ArtifactSidebarProps {
  artifacts: ArtifactIndexEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: (templatePrompt: string) => void;
}

export function ArtifactSidebar({
  artifacts,
  selectedId,
  onSelect,
  onCreateNew,
}: ArtifactSidebarProps) {
  const grouped = useMemo(
    () =>
      ARTIFACT_TYPE_ORDER.map((type) => ({
        type,
        config: ARTIFACT_TYPE_CONFIG[type],
        items: artifacts.filter((a) => (a.type ?? "note") === type),
      })).filter((g) => g.items.length > 0),
    [artifacts],
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-4" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2 px-4 rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <span
            className="material-symbols-outlined text-lg"
            aria-hidden="true"
          >
            add
          </span>
          Create New
          <span
            className={`material-symbols-outlined text-lg transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            expand_more
          </span>
        </button>

        {dropdownOpen && (
          <div className="mt-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
            {ARTIFACT_TYPE_ORDER.map((type) => {
              const config = ARTIFACT_TYPE_CONFIG[type];
              const prompt = ARTIFACT_TEMPLATE_PROMPTS[type];
              return (
                <button
                  key={type}
                  onClick={() => {
                    setDropdownOpen(false);
                    onCreateNew(prompt);
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <span
                    className={`material-symbols-outlined text-lg mt-0.5 ${config.color}`}
                  >
                    {config.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">
                      {config.label}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {prompt}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
        {grouped.map(({ type, config, items }) => (
          <div key={type} className="mb-6">
            <div className="px-3 mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {config.labelPlural}
              </h3>
              <span className="text-xs text-slate-400">{items.length}</span>
            </div>
            <ul className="space-y-0.5">
              {items.map((artifact) => {
                const isActive = artifact.id === selectedId;
                return (
                  <li key={artifact.id}>
                    <button
                      onClick={() => onSelect(artifact.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                        isActive
                          ? `bg-white border border-slate-200 shadow-sm border-l-4 ${config.activeColor} font-medium text-slate-900`
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-lg ${isActive ? config.color : "text-slate-400"}`}
                      >
                        {config.icon}
                      </span>
                      <span className="truncate">{artifact.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {artifacts.length === 0 && (
          <div className="text-center text-slate-400 text-sm px-4 py-8">
            <span className="material-symbols-outlined text-3xl mb-2 block">
              auto_awesome
            </span>
            <p>No artifacts yet.</p>
            <p className="mt-1">
              Ask the Book Companion to create summaries, quizzes, or diagrams.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="material-symbols-outlined text-sm">storage</span>
          <span>Storage: {artifacts.length}/50 Artifacts</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
          <div
            className="bg-slate-600 h-1 rounded-full transition-all"
            style={{
              width: `${Math.min(100, (artifacts.length / 50) * 100)}%`,
            }}
          />
        </div>
      </div>
    </aside>
  );
}

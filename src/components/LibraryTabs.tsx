"use client";

export type LibraryTab = "my-library" | "community";

interface LibraryTabsProps {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
}

export function LibraryTabs({ activeTab, onTabChange }: LibraryTabsProps) {
  return (
    <div className="border-b border-slate-200">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange("my-library")}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "my-library"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          My Library
        </button>
        <button
          onClick={() => onTabChange("community")}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "community"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Community Library
        </button>
      </nav>
    </div>
  );
}

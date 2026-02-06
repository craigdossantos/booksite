"use client";

export type LibraryTab = "my-library" | "community";

interface LibraryTabsProps {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
}

export function LibraryTabs({ activeTab, onTabChange }: LibraryTabsProps) {
  return (
    <div className="border-b border-stone-200">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange("my-library")}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "my-library"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300"
          }`}
        >
          My Library
        </button>
        <button
          onClick={() => onTabChange("community")}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "community"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300"
          }`}
        >
          Community Library
        </button>
      </nav>
    </div>
  );
}

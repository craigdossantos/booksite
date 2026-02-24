"use client";

import { useState, useRef, useEffect } from "react";

interface BookCardMenuProps {
  bookTitle: string;
  onDelete: () => void;
}

export function BookCardMenu({ bookTitle, onDelete }: BookCardMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function handleDelete() {
    setIsOpen(false);
    const confirmed = window.confirm(
      `Delete "${bookTitle}"? This cannot be undone.`,
    );
    if (confirmed) {
      onDelete();
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-sm transition-colors"
        aria-label="Book options"
      >
        ⋮
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

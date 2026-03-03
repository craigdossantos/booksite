"use client";

import { useAuth } from "@/components/AuthProvider";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const name =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    null;
  const email = user.email ?? null;
  const image = (user.user_metadata?.avatar_url as string) ?? null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        {image ? (
          <img src={image} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 text-sm font-medium">
            {name?.charAt(0) || email?.charAt(0)}
          </div>
        )}
        <span className="text-sm text-slate-700 hidden sm:inline">
          {name || email}
        </span>
        <span
          className={`material-symbols-outlined text-lg text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-900 truncate">
              {name}
            </p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import type { AIContentItem } from "@/types/book";

interface AccordionStateContextType {
  // Expansion state
  expandedItems: Set<string>;
  toggleItem: (id: string) => void;
  expandItem: (id: string) => void;
  collapseItem: (id: string) => void;
  expandToSection: (id: string) => void;

  // AI content
  aiContent: AIContentItem[];
  addAIContent: (item: AIContentItem) => void;
  deleteAIContent: (id: string) => void;

  // Scroll management
  scrollToItem: (id: string) => void;
}

const AccordionStateContext = createContext<
  AccordionStateContextType | undefined
>(undefined);

interface AccordionStateProviderProps {
  children: ReactNode;
  bookId: string;
  sectionId: string; // chapterId or conceptId
}

export function AccordionStateProvider({
  children,
  bookId,
  sectionId,
}: AccordionStateProviderProps) {
  // Initialize with 'summary' always expanded
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(["summary"]),
  );
  const [aiContent, setAIContent] = useState<AIContentItem[]>([]);

  // Load AI content from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = `accordion-ai-${bookId}:${sectionId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAIContent(parsed);
      } catch (error) {
        console.error("Failed to parse stored AI content:", error);
      }
    }
  }, [bookId, sectionId]);

  // Save AI content to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = `accordion-ai-${bookId}:${sectionId}`;
    localStorage.setItem(storageKey, JSON.stringify(aiContent));
  }, [aiContent, bookId, sectionId]);

  const toggleItem = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandItem = useCallback((id: string) => {
    setExpandedItems((prev) => new Set(prev).add(id));
  }, []);

  const collapseItem = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Expand all parent sections to reveal a specific item
  const expandToSection = useCallback((id: string) => {
    // Parse hierarchical ID (e.g., "chapter-1.story-2.ai-3")
    const parts = id.split(".");
    setExpandedItems((prev) => {
      const next = new Set(prev);
      // Expand all parents
      for (let i = 0; i < parts.length; i++) {
        const parentId = parts.slice(0, i + 1).join(".");
        next.add(parentId);
      }
      return next;
    });
  }, []);

  const addAIContent = useCallback(
    (item: AIContentItem) => {
      setAIContent((prev) => [...prev, item]);
      // Auto-expand parent sections to reveal new content
      expandToSection(item.parentId);
    },
    [expandToSection],
  );

  const deleteAIContent = useCallback((id: string) => {
    setAIContent((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isDeleted: true } : item,
      ),
    );
  }, []);

  const scrollToItem = useCallback(
    (id: string) => {
      if (typeof window === "undefined") return;

      // First expand to the section
      expandToSection(id);

      // Wait for expansion animation, then scroll
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          // Add highlight effect
          element.classList.add("highlight-flash");
          setTimeout(() => {
            element.classList.remove("highlight-flash");
          }, 2000);
        }
      }, 300);
    },
    [expandToSection],
  );

  const value: AccordionStateContextType = {
    expandedItems,
    toggleItem,
    expandItem,
    collapseItem,
    expandToSection,
    aiContent,
    addAIContent,
    deleteAIContent,
    scrollToItem,
  };

  return (
    <AccordionStateContext.Provider value={value}>
      {children}
    </AccordionStateContext.Provider>
  );
}

export function useAccordionState() {
  const context = useContext(AccordionStateContext);
  if (!context) {
    throw new Error(
      "useAccordionState must be used within AccordionStateProvider",
    );
  }
  return context;
}

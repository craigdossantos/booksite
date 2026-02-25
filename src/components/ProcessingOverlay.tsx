"use client";

import { useState, useEffect, useRef } from "react";
import type { ProcessingStatus } from "@/types/book";

interface ProcessingOverlayProps {
  bookId: string;
  initialStatus: ProcessingStatus["status"];
  onReady: () => void;
}

export function ProcessingOverlay({
  bookId,
  initialStatus,
  onReady,
}: ProcessingOverlayProps) {
  const [status, setStatus] =
    useState<ProcessingStatus["status"]>(initialStatus);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [chapterCount, setChapterCount] = useState(0);
  const [error, setError] = useState<string | undefined>();

  const readyFired = useRef(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/status`);
        if (!res.ok) return;
        const data: ProcessingStatus = await res.json();
        setStatus(data.status);
        setCurrentStep(data.currentStep);
        setProgress(data.progress);
        setChapterCount(data.totalChapters);
        if (data.error) setError(data.error);
        if (data.status === "ready" && !readyFired.current) {
          readyFired.current = true;
          onReady();
        }
      } catch {
        // Silently retry on next interval
      }
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [bookId, onReady]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span
          className="material-symbols-outlined text-4xl text-red-500 mb-4"
          aria-hidden="true"
        >
          error
        </span>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Processing failed
        </h2>
        <p className="text-sm text-slate-500 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-700 mb-6" />
      <h2 className="text-lg font-semibold text-slate-900 mb-1">
        Processing book&hellip;
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        {currentStep || "Starting up"}
        {chapterCount > 0 && ` \u00b7 ${chapterCount} chapters`}
      </p>
      <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-700 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-2">{progress}%</p>
    </div>
  );
}

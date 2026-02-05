"use client";

import { useState } from "react";

interface SummaryProps {
  content: string;
}

export function Summary({ content }: SummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-l-4 border-green-500 bg-green-50 rounded-r-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-green-100/50 transition-colors"
      >
        <span className="font-medium text-green-800">Chapter Summary</span>
        <span className="text-green-600">{isExpanded ? "−" : "+"}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}

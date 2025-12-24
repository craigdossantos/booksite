"use client";

import { motion } from "framer-motion";
import type { AIContentItem } from "@/types/book";

interface AIAccordionItemProps {
  item: AIContentItem;
  onDelete: (id: string) => void;
  className?: string;
}

export default function AIAccordionItem({
  item,
  onDelete,
  className = "",
}: AIAccordionItemProps) {
  // Don't render deleted items
  if (item.isDeleted) {
    return null;
  }

  const isFollowup = item.type === "followup";

  // Depth-based styling
  const borderColor = isFollowup ? "border-amber-500" : "border-emerald-500";
  const bgGradient = isFollowup
    ? "bg-gradient-to-br from-amber-50 to-orange-50"
    : "bg-gradient-to-br from-emerald-50 to-cyan-50";
  const iconColor = isFollowup ? "text-amber-600" : "text-emerald-600";
  const marginLeft = isFollowup ? "ml-40" : "ml-32"; // Depth 5 vs 4

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3 }}
      className={`${marginLeft} ${className} group relative mb-4 ai-added`}
      id={item.id}
    >
      <div
        className={`${borderColor} border-l-4 ${bgGradient} rounded-lg p-5 shadow-lg transition-shadow hover:shadow-xl`}
      >
        {/* Header with question */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">💬</span>
            <div className="flex-1">
              <span className={`text-xs ${iconColor} font-medium block mb-1`}>
                {isFollowup ? "FOLLOW-UP" : "YOU ASKED"}
              </span>
              <h5 className="font-semibold text-gray-900 text-sm">
                {item.question}
              </h5>
            </div>
          </div>

          {/* Delete button - hidden by default, visible on hover */}
          <button
            onClick={() => onDelete(item.id)}
            className="delete-btn opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 text-xs ml-2 px-2 py-1 rounded hover:bg-red-50"
            title="Remove this AI conversation"
            aria-label={`Delete ${isFollowup ? "follow-up" : "question"}: ${item.question}`}
          >
            ✕
          </button>
        </div>

        {/* AI Answer */}
        <div className="text-sm text-gray-700 space-y-2 ml-7 leading-relaxed">
          {item.answer.split("\n").map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 mt-3 ml-7">
          {new Date(item.createdAt).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

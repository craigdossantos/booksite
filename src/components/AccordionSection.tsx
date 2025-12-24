"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface AccordionSectionProps {
  id: string;
  depth: 1 | 2 | 3 | 4 | 5;
  title?: string;
  icon?: string;
  children: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  alwaysExpanded?: boolean; // For level 1 summary
  className?: string;
}

// Depth-based styling configuration
const depthStyles = {
  1: {
    border: "border-l-4 border-blue-500",
    bg: "bg-gray-900/70",
    marginLeft: "ml-0",
    textColor: "text-white",
  },
  2: {
    border: "border-l-3 border-cyan-500",
    bg: "bg-gray-900/50",
    marginLeft: "ml-8",
    textColor: "text-gray-100",
  },
  3: {
    border: "border-l-2 border-cyan-600",
    bg: "bg-gray-800/50",
    marginLeft: "ml-16",
    textColor: "text-gray-200",
  },
  4: {
    border: "border-l-4 border-emerald-500",
    bg: "bg-gradient-to-br from-emerald-50 to-cyan-50",
    marginLeft: "ml-24",
    textColor: "text-gray-900",
  },
  5: {
    border: "border-l-4 border-amber-500",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50",
    marginLeft: "ml-32",
    textColor: "text-gray-900",
  },
};

export default function AccordionSection({
  id,
  depth,
  title,
  icon,
  children,
  isExpanded,
  onToggle,
  alwaysExpanded = false,
  className = "",
}: AccordionSectionProps) {
  const style = depthStyles[depth];
  const showToggle = !alwaysExpanded;

  return (
    <div id={id} className={`${style.marginLeft} ${className} relative mb-4`}>
      <div
        className={`${style.border} ${style.bg} backdrop-blur border border-gray-700/50 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg`}
      >
        {/* Header */}
        {title && (
          <button
            onClick={showToggle ? onToggle : undefined}
            disabled={!showToggle}
            className={`w-full px-6 py-4 flex items-center justify-between ${
              showToggle ? "cursor-pointer hover:bg-white/5" : "cursor-default"
            } transition-colors`}
          >
            <div className="flex items-center gap-3">
              {icon && <span className="text-2xl">{icon}</span>}
              <div className="text-left">
                {depth <= 3 && (
                  <div className="text-xs text-gray-400 mb-1">
                    DEPTH {depth}
                  </div>
                )}
                <h3 className={`text-lg font-bold ${style.textColor}`}>
                  {title}
                </h3>
              </div>
            </div>
            {showToggle && (
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className={style.textColor}
              >
                ▶
              </motion.div>
            )}
          </button>
        )}

        {/* Content */}
        <AnimatePresence initial={false}>
          {(isExpanded || alwaysExpanded) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div
                className={`px-6 py-4 ${title ? "border-t border-white/10" : ""}`}
              >
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

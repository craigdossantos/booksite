"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LearningTreeNode, DepthLevel, ChapterData, Concept } from "@/types/book";

interface LearningTreeProps {
  chapters: ChapterData[];
  concepts: Concept[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string, type: 'chapter' | 'concept') => void;
  className?: string;
}

interface TreeNodeData {
  id: string;
  type: 'theme' | 'chapter' | 'concept';
  title: string;
  children: TreeNodeData[];
  conceptCount?: number;
  hasContent?: boolean;
}

export default function LearningTree({
  chapters,
  concepts,
  selectedNodeId,
  onNodeSelect,
  className = "",
}: LearningTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [searchQuery, setSearchQuery] = useState("");

  // Build tree structure from chapters and concepts
  const buildTree = useCallback((): TreeNodeData[] => {
    // Group chapters into themes based on their titles
    const themes: Record<string, ChapterData[]> = {};

    chapters.forEach(chapter => {
      // Extract theme from chapter title or use "Main Content"
      let theme = "Main Content";

      // Try to detect themes based on common patterns
      if (chapter.title.toLowerCase().includes("introduction") ||
          chapter.title.toLowerCase().includes("preface") ||
          chapter.title.toLowerCase().includes("foreword")) {
        theme = "Introduction";
      } else if (chapter.title.toLowerCase().includes("conclusion") ||
                 chapter.title.toLowerCase().includes("final") ||
                 chapter.title.toLowerCase().includes("summary")) {
        theme = "Conclusion";
      } else if (chapter.title.toLowerCase().includes("appendix")) {
        theme = "Appendices";
      }

      if (!themes[theme]) {
        themes[theme] = [];
      }
      themes[theme].push(chapter);
    });

    // Build tree nodes
    return Object.entries(themes).map(([themeName, themeChapters]) => ({
      id: `theme-${themeName.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'theme' as const,
      title: themeName,
      children: themeChapters.map(chapter => {
        // Find concepts for this chapter
        const chapterConcepts = concepts.filter(concept =>
          concept.occurrences?.some(occ =>
            occ.toLowerCase().includes(chapter.title.toLowerCase()) ||
            chapter.title.toLowerCase().includes(occ.toLowerCase())
          )
        );

        return {
          id: chapter.id,
          type: 'chapter' as const,
          title: chapter.title,
          conceptCount: chapterConcepts.length,
          hasContent: !!chapter.summary,
          children: chapterConcepts.slice(0, 5).map(concept => ({
            id: `concept-${concept.name.toLowerCase().replace(/\s+/g, '-')}`,
            type: 'concept' as const,
            title: concept.name,
            children: [],
          })),
        };
      }),
    }));
  }, [chapters, concepts]);

  const tree = buildTree();

  // Filter tree based on search
  const filterTree = useCallback((nodes: TreeNodeData[], query: string): TreeNodeData[] => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();

    return nodes.reduce((acc: TreeNodeData[], node) => {
      const matchesTitle = node.title.toLowerCase().includes(lowerQuery);
      const filteredChildren = filterTree(node.children, query);

      if (matchesTitle || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }

      return acc;
    }, []);
  }, []);

  const filteredTree = filterTree(tree, searchQuery);

  // Expand all nodes when searching
  useEffect(() => {
    if (searchQuery) {
      const allNodeIds = new Set<string>();
      const collectIds = (nodes: TreeNodeData[]) => {
        nodes.forEach(node => {
          allNodeIds.add(node.id);
          collectIds(node.children);
        });
      };
      collectIds(filteredTree);
      setExpandedNodes(allNodeIds);
    }
  }, [searchQuery, filteredTree]);

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleNodeClick = useCallback((node: TreeNodeData) => {
    if (node.type === 'chapter') {
      onNodeSelect(node.id, 'chapter');
    } else if (node.type === 'concept') {
      onNodeSelect(node.id, 'concept');
    }
  }, [onNodeSelect]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search */}
      <div className="p-4 border-b border-black/5">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters & concepts..."
            className="w-full px-4 py-2 pl-10 rounded-xl bg-white border border-black/10 text-[var(--color-snow)] placeholder-[var(--color-silver)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-electric-blue)]/50"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-steel)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-steel)] hover:text-[var(--color-snow)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {filteredTree.map(node => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              onToggle={toggleExpand}
              onClick={handleNodeClick}
            />
          ))}
        </div>

        {filteredTree.length === 0 && searchQuery && (
          <div className="text-center py-8 text-[var(--color-steel)]">
            <p className="text-sm">No results for "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-black/5 bg-[var(--color-slate)]/50">
        <div className="flex items-center justify-between text-xs text-[var(--color-pearl)]">
          <span>{chapters.length} chapters</span>
          <span className="w-px h-3 bg-black/10" />
          <span>{concepts.length} concepts</span>
        </div>
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  onToggle: (nodeId: string) => void;
  onClick: (node: TreeNodeData) => void;
}

function TreeNode({
  node,
  depth,
  expandedNodes,
  selectedNodeId,
  onToggle,
  onClick,
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const hasChildren = node.children.length > 0;

  const getIcon = () => {
    switch (node.type) {
      case 'theme':
        return isExpanded ? '📂' : '📁';
      case 'chapter':
        return '📖';
      case 'concept':
        return '💡';
      default:
        return '📄';
    }
  };

  const getTypeColor = () => {
    switch (node.type) {
      case 'theme':
        return 'text-[var(--color-electric-purple)]';
      case 'chapter':
        return 'text-[var(--color-electric-blue)]';
      case 'concept':
        return 'text-[var(--color-electric-cyan)]';
      default:
        return 'text-[var(--color-pearl)]';
    }
  };

  return (
    <div>
      <motion.div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
          ${isSelected
            ? 'bg-[var(--color-electric-blue)]/10 border border-[var(--color-electric-blue)]/30'
            : 'hover:bg-black/5 border border-transparent'
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => {
          if (hasChildren && node.type === 'theme') {
            onToggle(node.id);
          } else {
            onClick(node);
          }
        }}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Expand/Collapse Arrow */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="w-4 h-4 flex items-center justify-center text-[var(--color-steel)] hover:text-[var(--color-snow)]"
          >
            <motion.svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </motion.svg>
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Icon */}
        <span className="text-sm">{getIcon()}</span>

        {/* Title */}
        <span className={`flex-1 text-sm truncate ${getTypeColor()} ${isSelected ? 'font-medium' : ''}`}>
          {node.title}
        </span>

        {/* Badges */}
        {node.type === 'chapter' && node.conceptCount !== undefined && node.conceptCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[var(--color-electric-cyan)]/20 text-[var(--color-electric-cyan)]">
            {node.conceptCount}
          </span>
        )}

        {node.type === 'theme' && (
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[var(--color-electric-purple)]/20 text-[var(--color-electric-purple)]">
            {node.children.length}
          </span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expandedNodes={expandedNodes}
                selectedNodeId={selectedNodeId}
                onToggle={onToggle}
                onClick={onClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

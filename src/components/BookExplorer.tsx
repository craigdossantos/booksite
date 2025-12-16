"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LearningTree from "./LearningTree";
import DepthPanel from "./DepthPanel";
import AIChat from "./AIChat";
import { useUIActions } from "@/hooks/useUIActions";
import type {
  UIAction,
  DepthLevel,
  ChapterData,
  Concept,
  QuizQuestion,
  QuizChapter,
  FeynmanData,
  FeynmanChapterData,
  ProjectData,
  SchemaData,
} from "@/types/book";

interface BookExplorerProps {
  bookId: string;
  title: string;
  author: string;
  chapters: ChapterData[];
  concepts: Concept[];
  quizzes: QuizChapter[];
  feynman?: FeynmanData;
  feynmanChapters: FeynmanChapterData[];
  projects: ProjectData[];
  schemas: SchemaData[];
  initialChapterId?: string;
  initialConceptId?: string;
}

type SelectionType = 'chapter' | 'concept' | null;

export default function BookExplorer({
  bookId,
  title,
  author,
  chapters,
  concepts,
  quizzes,
  feynman,
  feynmanChapters,
  projects,
  schemas,
  initialChapterId,
  initialConceptId,
}: BookExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showAIChat, setShowAIChat] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialChapterId || initialConceptId || null
  );
  const [selectionType, setSelectionType] = useState<SelectionType>(
    initialChapterId ? 'chapter' : initialConceptId ? 'concept' : null
  );
  const [highlightedConcept, setHighlightedConcept] = useState<string | null>(null);

  // Handle UI actions from AI chat
  const handleUIAction = useCallback((action: UIAction) => {
    switch (action.type) {
      case 'navigate':
        // Navigate to a section (chapter or concept)
        const chapter = chapters.find(c => c.id === action.sectionId);
        if (chapter) {
          setSelectedNodeId(chapter.id);
          setSelectionType('chapter');
          router.push(`/book/${bookId}?mode=explore&chapter=${chapter.id}`, { scroll: false });
        } else {
          // Try to find as concept
          const concept = concepts.find(c =>
            c.name.toLowerCase().replace(/\s+/g, '-') === action.sectionId ||
            c.name.toLowerCase() === action.sectionId?.toLowerCase()
          );
          if (concept) {
            setSelectedNodeId(`concept-${concept.name.toLowerCase().replace(/\s+/g, '-')}`);
            setSelectionType('concept');
          }
        }
        break;

      case 'openDepthLevel':
        // Open a specific depth level for a node
        setSelectedNodeId(action.nodeId);
        // The depth level is handled by DepthPanel internally
        break;

      case 'highlightConcept':
        // Highlight a concept temporarily
        setHighlightedConcept(action.conceptId);
        setTimeout(() => setHighlightedConcept(null), 3000);
        break;

      case 'showQuiz':
        // Open quiz for a concept (handled by DepthPanel)
        break;

      case 'expandTreeNode':
        // This would be handled by LearningTree if we passed down the action
        break;

      default:
        break;
    }
  }, [chapters, concepts, bookId, router]);

  // Subscribe to UI actions from the action bus
  useUIActions(handleUIAction);

  // Handle node selection from tree
  const handleNodeSelect = useCallback((nodeId: string, type: 'chapter' | 'concept') => {
    setSelectedNodeId(nodeId);
    setSelectionType(type);

    // Update URL
    if (type === 'chapter') {
      router.push(`/book/${bookId}?mode=explore&chapter=${nodeId}`, { scroll: false });
    } else {
      router.push(`/book/${bookId}?mode=explore&concept=${nodeId}`, { scroll: false });
    }
  }, [bookId, router]);

  // Get current chapter data
  const selectedChapter = useMemo(() => {
    if (selectionType !== 'chapter' || !selectedNodeId) return null;
    return chapters.find(c => c.id === selectedNodeId) || null;
  }, [selectionType, selectedNodeId, chapters]);

  // Get current concept data
  const selectedConcept = useMemo(() => {
    if (selectionType !== 'concept' || !selectedNodeId) return null;
    const conceptName = selectedNodeId.replace('concept-', '').replace(/-/g, ' ');
    return concepts.find(c =>
      c.name.toLowerCase() === conceptName ||
      c.name.toLowerCase().replace(/\s+/g, '-') === selectedNodeId.replace('concept-', '')
    ) || null;
  }, [selectionType, selectedNodeId, concepts]);

  // Get Feynman explanation for current chapter
  const currentFeynman = useMemo(() => {
    if (!selectedChapter) return undefined;
    return feynmanChapters.find(f => {
      const normSource = f.source_chapter.toLowerCase().replace(/_/g, ' ').replace(/\.html$/, '');
      const normChapter = selectedChapter.id.toLowerCase().replace(/_/g, ' ').replace(/\.md$/, '');
      return normSource.includes(normChapter) || normChapter.includes(normSource);
    });
  }, [selectedChapter, feynmanChapters]);

  // Get quizzes for current selection
  const currentQuizzes = useMemo((): QuizQuestion[] => {
    if (selectedChapter) {
      const quizChapter = quizzes.find(q => {
        const normSource = q.source_chapter.toLowerCase().replace(/_/g, ' ');
        const normChapter = selectedChapter.title.toLowerCase();
        return normSource.includes(normChapter) || normChapter.includes(normSource);
      });
      return quizChapter?.questions || [];
    }

    if (selectedConcept) {
      // Find quizzes related to this concept
      const conceptName = selectedConcept.name.toLowerCase();
      const related: QuizQuestion[] = [];
      for (const q of quizzes) {
        for (const question of q.questions) {
          if (question.question.toLowerCase().includes(conceptName)) {
            related.push(question);
          }
        }
      }
      return related.slice(0, 5);
    }

    return [];
  }, [selectedChapter, selectedConcept, quizzes]);

  // Get projects for current selection
  const currentProjects = useMemo(() => {
    if (selectedConcept) {
      const conceptName = selectedConcept.name.toLowerCase();
      return projects.filter(p =>
        p.related_concept.toLowerCase().includes(conceptName) ||
        conceptName.includes(p.related_concept.toLowerCase())
      );
    }

    if (selectedChapter) {
      // Get concepts for this chapter
      const chapterConcepts = concepts.filter(c =>
        c.occurrences?.some(occ =>
          occ.toLowerCase().includes(selectedChapter.title.toLowerCase()) ||
          selectedChapter.title.toLowerCase().includes(occ.toLowerCase())
        )
      );
      const conceptNames = chapterConcepts.map(c => c.name.toLowerCase());

      return projects.filter(p =>
        conceptNames.some(cn =>
          cn.includes(p.related_concept.toLowerCase()) ||
          p.related_concept.toLowerCase().includes(cn)
        )
      );
    }

    return [];
  }, [selectedChapter, selectedConcept, concepts, projects]);

  // Get related concepts
  const relatedConcepts = useMemo(() => {
    if (selectedChapter) {
      return concepts.filter(c =>
        c.occurrences?.some(occ =>
          occ.toLowerCase().includes(selectedChapter.title.toLowerCase()) ||
          selectedChapter.title.toLowerCase().includes(occ.toLowerCase())
        )
      ).slice(0, 10);
    }

    if (selectedConcept) {
      // Find concepts that appear in the same chapters
      const conceptOccurrences = selectedConcept.occurrences || [];
      return concepts.filter(c =>
        c.name !== selectedConcept.name &&
        c.occurrences?.some(occ =>
          conceptOccurrences.some(co =>
            occ.toLowerCase() === co.toLowerCase()
          )
        )
      ).slice(0, 10);
    }

    return [];
  }, [selectedChapter, selectedConcept, concepts]);

  // Handle AI question
  const handleAskAI = useCallback((question: string) => {
    setShowAIChat(true);
    // The question will be handled by opening the chat with context
  }, []);

  // Handle concept click from DepthPanel
  const handleConceptClick = useCallback((conceptName: string) => {
    const concept = concepts.find(c => c.name.toLowerCase() === conceptName.toLowerCase());
    if (concept) {
      const conceptId = `concept-${concept.name.toLowerCase().replace(/\s+/g, '-')}`;
      handleNodeSelect(conceptId, 'concept');
    }
  }, [concepts, handleNodeSelect]);

  // Current section for AI context
  const currentSection = selectedChapter?.title || selectedConcept?.name || '';

  return (
    <div className="flex pt-16 h-screen">
      {/* Left Panel - Learning Tree */}
      <aside className="fixed left-0 top-16 bottom-0 w-80 glass border-r border-black/10">
        <LearningTree
          chapters={chapters}
          concepts={concepts}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
        />
      </aside>

      {/* Main Content - Depth Panel */}
      <main className="flex-1 ml-80 h-[calc(100vh-4rem)] overflow-hidden">
        <div className="h-full bg-[var(--color-void-light)]">
          {selectionType === 'chapter' && selectedChapter ? (
            <DepthPanel
              type="chapter"
              bookId={bookId}
              chapter={selectedChapter}
              feynman={currentFeynman}
              quizzes={currentQuizzes}
              projects={currentProjects}
              relatedConcepts={relatedConcepts}
              onAskAI={handleAskAI}
              onConceptClick={handleConceptClick}
              onChapterProcessed={() => {
                router.refresh();
              }}
            />
          ) : selectionType === 'concept' && selectedConcept ? (
            <DepthPanel
              type="concept"
              bookId={bookId}
              concept={selectedConcept}
              feynman={currentFeynman}
              quizzes={currentQuizzes}
              projects={currentProjects}
              relatedConcepts={relatedConcepts}
              onAskAI={handleAskAI}
              onConceptClick={handleConceptClick}
            />
          ) : (
            // Welcome / Overview State
            <div className="h-full flex items-center justify-center p-8">
              <div className="max-w-lg text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] flex items-center justify-center text-4xl shadow-xl">
                  🌳
                </div>
                <h1 className="text-3xl font-bold text-[var(--color-snow)] mb-3">
                  {title}
                </h1>
                <p className="text-[var(--color-pearl)] mb-2">by {author}</p>

                {feynman && (
                  <div className="mt-6 p-4 rounded-xl bg-white border border-black/5 text-left shadow-sm">
                    <p className="text-sm text-[var(--color-cloud)] leading-relaxed">
                      {feynman.thesis}
                    </p>
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      if (chapters.length > 0) {
                        handleNodeSelect(chapters[0].id, 'chapter');
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    Start Exploring
                  </button>
                  <button
                    onClick={() => setShowAIChat(true)}
                    className="px-6 py-3 rounded-xl bg-white text-[var(--color-cloud)] font-medium hover:bg-[var(--color-slate)] transition-colors border border-black/10 shadow-sm"
                  >
                    Ask AI Assistant
                  </button>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-white border border-black/5 shadow-sm">
                    <div className="text-2xl font-bold text-[var(--color-electric-blue)]">
                      {chapters.length}
                    </div>
                    <div className="text-xs text-[var(--color-pearl)]">Chapters</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-black/5 shadow-sm">
                    <div className="text-2xl font-bold text-[var(--color-electric-cyan)]">
                      {concepts.length}
                    </div>
                    <div className="text-xs text-[var(--color-pearl)]">Concepts</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-black/5 shadow-sm">
                    <div className="text-2xl font-bold text-[var(--color-electric-emerald)]">
                      {quizzes.reduce((acc, q) => acc + q.questions.length, 0)}
                    </div>
                    <div className="text-xs text-[var(--color-pearl)]">Questions</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* AI Chat Toggle Button */}
      <button
        onClick={() => setShowAIChat(!showAIChat)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-all z-40 ${
          showAIChat
            ? 'bg-white text-[var(--color-snow)] border border-black/10'
            : 'bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] text-white'
        }`}
      >
        {showAIChat ? '✕' : '🤖'}
      </button>

      {/* AI Chat Panel */}
      {showAIChat && (
        <AIChat
          bookId={bookId}
          bookTitle={title}
          currentSection={currentSection}
          onClose={() => setShowAIChat(false)}
          onUIAction={handleUIAction}
        />
      )}

      {/* Highlighted Concept Indicator */}
      {highlightedConcept && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-[var(--color-electric-cyan)]/10 border border-[var(--color-electric-cyan)]/30 text-[var(--color-electric-cyan)] text-sm z-50 animate-pulse shadow-sm">
          Highlighting: {highlightedConcept.replace(/-/g, ' ')}
        </div>
      )}
    </div>
  );
}

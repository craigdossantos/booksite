"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChapterData, Concept, FeynmanChapterData, QuizQuestion, ProjectData, DepthLevel } from "@/types/book";

const DEPTH_LEVELS = [
  { id: 1 as DepthLevel, label: 'Summary', icon: '📋', description: '30 sec overview' },
  { id: 2 as DepthLevel, label: 'Key Points', icon: '🔑', description: '2-3 min read' },
  { id: 3 as DepthLevel, label: 'Deep Dive', icon: '🔬', description: '10-15 min read' },
  { id: 4 as DepthLevel, label: 'Application', icon: '🎯', description: 'Practice time' },
];

interface DepthPanelProps {
  type: 'chapter' | 'concept';
  bookId?: string;
  chapter?: ChapterData;
  concept?: Concept;
  feynman?: FeynmanChapterData;
  quizzes?: QuizQuestion[];
  projects?: ProjectData[];
  relatedConcepts?: Concept[];
  onAskAI?: (question: string) => void;
  onConceptClick?: (conceptName: string) => void;
  onChapterProcessed?: (chapter: ChapterData) => void;
  className?: string;
}

export default function DepthPanel({
  type,
  bookId,
  chapter,
  concept,
  feynman,
  quizzes = [],
  projects = [],
  relatedConcepts = [],
  onAskAI,
  onConceptClick,
  onChapterProcessed,
  className = "",
}: DepthPanelProps) {
  const [currentDepth, setCurrentDepth] = useState<DepthLevel>(1);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Check if chapter needs processing (no summary)
  const needsProcessing = type === 'chapter' && chapter && !chapter.summary;

  // Handle process chapter
  const handleProcessChapter = useCallback(async () => {
    if (!bookId || !chapter) return;

    setIsProcessing(true);
    setProcessingError(null);

    try {
      const response = await fetch('/api/process-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      if (data.chapter && onChapterProcessed) {
        onChapterProcessed(data.chapter);
      }
    } catch (error) {
      setProcessingError(error instanceof Error ? error.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [bookId, chapter, onChapterProcessed]);

  const title = type === 'chapter' ? chapter?.title : concept?.name;
  const subtitle = type === 'chapter'
    ? `${chapter?.stories?.length || 0} stories`
    : concept?.occurrences?.[0] || 'Key concept';

  // Build content for each depth level
  const depthContent = useMemo(() => {
    if (type === 'chapter' && chapter) {
      return {
        1: chapter.summary || 'No summary available.',
        2: chapter.stories?.map(s => `**${s.title}**: ${s.lesson}`).join('\n\n') || chapter.summary || '',
        3: chapter.summary + (chapter.stories?.length
          ? '\n\n**Stories & Examples:**\n' + chapter.stories.map(s => `• **${s.title}**: ${s.description}`).join('\n')
          : ''),
        4: projects.length > 0
          ? projects.map(p => `**${p.title}** (${p.duration})\n${p.goal}\n\nSteps:\n${p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`).join('\n\n---\n\n')
          : 'No projects available for this chapter. Try asking the AI for application ideas!',
      };
    }

    if (type === 'concept' && concept) {
      return {
        1: concept.definition,
        2: concept.mechanism
          ? `**Definition:** ${concept.definition}\n\n**How it works:** ${concept.mechanism}`
          : concept.definition,
        3: feynman
          ? `**Core Idea:**\n${feynman.thesis}\n\n**Analogy:**\n"${feynman.analogy}"\n\n**Simple Explanation:**\n${feynman.eli12}${feynman.why_it_matters ? `\n\n**Why It Matters:**\n${feynman.why_it_matters}` : ''}`
          : `**Definition:**\n${concept.definition}${concept.mechanism ? `\n\n**Mechanism:**\n${concept.mechanism}` : ''}${concept.context ? `\n\n**Context:**\n${concept.context}` : ''}`,
        4: projects.length > 0
          ? projects.map(p => `**${p.title}** (${p.duration})\n${p.goal}\n\nSteps:\n${p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`).join('\n\n---\n\n')
          : 'No projects found for this concept. Ask the AI for practical applications!',
      };
    }

    return { 1: '', 2: '', 3: '', 4: '' };
  }, [type, chapter, concept, feynman, projects]);

  const handleQuizAnswer = useCallback((answer: string) => {
    setSelectedAnswer(answer);
    setShowExplanation(true);
  }, []);

  const handleNextQuestion = useCallback(() => {
    if (quizIndex < quizzes.length - 1) {
      setQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setShowQuiz(false);
      setQuizIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  }, [quizIndex, quizzes.length]);

  // Render markdown-like content
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('**') && line.endsWith(':**')) {
        return (
          <h4 key={i} className="text-sm font-semibold text-[var(--color-electric-cyan)] mt-4 mb-2 first:mt-0">
            {line.replace(/\*\*/g, '').replace(/:$/, '')}
          </h4>
        );
      }
      // Bold text
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-snow)]">$1</strong>');
      // Numbered lists
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          return (
            <div key={i} className="flex items-start gap-3 my-2">
              <span className="w-6 h-6 rounded-full bg-[var(--color-electric-blue)]/20 text-[var(--color-electric-blue)] text-xs flex items-center justify-center flex-shrink-0">
                {match[1]}
              </span>
              <span className="text-[var(--color-cloud)]" dangerouslySetInnerHTML={{ __html: match[2] }} />
            </div>
          );
        }
      }
      // Bullet points
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={i} className="flex items-start gap-2 my-1 ml-1">
            <span className="text-[var(--color-electric-cyan)]">•</span>
            <span className="text-[var(--color-cloud)]" dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
          </div>
        );
      }
      // Horizontal rules
      if (line === '---') {
        return <hr key={i} className="my-4 border-white/10" />;
      }
      // Quoted text
      if (line.startsWith('"') && line.endsWith('"')) {
        return (
          <p key={i} className="my-2 italic text-[var(--color-pearl)] border-l-2 border-[var(--color-electric-purple)] pl-4">
            {line}
          </p>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      // Regular paragraphs
      return (
        <p key={i} className="my-1 text-[var(--color-cloud)]" dangerouslySetInnerHTML={{ __html: line }} />
      );
    });
  };

  if (!title) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-50">📚</div>
          <p className="text-[var(--color-silver)]">Select a chapter or concept to explore</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-black/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className={`badge ${type === 'chapter' ? 'badge-blue' : 'badge-cyan'}`}>
                {type === 'chapter' ? '📖 Chapter' : '💡 Concept'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-snow)]">{title}</h1>
            <p className="text-sm text-[var(--color-silver)] mt-1">{subtitle}</p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {quizzes.length > 0 && (
              <button
                onClick={() => setShowQuiz(true)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-electric-emerald)]/20 text-[var(--color-electric-emerald)] hover:bg-[var(--color-electric-emerald)]/30 transition-colors"
              >
                📝 Quiz ({quizzes.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Depth Selector */}
      <div className="px-6 py-4 border-b border-black/5 bg-[var(--color-slate)]/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--color-steel)]">Depth Level</span>
          <span className="text-xs text-[var(--color-steel)]">
            {DEPTH_LEVELS.find(d => d.id === currentDepth)?.description}
          </span>
        </div>
        <div className="flex gap-2">
          {DEPTH_LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => setCurrentDepth(level.id)}
              className={`
                flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all
                ${currentDepth === level.id
                  ? 'bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] text-white shadow-lg'
                  : 'bg-white text-[var(--color-cloud)] hover:bg-[var(--color-slate)] border border-black/10'}
              `}
            >
              <span className="text-base mr-1.5">{level.icon}</span>
              <span className="hidden sm:inline">{level.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {needsProcessing ? (
            <motion.div
              key="needs-processing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-[var(--color-electric-amber)]/10 flex items-center justify-center text-4xl mb-6">
                📄
              </div>
              <h3 className="text-xl font-semibold text-[var(--color-snow)] mb-2">
                Chapter Not Processed Yet
              </h3>
              <p className="text-[var(--color-pearl)] mb-6 max-w-sm">
                This chapter hasn&apos;t been analyzed yet. Click below to process it with AI and generate summaries, key points, and stories.
              </p>

              {processingError && (
                <div className="mb-4 p-3 rounded-lg bg-[var(--color-electric-rose)]/10 border border-[var(--color-electric-rose)]/20 text-[var(--color-electric-rose)] text-sm max-w-sm">
                  {processingError}
                </div>
              )}

              <button
                onClick={handleProcessChapter}
                disabled={isProcessing || !bookId}
                className={`
                  px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2
                  ${isProcessing
                    ? 'bg-[var(--color-slate)] text-[var(--color-pearl)] cursor-wait'
                    : 'bg-gradient-to-r from-[var(--color-electric-amber)] to-[var(--color-electric-rose)] text-white hover:opacity-90 shadow-lg'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing with AI...
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    Process Chapter
                  </>
                )}
              </button>

              {!bookId && (
                <p className="mt-4 text-xs text-[var(--color-steel)]">
                  Book ID not available for processing
                </p>
              )}
            </motion.div>
          ) : showQuiz && quizzes.length > 0 ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <QuizCard
                question={quizzes[quizIndex]}
                questionNumber={quizIndex + 1}
                totalQuestions={quizzes.length}
                selectedAnswer={selectedAnswer}
                showExplanation={showExplanation}
                onSelectAnswer={handleQuizAnswer}
                onNext={handleNextQuestion}
                onClose={() => {
                  setShowQuiz(false);
                  setQuizIndex(0);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`depth-${currentDepth}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="prose-dark max-w-none"
            >
              {renderContent(depthContent[currentDepth])}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Related Concepts */}
      {relatedConcepts.length > 0 && !showQuiz && (
        <div className="px-6 py-4 border-t border-black/5">
          <h3 className="text-xs font-semibold text-[var(--color-pearl)] uppercase tracking-wider mb-3">
            Related Concepts
          </h3>
          <div className="flex flex-wrap gap-2">
            {relatedConcepts.slice(0, 6).map((c, idx) => (
              <button
                key={idx}
                onClick={() => onConceptClick?.(c.name)}
                className="px-3 py-1.5 text-xs rounded-full bg-white text-[var(--color-cloud)] hover:bg-[var(--color-electric-purple)]/10 hover:text-[var(--color-electric-purple)] transition-colors border border-black/10"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Actions */}
      <div className="px-6 py-4 border-t border-black/5 bg-[var(--color-slate)]/30">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onAskAI?.(`Explain "${title}" in simpler terms`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white text-[var(--color-cloud)] hover:bg-[var(--color-slate)] transition-colors border border-black/10 shadow-sm"
          >
            <span>🤔</span> Explain Simpler
          </button>
          <button
            onClick={() => onAskAI?.(`What are real-world applications of "${title}"?`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white text-[var(--color-cloud)] hover:bg-[var(--color-slate)] transition-colors border border-black/10 shadow-sm"
          >
            <span>🌍</span> Real Examples
          </button>
          <button
            onClick={() => onAskAI?.(`What's the connection between "${title}" and the book's main thesis?`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white text-[var(--color-cloud)] hover:bg-[var(--color-slate)] transition-colors border border-black/10 shadow-sm"
          >
            <span>🔗</span> Connect Ideas
          </button>
        </div>
      </div>
    </div>
  );
}

interface QuizCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  showExplanation: boolean;
  onSelectAnswer: (answer: string) => void;
  onNext: () => void;
  onClose: () => void;
}

function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  showExplanation,
  onSelectAnswer,
  onNext,
  onClose,
}: QuizCardProps) {
  const isCorrect = selectedAnswer === question.correct_answer;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[var(--color-steel)]">
          Question {questionNumber} of {totalQuestions}
        </span>
        <button
          onClick={onClose}
          className="text-xs text-[var(--color-steel)] hover:text-[var(--color-snow)]"
        >
          Exit Quiz
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 rounded-full bg-[var(--color-slate)] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] transition-all"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="py-4">
        <p className="text-lg text-[var(--color-snow)] font-medium">{question.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const isCorrectAnswer = option === question.correct_answer;

          let bgClass = 'bg-white border-black/10 hover:border-black/20';
          if (showExplanation) {
            if (isCorrectAnswer) {
              bgClass = 'bg-[var(--color-electric-emerald)]/20 border-[var(--color-electric-emerald)]/50';
            } else if (isSelected && !isCorrect) {
              bgClass = 'bg-[var(--color-electric-rose)]/20 border-[var(--color-electric-rose)]/50';
            }
          } else if (isSelected) {
            bgClass = 'bg-[var(--color-electric-blue)]/20 border-[var(--color-electric-blue)]/50';
          }

          return (
            <button
              key={idx}
              onClick={() => !showExplanation && onSelectAnswer(option)}
              disabled={showExplanation}
              className={`w-full p-4 rounded-xl text-left text-sm transition-all border ${bgClass}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  showExplanation && isCorrectAnswer
                    ? 'bg-[var(--color-electric-emerald)] text-white'
                    : showExplanation && isSelected && !isCorrect
                    ? 'bg-[var(--color-electric-rose)] text-white'
                    : isSelected
                    ? 'bg-[var(--color-electric-blue)] text-white'
                    : 'bg-[var(--color-slate)] text-[var(--color-pearl)]'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-[var(--color-cloud)]">{option}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`p-4 rounded-xl ${
              isCorrect
                ? 'bg-[var(--color-electric-emerald)]/10 border border-[var(--color-electric-emerald)]/20'
                : 'bg-[var(--color-electric-amber)]/10 border border-[var(--color-electric-amber)]/20'
            }`}>
              <p className={`text-sm font-medium mb-2 ${
                isCorrect ? 'text-[var(--color-electric-emerald)]' : 'text-[var(--color-electric-amber)]'
              }`}>
                {isCorrect ? '✓ Correct!' : '✗ Not quite right'}
              </p>
              <p className="text-sm text-[var(--color-cloud)]">{question.explanation}</p>
            </div>

            <button
              onClick={onNext}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              {questionNumber < totalQuestions ? 'Next Question' : 'Finish Quiz'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import QuizMode from "./QuizMode";
import AIChat from "./AIChat";
import ImageGallery from "./ImageGallery";

interface ChapterData {
  id: string;
  title: string;
  summary: string;
  stories?: { title: string; description: string; lesson: string }[];
}

interface QuizQuestion {
  question: string;
  type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface QuizChapter {
  source_chapter: string;
  questions: QuizQuestion[];
}

interface Concept {
  name: string;
  definition: string;
  mechanism?: string;
}

interface FeynmanData {
  thesis: string;
  analogy: string;
  eli12: string;
  why_it_matters?: string;
}

interface FeynmanChapterData extends FeynmanData {
  source_chapter: string;
}

interface SchemaData {
  title: string;
  type: string;
  mermaid_code: string;
  description: string;
  source_chapter: string;
}

interface ProjectData {
  title: string;
  goal: string;
  steps: string[];
  duration: string;
  success_criteria: string;
  related_concept: string;
}

interface LearningInterfaceProps {
  bookId: string;
  mode: string;
  title: string;
  author: string;
  chapters: ChapterData[];
  selectedChapter: ChapterData | null;
  quizzes: QuizQuestion[];
  allQuizzes: QuizChapter[];
  concepts: Concept[];
  feynman?: FeynmanData;
  feynmanChapters?: FeynmanChapterData[];
  schemas?: SchemaData[];
  projects?: ProjectData[];
  priming?: unknown;
  inquiry?: unknown;
}

export default function LearningInterface({
  bookId,
  mode,
  title,
  author,
  chapters,
  selectedChapter,
  quizzes,
  allQuizzes,
  concepts,
  feynman,
  feynmanChapters,
  schemas,
  projects,
}: LearningInterfaceProps) {
  const [showAIChat, setShowAIChat] = useState(false);

  // Overview Mode
  if (mode === "overview") {
    return (
      <div className="p-8 max-w-4xl">
        {/* Book Header */}
        {!selectedChapter && (
          <div className="mb-12 reveal-up">
            <div className="inline-flex items-center gap-2 badge badge-purple mb-4">
              <span className="w-2 h-2 rounded-full bg-[var(--color-electric-purple)] animate-pulse" />
              Book Overview
            </div>
            <h1 className="text-4xl font-black text-[var(--color-snow)] mb-3">{title}</h1>
            <p className="text-xl text-[var(--color-pearl)]">by {author}</p>

            {/* Feynman summary if available */}
            {feynman && (
              <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-[var(--color-electric-blue)]/10 to-[var(--color-electric-purple)]/10 border border-black/5">
                <h3 className="text-lg font-bold text-[var(--color-snow)] mb-3 flex items-center gap-2">
                  <span className="text-2xl">🧠</span> Core Thesis
                </h3>
                <p className="text-[var(--color-cloud)] leading-relaxed">{feynman.thesis}</p>

                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white">
                    <h4 className="text-sm font-semibold text-[var(--color-electric-cyan)] mb-2">
                      Simple Analogy
                    </h4>
                    <p className="text-sm text-[var(--color-pearl)] italic">"{feynman.analogy}"</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white">
                    <h4 className="text-sm font-semibold text-[var(--color-electric-emerald)] mb-2">
                      Explain Like I'm 12
                    </h4>
                    <p className="text-sm text-[var(--color-pearl)]">{feynman.eli12}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="mt-8 flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">{chapters.length}</div>
                <div className="text-xs text-[var(--color-silver)]">Chapters</div>
              </div>
              <div className="w-px h-12 bg-black/5" />
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--color-electric-cyan)]">{concepts.length}</div>
                <div className="text-xs text-[var(--color-silver)]">Key Concepts</div>
              </div>
              <div className="w-px h-12 bg-black/5" />
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--color-electric-emerald)]">
                  {allQuizzes.reduce((acc, q) => acc + q.questions.length, 0)}
                </div>
                <div className="text-xs text-[var(--color-silver)]">Quiz Questions</div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Chapter View */}
        {selectedChapter && (
          <div className="reveal-up">
            <div className="inline-flex items-center gap-2 badge badge-blue mb-4">
              Chapter
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-snow)] mb-6">{selectedChapter.title}</h2>

            {/* Summary */}
            <div className="prose-dark max-w-none mb-8">
              <p className="text-lg text-[var(--color-cloud)] leading-relaxed">{selectedChapter.summary}</p>
            </div>

            {/* Stories */}
            {selectedChapter.stories && selectedChapter.stories.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--color-silver)] uppercase tracking-wider">
                  Key Stories & Examples
                </h3>
                <div className="grid gap-4">
                  {selectedChapter.stories.map((story, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl bg-white border border-black/5 shadow-sm card-hover"
                    >
                      <h4 className="font-semibold text-[var(--color-snow)] mb-2">{story.title}</h4>
                      <p className="text-sm text-[var(--color-pearl)] mb-3">{story.description}</p>
                      <div className="flex items-start gap-2 pt-3 border-t border-black/5">
                        <span className="text-[var(--color-electric-emerald)]">→</span>
                        <p className="text-sm font-medium text-[var(--color-electric-emerald)]">
                          {story.lesson}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Chapters Grid */}
        {!selectedChapter && (
          <div className="mt-12">
            <h3 className="text-lg font-bold text-[var(--color-snow)] mb-6">All Chapters</h3>
            <div className="grid gap-4">
              {chapters.map((chapter, idx) => (
                <a
                  key={chapter.id}
                  href={`/book/${bookId}?mode=overview&chapter=${chapter.id}`}
                  className="group p-5 rounded-xl bg-white border border-black/5 shadow-sm card-hover"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl font-bold text-[var(--color-steel)] group-hover:text-[var(--color-electric-blue)] transition-colors">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[var(--color-snow)] group-hover:text-[var(--color-electric-blue)] transition-colors mb-2">
                        {chapter.title}
                      </h4>
                      <p className="text-sm text-[var(--color-pearl)] line-clamp-2">{chapter.summary}</p>
                    </div>
                    <svg
                      className="w-5 h-5 text-[var(--color-steel)] group-hover:text-[var(--color-electric-blue)] transition-colors flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* AI Chat Toggle */}
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-transform z-40"
        >
          {showAIChat ? "✕" : "🤖"}
        </button>

        {/* AI Chat Panel */}
        {showAIChat && (
          <AIChat
            bookId={bookId}
            bookTitle={title}
            currentSection={selectedChapter?.summary || feynman?.thesis || ""}
            onClose={() => setShowAIChat(false)}
          />
        )}
      </div>
    );
  }

  // Quiz Mode
  if (mode === "quiz") {
    const allQuestions = allQuizzes.flatMap((q) =>
      q.questions.map((question) => ({ ...question, chapter: q.source_chapter }))
    );

    return (
      <div className="p-8">
        <QuizMode
          bookId={bookId}
          questions={selectedChapter ? quizzes : allQuestions}
          chapterTitle={selectedChapter?.title}
        />

        {/* AI Chat Toggle */}
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-transform z-40"
        >
          {showAIChat ? "✕" : "🤖"}
        </button>

        {showAIChat && (
          <AIChat
            bookId={bookId}
            bookTitle={title}
            currentSection={selectedChapter?.summary || ""}
            onClose={() => setShowAIChat(false)}
          />
        )}
      </div>
    );
  }

  // Concepts Mode
  if (mode === "concepts") {
    return (
      <div className="p-8 max-w-4xl">
        <div className="mb-8 reveal-up">
          <div className="inline-flex items-center gap-2 badge badge-blue mb-4">
            <span className="text-lg">💡</span> Key Concepts
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-snow)]">
            {selectedChapter ? selectedChapter.title : "Master Concepts"}
          </h2>
          <p className="text-[var(--color-pearl)] mt-2">
            {concepts.length} concepts to master
          </p>
        </div>

        <div className="grid gap-4">
          {concepts.map((concept, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-white border border-black/5 shadow-sm card-hover"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-bold text-lg text-[var(--color-snow)]">{concept.name}</h3>
                <span className="badge badge-purple">Concept</span>
              </div>
              <p className="text-[var(--color-cloud)] leading-relaxed mb-4">{concept.definition}</p>
              {concept.mechanism && (
                <div className="pt-4 border-t border-black/5">
                  <h4 className="text-xs font-semibold text-[var(--color-electric-cyan)] uppercase tracking-wider mb-2">
                    How It Works
                  </h4>
                  <p className="text-sm text-[var(--color-pearl)]">{concept.mechanism}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {concepts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-50">💡</div>
            <p className="text-[var(--color-silver)]">No concepts available for this selection.</p>
          </div>
        )}

        {/* AI Chat */}
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-transform z-40"
        >
          {showAIChat ? "✕" : "🤖"}
        </button>

        {showAIChat && (
          <AIChat
            bookId={bookId}
            bookTitle={title}
            currentSection={concepts.map((c) => `${c.name}: ${c.definition}`).join("\n")}
            onClose={() => setShowAIChat(false)}
          />
        )}
      </div>
    );
  }

  // Feynman Mode
  if (mode === "feynman") {
    // Filter chapter-level Feynman data if a chapter is selected
    const chapterFeynman = selectedChapter && feynmanChapters
      ? feynmanChapters.find((f) => {
          const normSource = f.source_chapter.toLowerCase().replace(/_/g, " ").replace(/\.html$/, "");
          const normChapter = selectedChapter.id.toLowerCase().replace(/_/g, " ").replace(/\.md$/, "");
          return normSource.includes(normChapter) || normChapter.includes(normSource);
        })
      : null;

    // Use chapter-specific Feynman if available, otherwise book-level
    const displayFeynman = selectedChapter ? chapterFeynman : feynman;
    const displayFeynmanList = !selectedChapter && feynmanChapters ? feynmanChapters : [];

    return (
      <div className="p-8 max-w-4xl">
        <div className="mb-8 reveal-up">
          <div className="inline-flex items-center gap-2 badge badge-amber mb-4">
            <span className="text-lg">🧠</span> Feynman Technique
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-snow)]">
            {selectedChapter ? selectedChapter.title : "Deep Understanding"}
          </h2>
          <p className="text-[var(--color-pearl)] mt-2">
            {selectedChapter
              ? "Chapter-level explanation in simple terms"
              : `Explain complex ideas in simple terms${displayFeynmanList.length > 0 ? ` • ${displayFeynmanList.length} chapter explanations` : ""}`}
          </p>
        </div>

        {/* Single Feynman display (book-level or selected chapter) */}
        {displayFeynman ? (
          <div className="space-y-6">
            {/* Core Thesis */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-[var(--color-electric-amber)]/10 to-[var(--color-electric-rose)]/10 border border-[var(--color-electric-amber)]/20">
              <h3 className="text-xl font-bold text-[var(--color-snow)] mb-4 flex items-center gap-3">
                <span className="text-2xl">🎯</span> Core Thesis
              </h3>
              <p className="text-lg text-[var(--color-cloud)] leading-relaxed">{displayFeynman.thesis}</p>
            </div>

            {/* Analogy */}
            <div className="p-6 rounded-xl bg-white border border-black/5 shadow-sm">
              <h3 className="text-lg font-bold text-[var(--color-electric-cyan)] mb-3 flex items-center gap-2">
                <span className="text-xl">💡</span> Think of it Like...
              </h3>
              <p className="text-xl text-[var(--color-cloud)] italic leading-relaxed">"{displayFeynman.analogy}"</p>
            </div>

            {/* ELI12 */}
            <div className="p-6 rounded-xl bg-white border border-black/5 shadow-sm">
              <h3 className="text-lg font-bold text-[var(--color-electric-emerald)] mb-3 flex items-center gap-2">
                <span className="text-xl">👶</span> Explain Like I'm 12
              </h3>
              <p className="text-[var(--color-cloud)] leading-relaxed">{displayFeynman.eli12}</p>
            </div>

            {/* Why It Matters */}
            {displayFeynman.why_it_matters && (
              <div className="p-6 rounded-xl bg-white border border-black/5 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--color-electric-purple)] mb-3 flex items-center gap-2">
                  <span className="text-xl">⭐</span> Why It Matters
                </h3>
                <p className="text-[var(--color-cloud)] leading-relaxed">{displayFeynman.why_it_matters}</p>
              </div>
            )}
          </div>
        ) : !selectedChapter && displayFeynmanList.length > 0 ? (
          /* Show all chapter Feynman explanations when no chapter is selected */
          <div className="space-y-6">
            {displayFeynmanList.map((f, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-white border border-black/5 shadow-sm card-hover">
                <div className="flex items-center justify-between mb-4">
                  <span className="badge badge-amber">Chapter {idx + 1}</span>
                  <span className="text-xs text-[var(--color-steel)]">{f.source_chapter}</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-snow)] mb-3">{f.thesis}</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--color-electric-cyan)] uppercase mb-1">Analogy</h4>
                    <p className="text-sm text-[var(--color-pearl)] italic">"{f.analogy}"</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--color-electric-emerald)] uppercase mb-1">Simple Explanation</h4>
                    <p className="text-sm text-[var(--color-pearl)]">{f.eli12}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-50">🧠</div>
            <p className="text-[var(--color-silver)]">
              {selectedChapter
                ? "No Feynman explanation available for this chapter."
                : "Feynman explanation not available."}
            </p>
          </div>
        )}

        {/* AI Chat */}
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-transform z-40"
        >
          {showAIChat ? "✕" : "🤖"}
        </button>

        {showAIChat && (
          <AIChat
            bookId={bookId}
            bookTitle={title}
            currentSection={displayFeynman?.thesis || ""}
            onClose={() => setShowAIChat(false)}
          />
        )}
      </div>
    );
  }

  // Schemas / Mental Models Mode
  if (mode === "schemas") {
    // Filter schemas by chapter if selected
    const schemaList = schemas || [];
    const filteredSchemas = selectedChapter
      ? schemaList.filter((s) => {
          const normSource = s.source_chapter.toLowerCase().replace(/_/g, " ").replace(/\.html$/, "");
          const normChapter = selectedChapter.id.toLowerCase().replace(/_/g, " ").replace(/\.md$/, "");
          return normSource.includes(normChapter) || normChapter.includes(normSource);
        })
      : schemaList;

    return (
      <div className="p-8 max-w-4xl">
        <div className="mb-8 reveal-up">
          <div className="inline-flex items-center gap-2 badge badge-purple mb-4">
            <span className="text-lg">🗺️</span> Mental Models
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-snow)]">
            {selectedChapter ? selectedChapter.title : "Frameworks & Schemas"}
          </h2>
          <p className="text-[var(--color-pearl)] mt-2">
            {selectedChapter
              ? `${filteredSchemas.length} mental model${filteredSchemas.length !== 1 ? "s" : ""} in this chapter`
              : `${schemaList.length} thinking tools from this book`}
          </p>
        </div>

        <div className="grid gap-4">
          {filteredSchemas.map((schema, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-white border border-black/5 shadow-sm card-hover"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg text-[var(--color-snow)]">{schema.title}</h3>
                <span className="badge badge-blue">{schema.type}</span>
              </div>
              <p className="text-[var(--color-cloud)] mb-4">{schema.description}</p>
              {schema.mermaid_code && (
                <div className="pt-4 border-t border-black/5">
                  <h4 className="text-xs font-semibold text-[var(--color-electric-cyan)] uppercase tracking-wider mb-2">
                    Diagram Code
                  </h4>
                  <pre className="text-xs text-[var(--color-pearl)] bg-[var(--color-graphite)] p-3 rounded-lg overflow-x-auto">
                    {schema.mermaid_code}
                  </pre>
                </div>
              )}
              {!selectedChapter && (
                <div className="mt-3 text-xs text-[var(--color-steel)]">
                  Source: {schema.source_chapter}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSchemas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-50">🗺️</div>
            <p className="text-[var(--color-silver)]">
              {selectedChapter
                ? "No mental models available for this chapter."
                : "No mental models available."}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Projects Mode
  if (mode === "projects") {
    const projectList = projects || [];

    // Filter projects by concepts that appear in the selected chapter
    const chapterConceptNames = concepts.map(c => c.name.toLowerCase());
    const filteredProjects = selectedChapter
      ? projectList.filter((p) =>
          chapterConceptNames.some(conceptName =>
            conceptName.includes(p.related_concept.toLowerCase()) ||
            p.related_concept.toLowerCase().includes(conceptName)
          )
        )
      : projectList;

    return (
      <div className="p-8 max-w-4xl">
        <div className="mb-8 reveal-up">
          <div className="inline-flex items-center gap-2 badge badge-emerald mb-4">
            <span className="text-lg">🛠️</span> Projects
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-snow)]">
            {selectedChapter ? selectedChapter.title : "Apply What You Learn"}
          </h2>
          <p className="text-[var(--color-pearl)] mt-2">
            {selectedChapter
              ? `${filteredProjects.length} project${filteredProjects.length !== 1 ? "s" : ""} related to this chapter's concepts`
              : `${projectList.length} practical exercises to cement your understanding`}
          </p>
        </div>

        <div className="grid gap-6">
          {filteredProjects.map((project, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-white border border-black/5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg text-[var(--color-snow)]">{project.title}</h3>
                <span className="badge badge-purple">{project.duration}</span>
              </div>
              <p className="text-[var(--color-cloud)] mb-4">{project.goal}</p>

              <div className="pt-4 border-t border-black/5">
                <h4 className="text-xs font-semibold text-[var(--color-electric-cyan)] uppercase tracking-wider mb-3">
                  Steps
                </h4>
                <div className="space-y-2">
                  {project.steps.map((step, stepIdx) => (
                    <div key={stepIdx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-electric-cyan)]/20 text-[var(--color-electric-cyan)] text-xs flex items-center justify-center font-semibold">
                        {stepIdx + 1}
                      </span>
                      <p className="text-sm text-[var(--color-pearl)]">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-black/5">
                <h4 className="text-xs font-semibold text-[var(--color-electric-emerald)] uppercase tracking-wider mb-2">
                  Success Criteria
                </h4>
                <p className="text-sm text-[var(--color-pearl)]">{project.success_criteria}</p>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-[var(--color-steel)]">Related concept:</span>
                <span className="badge badge-blue text-xs">{project.related_concept}</span>
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-50">🛠️</div>
            <p className="text-[var(--color-silver)]">
              {selectedChapter
                ? "No projects available for concepts in this chapter."
                : "No projects available."}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Images Mode
  if (mode === "images") {
    return <ImageGallery bookId={bookId} />;
  }

  // Default fallback
  return (
    <div className="p-8 max-w-4xl">
      <div className="text-center py-12">
        <div className="text-6xl mb-4 opacity-50">📚</div>
        <p className="text-[var(--color-silver)]">Select a learning mode to get started.</p>
      </div>
    </div>
  );
}

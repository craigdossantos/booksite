"use client";

import { useMemo } from "react";
import AccordionSection from "./AccordionSection";
import AIAccordionItem from "./AIAccordionItem";
import { useAccordionState } from "@/contexts/AccordionStateContext";
import type {
  ChapterData,
  Concept,
  FeynmanChapterData,
  ProjectData,
} from "@/types/book";

interface AccordionPanelProps {
  type: "chapter" | "concept";
  bookId?: string;
  chapter?: ChapterData;
  concept?: Concept;
  feynman?: FeynmanChapterData;
  projects?: ProjectData[];
  relatedConcepts?: Concept[];
  onConceptClick?: (conceptName: string) => void;
  className?: string;
}

export default function AccordionPanel({
  type,
  bookId,
  chapter,
  concept,
  feynman,
  projects = [],
  relatedConcepts = [],
  onConceptClick,
  className = "",
}: AccordionPanelProps) {
  const { expandedItems, toggleItem, aiContent, deleteAIContent } =
    useAccordionState();

  // Build content structure
  const content = useMemo(() => {
    if (type === "chapter" && chapter) {
      return {
        summary: chapter.summary || "No summary available.",
        stories: chapter.stories || [],
      };
    } else if (type === "concept" && concept) {
      return {
        definition: concept.definition,
        mechanism: concept.mechanism,
        feynmanData: feynman,
      };
    }
    return null;
  }, [type, chapter, concept, feynman]);

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No content available
      </div>
    );
  }

  // Get AI content for a specific parent section
  const getAIContentForSection = (parentId: string) => {
    return aiContent.filter(
      (item) => item.parentId === parentId && !item.isDeleted,
    );
  };

  return (
    <div className={`flex-1 overflow-y-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {type === "chapter" ? chapter?.title : concept?.name}
        </h1>
        <p className="text-gray-400">
          {type === "chapter"
            ? `${chapter?.stories?.length || 0} stories`
            : concept?.occurrences?.[0] || "Key concept"}
        </p>
      </div>

      {/* Level 1: Summary (Always Visible) */}
      <AccordionSection
        id="summary"
        depth={1}
        title={type === "chapter" ? "Summary" : "Definition"}
        icon="📋"
        isExpanded={true}
        onToggle={() => {}}
        alwaysExpanded={true}
      >
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 leading-relaxed">
            {type === "chapter" ? content.summary : content.definition}
          </p>
        </div>
      </AccordionSection>

      {/* Level 2: Chapter Stories or Concept Details */}
      {type === "chapter" && content.stories && content.stories.length > 0 ? (
        <>
          {content.stories.map((story, index) => {
            const storyId = `story-${index}`;
            const isStoryExpanded = expandedItems.has(storyId);

            return (
              <div key={storyId}>
                <AccordionSection
                  id={storyId}
                  depth={2}
                  title={story.title}
                  icon="🔑"
                  isExpanded={isStoryExpanded}
                  onToggle={() => toggleItem(storyId)}
                >
                  {/* Level 3: Story Details */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                        Description
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {story.description}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                        Key Lesson
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {story.lesson}
                      </p>
                    </div>

                    {/* Level 4-5: AI Content for this story */}
                    {getAIContentForSection(storyId).map((aiItem) => (
                      <AIAccordionItem
                        key={aiItem.id}
                        item={aiItem}
                        onDelete={deleteAIContent}
                      />
                    ))}
                  </div>
                </AccordionSection>
              </div>
            );
          })}
        </>
      ) : type === "concept" ? (
        <>
          {/* How It Works */}
          {content.mechanism && (
            <AccordionSection
              id="mechanism"
              depth={2}
              title="How It Works"
              icon="⚙️"
              isExpanded={expandedItems.has("mechanism")}
              onToggle={() => toggleItem("mechanism")}
            >
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                    Mechanism
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {content.mechanism}
                  </p>
                </div>

                {/* Feynman Explanation */}
                {content.feynmanData && (
                  <div className="bg-purple-900/20 border-l-2 border-purple-500 rounded p-4">
                    <h4 className="text-sm font-semibold text-purple-400 mb-2">
                      Explain Like I'm 12
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed mb-3">
                      {content.feynmanData.eli12}
                    </p>
                    {content.feynmanData.analogy && (
                      <>
                        <h4 className="text-sm font-semibold text-purple-400 mb-2">
                          Analogy
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {content.feynmanData.analogy}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* AI Content for mechanism section */}
                {getAIContentForSection("mechanism").map((aiItem) => (
                  <AIAccordionItem
                    key={aiItem.id}
                    item={aiItem}
                    onDelete={deleteAIContent}
                  />
                ))}
              </div>
            </AccordionSection>
          )}

          {/* Related Projects */}
          {projects.length > 0 && (
            <AccordionSection
              id="projects"
              depth={2}
              title="Related Projects"
              icon="🎯"
              isExpanded={expandedItems.has("projects")}
              onToggle={() => toggleItem("projects")}
            >
              <div className="space-y-4">
                {projects.map((project, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                  >
                    <h4 className="font-semibold text-white mb-2">
                      {project.title}
                    </h4>
                    <p className="text-gray-400 text-sm mb-3">{project.goal}</p>
                    <div className="text-xs text-gray-500">
                      Duration: {project.duration}
                    </div>
                  </div>
                ))}

                {/* AI Content for projects section */}
                {getAIContentForSection("projects").map((aiItem) => (
                  <AIAccordionItem
                    key={aiItem.id}
                    item={aiItem}
                    onDelete={deleteAIContent}
                  />
                ))}
              </div>
            </AccordionSection>
          )}
        </>
      ) : null}

      {/* Related Concepts */}
      {relatedConcepts.length > 0 && (
        <AccordionSection
          id="related-concepts"
          depth={2}
          title="Related Concepts"
          icon="🔗"
          isExpanded={expandedItems.has("related-concepts")}
          onToggle={() => toggleItem("related-concepts")}
        >
          <div className="flex flex-wrap gap-2">
            {relatedConcepts.map((relatedConcept, index) => (
              <button
                key={index}
                onClick={() => onConceptClick?.(relatedConcept.name)}
                className="px-4 py-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                {relatedConcept.name}
              </button>
            ))}
          </div>

          {/* AI Content for related concepts section */}
          {getAIContentForSection("related-concepts").map((aiItem) => (
            <AIAccordionItem
              key={aiItem.id}
              item={aiItem}
              onDelete={deleteAIContent}
            />
          ))}
        </AccordionSection>
      )}
    </div>
  );
}

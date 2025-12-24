// Core Book Data Types
// Unified data model for the learning platform

export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  originalFilename?: string;
  coverUrl?: string;
}

export interface BookData {
  metadata: BookMetadata;
  chapters: ChapterData[];
  concepts: Concept[];
  quizzes: QuizChapter[];
  feynmanBook?: FeynmanData;
  feynmanChapters: FeynmanChapterData[];
  schemas: SchemaData[];
  projects: ProjectData[];
  stories?: StoryCollection[];
  priming?: PrimingData[];
  inquiry?: InquiryData[];
  flightPlan?: FlightPlanData;
  audioScripts?: AudioScriptData[];
  videoScripts?: VideoScriptData[];
  relationships?: ConceptRelationship[];
  learningTree?: LearningTreeNode;
}

// Chapter Data
export interface ChapterData {
  id: string;
  title: string;
  summary: string;
  content?: string;
  stories?: Story[] | { title: string; description: string; lesson: string }[];
}

export interface Story {
  title: string;
  description: string;
  lesson: string;
}

export interface StoryCollection {
  source_chapter: string;
  stories: Story[];
}

// Concepts
export interface Concept {
  name: string;
  definition: string;
  mechanism?: string;
  context?: string;
  occurrences?: string[];
}

export interface ConceptRelationship {
  fromId: string;
  toId: string;
  type: "requires" | "extends" | "contrasts" | "applies-to" | "related";
  strength: number; // 0-1
  explanation?: string;
}

// Quiz Data
export interface QuizQuestion {
  question: string;
  type: "multiple_choice" | "true_false" | "scenario";
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface QuizChapter {
  source_chapter: string;
  questions: QuizQuestion[];
}

// Feynman Technique Data
export interface FeynmanData {
  thesis: string;
  analogy: string;
  eli12: string;
  why_it_matters?: string;
}

export interface FeynmanChapterData extends FeynmanData {
  source_chapter: string;
}

// Mental Models / Schemas
export interface SchemaData {
  title: string;
  type: "mindmap" | "flowchart" | "table" | "diagram";
  mermaid_code: string;
  description: string;
  source_chapter: string;
}

// Projects
export interface ProjectData {
  title: string;
  goal: string;
  steps: string[];
  duration: string;
  success_criteria: string;
  related_concept: string;
}

// Audio/Video Scripts
export interface AudioScriptData {
  source_chapter: string;
  title: string;
  script: string;
  duration_estimate?: string;
}

export interface VideoScriptData {
  source_chapter: string;
  title: string;
  sections: VideoSection[];
  total_duration?: string;
}

export interface VideoSection {
  title: string;
  narration: string;
  visuals: string;
  duration?: string;
}

// Learning Support Data
export interface PrimingData {
  source_chapter: string;
  context: string;
  key_questions: string[];
  prereq_concepts?: string[];
}

export interface InquiryData {
  source_chapter: string;
  questions: InquiryQuestion[];
}

export interface InquiryQuestion {
  question: string;
  type: "socratic" | "elaborative" | "application" | "critical";
  follow_ups?: string[];
}

export interface FlightPlanData {
  overview: string;
  phases: LearningPhase[];
  milestones: Milestone[];
}

export interface LearningPhase {
  name: string;
  description: string;
  chapters: string[];
  objectives: string[];
  duration_estimate?: string;
}

export interface Milestone {
  title: string;
  criteria: string[];
  after_chapter?: string;
}

// Learning Tree - Hierarchical Navigation Structure
export interface LearningTreeNode {
  id: string;
  type: "book" | "theme" | "chapter" | "concept" | "depth-level";
  title: string;
  children: LearningTreeNode[];
  content?: DepthContent;
  relatedQuizIds?: string[];
  relatedConceptIds?: string[];
  sourceChapter?: string;
}

export interface DepthContent {
  summary?: string; // Level 1: 30 sec read
  keyPoints?: string[]; // Level 2: 2-3 min
  deepDive?: string; // Level 3: 10-15 min
  application?: string; // Level 4: Practical exercises
}

export type DepthLevel = 1 | 2 | 3 | 4;

export const DEPTH_LEVELS = [
  {
    id: 1 as DepthLevel,
    label: "Summary",
    icon: "📋",
    readTime: "30 sec",
    description: "Quick overview",
  },
  {
    id: 2 as DepthLevel,
    label: "Key Points",
    icon: "🔑",
    readTime: "2-3 min",
    description: "Main ideas and takeaways",
  },
  {
    id: 3 as DepthLevel,
    label: "Deep Dive",
    icon: "🔬",
    readTime: "10-15 min",
    description: "Full explanation with examples",
  },
  {
    id: 4 as DepthLevel,
    label: "Application",
    icon: "🎯",
    readTime: "Practice",
    description: "Exercises and real-world use",
  },
] as const;

// Spaced Repetition Types (FSRS Algorithm)
export interface ReviewCard {
  id: string;
  bookId: string;
  type: "concept" | "quiz" | "feynman";
  front: string;
  back: string;
  stability: number;
  difficulty: number;
  lastReview: Date | null;
  nextReview: Date | null;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  sourceId: string; // ID of the concept/quiz it references
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
  timestamp: Date;
  intervalDays: number;
  stabilityBefore: number;
  stabilityAfter: number;
}

export interface ReviewStats {
  dueToday: number;
  newCards: number;
  learning: number;
  review: number;
  mastered: number; // Cards with stability > 30 days
}

// AI Content Item (for accordion mode)
export interface AIContentItem {
  id: string;
  parentId: string;
  depth: number;
  type: "question" | "followup";
  question: string;
  answer: string;
  createdAt: string;
  isDeleted?: boolean;
}

// UI Action Types - For AI-triggered navigation
export type UIAction =
  | { type: "navigate"; sectionId: string; highlightText?: string }
  | { type: "openDepthLevel"; nodeId: string; depth: DepthLevel }
  | { type: "showQuiz"; conceptId: string }
  | { type: "highlightConcept"; conceptId: string }
  | { type: "showRelated"; conceptId: string }
  | { type: "expandTreeNode"; nodeId: string }
  | { type: "collapseTreeNode"; nodeId: string }
  | { type: "startReview"; filter?: "due" | "new" | "all" }
  | { type: "addAIContent"; item: AIContentItem; autoExpand?: boolean }
  | { type: "deleteAIContent"; itemId: string };

// Chat Message Types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  uiAction?: UIAction;
}

// API Response Types
export interface BookListItem {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  chapterCount: number;
  conceptCount: number;
  quizCount: number;
  completionPercentage?: number;
}

export interface StreamingChatResponse {
  type:
    | "text_delta"
    | "tool_use_start"
    | "tool_result"
    | "ui_action"
    | "done"
    | "error";
  text?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  uiAction?: UIAction;
  error?: string;
}

/**
 * Book Context Utilities
 *
 * Provides functions to load and query book data for AI chat context
 * and tool execution.
 */

import fs from 'fs-extra';
import path from 'path';
import type {
  BookData,
  BookMetadata,
  ChapterData,
  Concept,
  QuizChapter,
  FeynmanData,
  FeynmanChapterData,
  SchemaData,
  ProjectData,
  LearningTreeNode,
  DepthContent,
  ConceptRelationship,
} from '@/types/book';

const DATA_DIR = path.join(process.cwd(), 'data', 'books');

/**
 * Load all book data for a given book ID
 */
export async function loadBookData(bookId: string): Promise<BookData | null> {
  const bookDir = path.join(DATA_DIR, bookId);

  if (!(await fs.pathExists(bookDir))) {
    return null;
  }

  const [
    metadata,
    chapters,
    concepts,
    quizzes,
    feynmanBook,
    feynmanChapters,
    schemas,
    projects,
    relationships,
    learningTree,
  ] = await Promise.all([
    loadJson<BookMetadata>(bookDir, 'metadata.json'),
    loadChapters(bookDir),
    loadJson<Concept[]>(bookDir, 'master_concepts.json'),
    loadJson<QuizChapter[]>(bookDir, 'quizzes.json'),
    loadJson<FeynmanData>(bookDir, 'feynman_book.json'),
    loadJson<FeynmanChapterData[]>(bookDir, 'feynman.json'),
    loadJson<SchemaData[]>(bookDir, 'schemas.json'),
    loadJson<ProjectData[]>(bookDir, 'projects.json'),
    loadJson<ConceptRelationship[]>(bookDir, 'relationships.json'),
    loadJson<LearningTreeNode>(bookDir, 'learning_tree.json'),
  ]);

  if (!metadata) {
    return null;
  }

  return {
    metadata,
    chapters: chapters || [],
    concepts: concepts || [],
    quizzes: quizzes || [],
    feynmanBook: feynmanBook || undefined,
    feynmanChapters: feynmanChapters || [],
    schemas: schemas || [],
    projects: projects || [],
    relationships: relationships || undefined,
    learningTree: learningTree || undefined,
  };
}

/**
 * Load chapters from content.json (enriched) or chapters directory
 */
async function loadChapters(bookDir: string): Promise<ChapterData[]> {
  // Try content.json first (has summaries and stories)
  const contentPath = path.join(bookDir, 'content.json');
  if (await fs.pathExists(contentPath)) {
    const content = await fs.readJson(contentPath);
    if (content.chapters) {
      return content.chapters;
    }
  }

  // Fall back to chapters.json
  const chaptersPath = path.join(bookDir, 'chapters.json');
  if (await fs.pathExists(chaptersPath)) {
    return fs.readJson(chaptersPath);
  }

  return [];
}

/**
 * Helper to safely load JSON files
 */
async function loadJson<T>(dir: string, filename: string): Promise<T | null> {
  const filePath = path.join(dir, filename);
  if (await fs.pathExists(filePath)) {
    try {
      return await fs.readJson(filePath);
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
      return null;
    }
  }
  return null;
}

/**
 * Get enriched context for AI chat
 */
export async function getBookContext(
  bookId: string,
  currentSection?: string
): Promise<{
  title: string;
  author: string;
  thesis: string;
  themes: string[];
  currentContext: string;
  concepts: string;
}> {
  const book = await loadBookData(bookId);

  if (!book) {
    return {
      title: 'Unknown Book',
      author: 'Unknown',
      thesis: '',
      themes: [],
      currentContext: '',
      concepts: '',
    };
  }

  // Extract themes from chapters
  const themes = book.chapters
    .slice(0, 10)
    .map(ch => ch.title)
    .filter(Boolean);

  // Build current context based on section
  let currentContext = '';
  if (currentSection) {
    const chapter = book.chapters.find(ch =>
      ch.id === currentSection ||
      ch.title.toLowerCase().includes(currentSection.toLowerCase())
    );
    if (chapter) {
      currentContext = `Current chapter: ${chapter.title}\n${chapter.summary || ''}`;
    }
  }

  // Top concepts summary
  const topConcepts = book.concepts
    .slice(0, 15)
    .map(c => `• ${c.name}: ${c.definition.slice(0, 100)}...`)
    .join('\n');

  return {
    title: book.metadata.title,
    author: book.metadata.author,
    thesis: book.feynmanBook?.thesis || '',
    themes,
    currentContext,
    concepts: topConcepts,
  };
}

/**
 * Get detailed information about a specific concept
 */
export async function getConceptDetails(
  bookId: string,
  conceptName: string,
  depthLevel?: 1 | 2 | 3 | 4
): Promise<{
  found: boolean;
  concept?: Concept;
  feynman?: FeynmanData;
  relatedQuizzes?: Array<{ question: string; answer: string }>;
  relatedProjects?: ProjectData[];
  depth: DepthContent;
}> {
  const book = await loadBookData(bookId);

  if (!book) {
    return { found: false, depth: {} };
  }

  // Find concept by name (case-insensitive, partial match)
  const normalizedName = conceptName.toLowerCase();
  const concept = book.concepts.find(c =>
    c.name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(c.name.toLowerCase())
  );

  if (!concept) {
    return { found: false, depth: {} };
  }

  // Find related Feynman explanation
  const feynman = book.feynmanChapters.find(f => {
    const chapterConcepts = book.concepts.filter(c =>
      c.occurrences?.some(occ =>
        occ.toLowerCase().includes(f.source_chapter.toLowerCase()) ||
        f.source_chapter.toLowerCase().includes(occ.toLowerCase())
      )
    );
    return chapterConcepts.some(c => c.name === concept.name);
  });

  // Find related quizzes
  const relatedQuizzes: Array<{ question: string; answer: string }> = [];
  for (const quizChapter of book.quizzes) {
    for (const q of quizChapter.questions) {
      if (q.question.toLowerCase().includes(normalizedName)) {
        relatedQuizzes.push({
          question: q.question,
          answer: `${q.correct_answer}. ${q.explanation}`,
        });
      }
    }
  }

  // Find related projects
  const relatedProjects = book.projects.filter(p =>
    p.related_concept.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(p.related_concept.toLowerCase())
  );

  // Build depth content
  const depth: DepthContent = {
    summary: concept.definition,
    keyPoints: concept.mechanism ? [concept.mechanism] : [],
    deepDive: concept.context || '',
    application: relatedProjects.length > 0
      ? `Try this project: ${relatedProjects[0].title} - ${relatedProjects[0].goal}`
      : '',
  };

  // Add Feynman explanation to depth if available
  if (feynman) {
    depth.keyPoints = [
      feynman.analogy,
      ...(depth.keyPoints || []),
    ];
    if (feynman.why_it_matters) {
      depth.application = feynman.why_it_matters + '\n\n' + (depth.application || '');
    }
  }

  return {
    found: true,
    concept,
    feynman,
    relatedQuizzes: relatedQuizzes.slice(0, 3),
    relatedProjects: relatedProjects.slice(0, 2),
    depth,
  };
}

/**
 * Search book content by keyword
 */
export async function searchBookContent(
  bookId: string,
  query: string,
  chapterFilter?: string
): Promise<{
  results: Array<{
    type: 'chapter' | 'concept' | 'story' | 'quiz';
    title: string;
    excerpt: string;
    source: string;
  }>;
  totalMatches: number;
}> {
  const book = await loadBookData(bookId);

  if (!book) {
    return { results: [], totalMatches: 0 };
  }

  const normalizedQuery = query.toLowerCase();
  const results: Array<{
    type: 'chapter' | 'concept' | 'story' | 'quiz';
    title: string;
    excerpt: string;
    source: string;
  }> = [];

  // Search chapters
  for (const chapter of book.chapters) {
    if (chapterFilter && !chapter.id.includes(chapterFilter) && !chapter.title.toLowerCase().includes(chapterFilter.toLowerCase())) {
      continue;
    }

    if (
      chapter.title.toLowerCase().includes(normalizedQuery) ||
      chapter.summary?.toLowerCase().includes(normalizedQuery)
    ) {
      results.push({
        type: 'chapter',
        title: chapter.title,
        excerpt: extractExcerpt(chapter.summary || '', normalizedQuery),
        source: chapter.id,
      });
    }

    // Search stories within chapters
    if (chapter.stories) {
      for (const story of chapter.stories) {
        if (
          story.title.toLowerCase().includes(normalizedQuery) ||
          story.description.toLowerCase().includes(normalizedQuery) ||
          story.lesson.toLowerCase().includes(normalizedQuery)
        ) {
          results.push({
            type: 'story',
            title: story.title,
            excerpt: extractExcerpt(story.description + ' ' + story.lesson, normalizedQuery),
            source: chapter.title,
          });
        }
      }
    }
  }

  // Search concepts
  for (const concept of book.concepts) {
    if (
      concept.name.toLowerCase().includes(normalizedQuery) ||
      concept.definition.toLowerCase().includes(normalizedQuery) ||
      concept.mechanism?.toLowerCase().includes(normalizedQuery)
    ) {
      results.push({
        type: 'concept',
        title: concept.name,
        excerpt: extractExcerpt(concept.definition, normalizedQuery),
        source: concept.occurrences?.[0] || 'General',
      });
    }
  }

  // Search quizzes
  for (const quizChapter of book.quizzes) {
    if (chapterFilter && !quizChapter.source_chapter.toLowerCase().includes(chapterFilter.toLowerCase())) {
      continue;
    }

    for (const question of quizChapter.questions) {
      if (
        question.question.toLowerCase().includes(normalizedQuery) ||
        question.explanation.toLowerCase().includes(normalizedQuery)
      ) {
        results.push({
          type: 'quiz',
          title: question.question.slice(0, 60) + '...',
          excerpt: question.explanation.slice(0, 150) + '...',
          source: quizChapter.source_chapter,
        });
      }
    }
  }

  return {
    results: results.slice(0, 10),
    totalMatches: results.length,
  };
}

/**
 * Generate a quiz on a specific topic
 */
export async function generateTopicQuiz(
  bookId: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  questionCount: number = 3
): Promise<{
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
  topic: string;
}> {
  const book = await loadBookData(bookId);

  if (!book) {
    return { questions: [], topic };
  }

  const normalizedTopic = topic.toLowerCase();
  const matchingQuestions: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }> = [];

  // Find questions related to the topic
  for (const quizChapter of book.quizzes) {
    for (const q of quizChapter.questions) {
      const matches =
        q.question.toLowerCase().includes(normalizedTopic) ||
        q.explanation.toLowerCase().includes(normalizedTopic);

      if (matches) {
        matchingQuestions.push({
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
        });
      }
    }
  }

  // Shuffle and take requested count
  const shuffled = matchingQuestions.sort(() => Math.random() - 0.5);

  return {
    questions: shuffled.slice(0, Math.min(questionCount, shuffled.length)),
    topic,
  };
}

/**
 * Get chapter summary with Feynman explanation
 */
export async function getChapterSummary(
  bookId: string,
  chapterIdOrTitle: string
): Promise<{
  found: boolean;
  chapter?: ChapterData;
  feynman?: FeynmanChapterData;
  concepts: Concept[];
  projectCount: number;
  quizCount: number;
}> {
  const book = await loadBookData(bookId);

  if (!book) {
    return { found: false, concepts: [], projectCount: 0, quizCount: 0 };
  }

  const normalizedInput = chapterIdOrTitle.toLowerCase();
  const chapter = book.chapters.find(ch =>
    ch.id.toLowerCase().includes(normalizedInput) ||
    ch.title.toLowerCase().includes(normalizedInput)
  );

  if (!chapter) {
    return { found: false, concepts: [], projectCount: 0, quizCount: 0 };
  }

  // Find Feynman for this chapter
  const feynman = book.feynmanChapters.find(f => {
    const normSource = f.source_chapter.toLowerCase().replace(/_/g, ' ').replace(/\.html$/, '');
    const normChapter = chapter.id.toLowerCase().replace(/_/g, ' ').replace(/\.md$/, '');
    return normSource.includes(normChapter) || normChapter.includes(normSource);
  });

  // Find concepts in this chapter
  const concepts = book.concepts.filter(c =>
    c.occurrences?.some(occ =>
      occ.toLowerCase().includes(chapter.title.toLowerCase()) ||
      chapter.title.toLowerCase().includes(occ.toLowerCase())
    )
  );

  // Count quizzes for this chapter
  const quizChapter = book.quizzes.find(q => {
    const normSource = q.source_chapter.toLowerCase().replace(/_/g, ' ');
    return normSource.includes(chapter.title.toLowerCase()) ||
           chapter.title.toLowerCase().includes(normSource);
  });

  // Count related projects
  const conceptNames = concepts.map(c => c.name.toLowerCase());
  const relatedProjects = book.projects.filter(p =>
    conceptNames.some(cn =>
      cn.includes(p.related_concept.toLowerCase()) ||
      p.related_concept.toLowerCase().includes(cn)
    )
  );

  return {
    found: true,
    chapter,
    feynman,
    concepts,
    projectCount: relatedProjects.length,
    quizCount: quizChapter?.questions.length || 0,
  };
}

/**
 * List all available books
 */
export async function listBooks(): Promise<Array<{
  id: string;
  title: string;
  author: string;
  chapterCount: number;
  conceptCount: number;
}>> {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const books: Array<{
    id: string;
    title: string;
    author: string;
    chapterCount: number;
    conceptCount: number;
  }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'test_cover') continue;

    const metadata = await loadJson<BookMetadata>(
      path.join(DATA_DIR, entry.name),
      'metadata.json'
    );

    if (metadata) {
      const chapters = await loadChapters(path.join(DATA_DIR, entry.name));
      const concepts = await loadJson<Concept[]>(
        path.join(DATA_DIR, entry.name),
        'master_concepts.json'
      );

      books.push({
        id: metadata.id,
        title: metadata.title,
        author: metadata.author,
        chapterCount: chapters?.length || 0,
        conceptCount: concepts?.length || 0,
      });
    }
  }

  return books;
}

/**
 * Extract excerpt around a search term
 */
function extractExcerpt(text: string, searchTerm: string, contextLength: number = 100): string {
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(searchTerm.toLowerCase());

  if (index === -1) {
    return text.slice(0, contextLength * 2) + '...';
  }

  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + searchTerm.length + contextLength);

  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  return excerpt;
}

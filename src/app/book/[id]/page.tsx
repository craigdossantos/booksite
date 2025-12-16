import fs from "fs-extra";
import path from "path";
import Link from "next/link";
import LearningInterface from "@/components/LearningInterface";
import BookExplorer from "@/components/BookExplorer";
import type {
  ChapterData,
  Concept,
  QuizQuestion,
  QuizChapter,
  FeynmanData,
  FeynmanChapterData,
  ProjectData,
  SchemaData,
} from "@/types/book";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; chapter?: string; concept?: string }>;
}

interface BookContent {
  title: string;
  author: string;
  chapters: ChapterData[];
}

interface BookDataResult {
  metadata?: { title: string; author: string };
  content?: BookContent;
  chapters?: ChapterData[];
  quizzes?: QuizChapter[];
  concepts?: Concept[];
  feynman?: FeynmanData;
  feynmanChapters?: FeynmanChapterData[];
  schemas?: SchemaData[];
  projects?: ProjectData[];
  priming?: unknown;
  inquiry?: unknown;
  flightPlan?: unknown;
  availability: Record<string, boolean>;
}

async function getBookData(id: string): Promise<BookDataResult> {
  const dataDir = path.join(process.cwd(), "data", "books", id);

  const files = {
    metadata: "metadata.json",
    content: "content.json",
    chapters: "chapters.json",
    quizzes: "quizzes.json",
    concepts: "master_concepts.json",
    feynman: "feynman_book.json",
    feynmanChapters: "feynman.json",
    schemas: "schemas.json",
    projects: "projects.json",
    priming: "priming.json",
    inquiry: "inquiry.json",
    flightPlan: "flight_plan.json",
  };

  const data: Record<string, unknown> = {};

  await Promise.all(
    Object.entries(files).map(async ([key, filename]) => {
      const filePath = path.join(dataDir, filename);
      if (await fs.pathExists(filePath)) {
        data[key] = await fs.readJson(filePath);
      }
    })
  );

  // Check for generated images
  const imagesPath = path.join(dataDir, "generated_images.json");
  const hasImages = await fs.pathExists(imagesPath);

  // Build availability map
  const availability: Record<string, boolean> = {
    read: true,
    explore: true, // New explore mode always available
    concepts: !!data.concepts,
    feynman: !!data.feynman,
    quizzes: !!data.quizzes,
    schemas: !!data.schemas,
    projects: !!data.projects,
    priming: !!data.priming,
    inquiry: !!data.inquiry,
    flight_plan: !!data.flightPlan,
    images: hasImages,
  };

  return { ...data, availability } as BookDataResult;
}

export default async function BookPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const currentMode: string = resolvedSearchParams.mode || "explore"; // Default to explore mode
  const currentChapter = resolvedSearchParams.chapter;
  const currentConcept = resolvedSearchParams.concept;

  const bookData = await getBookData(id);
  const content = bookData.content;
  const metadata = bookData.metadata;
  const quizzes = bookData.quizzes;
  const concepts = bookData.concepts;
  const feynman = bookData.feynman;
  const feynmanChapters = bookData.feynmanChapters;
  const availability = bookData.availability;
  const schemas = bookData.schemas;
  const projects = bookData.projects;
  const priming = bookData.priming;
  const inquiry = bookData.inquiry;

  const title = content?.title || metadata?.title || "Untitled Book";
  const author = content?.author || metadata?.author || "Unknown Author";
  const chapters = content?.chapters || [];

  // Get current chapter data if selected
  const selectedChapter = currentChapter
    ? chapters.find((c) => c.id === currentChapter) || null
    : null;

  // Get quizzes for current chapter
  const chapterQuizzes = currentChapter && quizzes
    ? quizzes.find((q) => {
        const normalizedSource = q.source_chapter.toLowerCase().replace(/_/g, " ");
        const normalizedChapter = currentChapter.toLowerCase().replace(/_/g, " ").replace(".md", "");
        return normalizedSource.includes(normalizedChapter) || normalizedChapter.includes(normalizedSource);
      })
    : null;

  // Get concepts for current chapter
  const chapterConcepts = currentChapter && concepts
    ? concepts.filter((c) =>
        c.occurrences?.some((occ) => {
          const normId = currentChapter.replace(/\.md$/, "").replace(/_/g, " ").toLowerCase();
          const normOcc = occ.replace(/\.md$/, "").replace(/_/g, " ").toLowerCase();
          return normId.includes(normOcc) || normOcc.includes(normId);
        })
      )
    : [];

  const totalQuizQuestions = quizzes?.reduce((acc, q) => acc + q.questions.length, 0) || 0;

  // New explore mode uses the tree-based navigation
  if (currentMode === "explore") {
    return (
      <div className="min-h-screen bg-[var(--color-void)]">
        {/* Top Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-[var(--color-pearl)] hover:text-[var(--color-snow)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Library</span>
              </Link>
              <div className="w-px h-6 bg-white/10" />
              <h1 className="text-sm font-semibold text-[var(--color-snow)] line-clamp-1 max-w-md">
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Mode Switcher */}
              <div className="flex items-center gap-1 p-1 bg-[var(--color-graphite)] rounded-lg">
                <Link
                  href={`/book/${id}?mode=explore`}
                  className="px-3 py-1.5 text-xs rounded-md transition-all bg-[var(--color-electric-blue)] text-white"
                >
                  🌳 Explore
                </Link>
                <Link
                  href={`/book/${id}?mode=overview`}
                  className="px-3 py-1.5 text-xs rounded-md transition-all text-[var(--color-pearl)] hover:bg-white/10"
                >
                  📖 Classic
                </Link>
              </div>

              {/* Stats pills */}
              <div className="hidden md:flex items-center gap-3">
                <span className="badge badge-blue">{chapters.length} chapters</span>
                <span className="badge badge-cyan">{concepts?.length || 0} concepts</span>
                {totalQuizQuestions > 0 && (
                  <span className="badge badge-emerald">{totalQuizQuestions} questions</span>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Book Explorer Component */}
        <BookExplorer
          bookId={id}
          title={title}
          author={author}
          chapters={chapters}
          concepts={concepts || []}
          quizzes={quizzes || []}
          feynman={feynman}
          feynmanChapters={feynmanChapters || []}
          projects={projects || []}
          schemas={schemas || []}
          initialChapterId={currentChapter}
          initialConceptId={currentConcept}
        />
      </div>
    );
  }

  // Classic modes (overview, quiz, concepts, feynman, etc.)
  return (
    <div className="min-h-screen bg-[var(--color-void)]">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-[var(--color-pearl)] hover:text-[var(--color-snow)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Library</span>
            </Link>
            <div className="w-px h-6 bg-white/10" />
            <h1 className="text-sm font-semibold text-[var(--color-snow)] line-clamp-1 max-w-md">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-[var(--color-graphite)] rounded-lg">
              <Link
                href={`/book/${id}?mode=explore`}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  currentMode === "explore"
                    ? "bg-[var(--color-electric-blue)] text-white"
                    : "text-[var(--color-pearl)] hover:bg-white/10"
                }`}
              >
                🌳 Explore
              </Link>
              <Link
                href={`/book/${id}?mode=overview`}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  currentMode !== "explore"
                    ? "bg-[var(--color-electric-blue)] text-white"
                    : "text-[var(--color-pearl)] hover:bg-white/10"
                }`}
              >
                📖 Classic
              </Link>
            </div>

            {/* Stats pills */}
            <div className="hidden md:flex items-center gap-3">
              <span className="badge badge-blue">{chapters.length} chapters</span>
              {totalQuizQuestions > 0 && (
                <span className="badge badge-emerald">{totalQuizQuestions} questions</span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 w-72 glass border-r border-white/5 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Book Cover Mini */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-24 rounded-lg overflow-hidden bg-[var(--color-graphite)] flex-shrink-0">
                <img
                  src={`/api/books/${id}/cover`}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-[var(--color-snow)] text-sm line-clamp-2">{title}</h2>
                <p className="text-xs text-[var(--color-silver)] mt-1">{author}</p>
              </div>
            </div>

            {/* Learning Modes */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-silver)] uppercase tracking-wider mb-3">
                Learning Modes
              </h3>
              <div className="space-y-1">
                {[
                  { id: "overview", label: "Overview", icon: "📖", available: true },
                  { id: "quiz", label: "Quiz Mode", icon: "🎯", available: availability.quizzes },
                  { id: "concepts", label: "Key Concepts", icon: "💡", available: availability.concepts },
                  { id: "feynman", label: "Feynman", icon: "🧠", available: availability.feynman },
                  { id: "schemas", label: "Mental Models", icon: "🗺️", available: availability.schemas },
                  { id: "projects", label: "Projects", icon: "🛠️", available: availability.projects },
                  { id: "images", label: "Visual Metaphors", icon: "🎨", available: availability.images },
                ].map((mode) => (
                  <Link
                    key={mode.id}
                    href={`/book/${id}?mode=${mode.id}${currentChapter ? `&chapter=${currentChapter}` : ""}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      currentMode === mode.id
                        ? "bg-[var(--color-electric-blue)]/20 text-[var(--color-electric-blue)]"
                        : mode.available
                        ? "text-[var(--color-pearl)] hover:bg-white/5 hover:text-[var(--color-snow)]"
                        : "text-[var(--color-steel)] cursor-not-allowed opacity-50"
                    }`}
                  >
                    <span className="text-lg">{mode.icon}</span>
                    <span className="text-sm font-medium">{mode.label}</span>
                    {!mode.available && (
                      <span className="ml-auto text-xs bg-[var(--color-graphite)] px-2 py-0.5 rounded">
                        Generate
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Chapters */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-silver)] uppercase tracking-wider mb-3">
                Chapters ({chapters.length})
              </h3>
              <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-2">
                {chapters.map((chapter, idx) => (
                  <Link
                    key={chapter.id}
                    href={`/book/${id}?mode=${currentMode}&chapter=${chapter.id}`}
                    className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                      currentChapter === chapter.id
                        ? "bg-[var(--color-electric-purple)]/20 text-[var(--color-electric-purple)]"
                        : "text-[var(--color-pearl)] hover:bg-white/5 hover:text-[var(--color-snow)]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[var(--color-steel)] text-xs mt-0.5 w-5 flex-shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="line-clamp-2 leading-snug">{chapter.title}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 ml-72 min-h-[calc(100vh-4rem)]">
          <LearningInterface
            bookId={id}
            mode={currentMode}
            title={title}
            author={author}
            chapters={chapters}
            selectedChapter={selectedChapter}
            quizzes={chapterQuizzes?.questions || []}
            allQuizzes={quizzes || []}
            concepts={currentChapter ? chapterConcepts : (concepts || [])}
            feynman={feynman}
            feynmanChapters={feynmanChapters}
            schemas={schemas}
            projects={projects}
            priming={priming}
            inquiry={inquiry}
          />
        </main>
      </div>
    </div>
  );
}

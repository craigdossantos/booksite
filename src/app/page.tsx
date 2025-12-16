import fs from "fs-extra";
import path from "path";
import BookCard from "@/components/BookCard";

export const dynamic = 'force-dynamic';

interface BookData {
  id: string;
  title: string;
  author: string;
  chaptersCount: number;
  hasQuizzes: boolean;
  hasConcepts: boolean;
  completionPercentage: number;
}

async function getProcessedBooks(): Promise<BookData[]> {
  const dataDir = path.join(process.cwd(), "data", "books");

  if (!await fs.pathExists(dataDir)) {
    return [];
  }

  const dirs = await fs.readdir(dataDir);
  const books: BookData[] = [];

  for (const dir of dirs) {
    const metadataPath = path.join(dataDir, dir, "metadata.json");
    const chaptersPath = path.join(dataDir, dir, "chapters.json");
    const quizzesPath = path.join(dataDir, dir, "quizzes.json");
    const conceptsPath = path.join(dataDir, dir, "master_concepts.json");

    if (await fs.pathExists(metadataPath)) {
      try {
        const metadata = await fs.readJson(metadataPath);
        const chaptersExist = await fs.pathExists(chaptersPath);
        const chapters = chaptersExist ? await fs.readJson(chaptersPath) : [];
        const hasQuizzes = await fs.pathExists(quizzesPath);
        const hasConcepts = await fs.pathExists(conceptsPath);

        // Calculate completion based on available features
        const features = ['chapters', 'quizzes', 'concepts', 'feynman', 'schemas', 'projects'];
        const featureFiles = [
          'chapters.json', 'quizzes.json', 'master_concepts.json',
          'feynman_book.json', 'schemas.json', 'projects.json'
        ];
        let completed = 0;
        for (const file of featureFiles) {
          if (await fs.pathExists(path.join(dataDir, dir, file))) completed++;
        }

        books.push({
          id: dir,
          title: metadata.title || "Untitled",
          author: metadata.author || "Unknown Author",
          chaptersCount: chapters.length || 0,
          hasQuizzes,
          hasConcepts,
          completionPercentage: Math.round((completed / features.length) * 100),
        });
      } catch (error) {
        console.error(`Error reading metadata for ${dir}:`, error);
      }
    }
  }

  return books;
}

export default async function Home() {
  const books = await getProcessedBooks();

  return (
    <div className="min-h-screen bg-[var(--color-void)] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[var(--color-electric-blue)]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[var(--color-electric-purple)]/5 rounded-full blur-[100px]" />
      </div>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16 reveal-up">
          <div className="inline-flex items-center gap-2 badge badge-purple mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--color-electric-purple)] animate-pulse" />
            AI-Powered Learning
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            <span className="gradient-text">Master Any Book</span>
            <br />
            <span className="text-[var(--color-snow)]">in 40 Minutes</span>
          </h1>

          <p className="text-xl text-[var(--color-pearl)] max-w-2xl mx-auto leading-relaxed">
            Transform any book into an interactive learning experience with AI-powered summaries,
            quizzes, and spaced repetition. Understand deeply. Remember forever.
          </p>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 mt-10">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">{books.length}</div>
              <div className="text-sm text-[var(--color-silver)]">Books Ready</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text-secondary">
                {books.reduce((acc, b) => acc + b.chaptersCount, 0)}
              </div>
              <div className="text-sm text-[var(--color-silver)]">Chapters</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--color-electric-emerald)]">
                {books.filter(b => b.hasQuizzes).length * 50}+
              </div>
              <div className="text-sm text-[var(--color-silver)]">Quiz Questions</div>
            </div>
          </div>
        </header>

        {/* Learning modes section */}
        <section className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: "🎯", label: "Active Recall", desc: "Test your memory" },
              { icon: "🔄", label: "Spaced Repetition", desc: "Optimal timing" },
              { icon: "🧠", label: "Feynman Method", desc: "Deep understanding" },
              { icon: "💡", label: "Key Concepts", desc: "Core ideas" },
            ].map((mode, idx) => (
              <div
                key={idx}
                className="glass rounded-xl p-4 text-center card-hover"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="text-3xl mb-2">{mode.icon}</div>
                <div className="font-semibold text-sm text-[var(--color-snow)]">{mode.label}</div>
                <div className="text-xs text-[var(--color-silver)]">{mode.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Books grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[var(--color-snow)]">Your Library</h2>
            <div className="flex items-center gap-2 text-sm text-[var(--color-silver)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-electric-emerald)]" />
              {books.filter(b => b.completionPercentage === 100).length} fully processed
            </div>
          </div>

          {books.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4 opacity-50">📚</div>
              <h3 className="text-xl font-semibold text-[var(--color-snow)] mb-2">No books yet</h3>
              <p className="text-[var(--color-silver)]">Add EPUB files to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-children">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </section>

        {/* AI Assistant teaser */}
        <section className="mt-20 glass rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--color-electric-purple)]/20 to-transparent rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-electric-blue)] to-[var(--color-electric-purple)] flex items-center justify-center text-4xl shadow-lg float">
                🤖
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold text-[var(--color-snow)] mb-2">
                AI Learning Assistant
              </h3>
              <p className="text-[var(--color-pearl)] mb-4">
                Ask questions about any book. Get personalized explanations.
                The AI adapts to your learning style and helps you understand complex concepts.
              </p>
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <span className="badge badge-blue">Powered by Claude</span>
                <span className="badge badge-purple">Context-Aware</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-white/5 text-center text-sm text-[var(--color-silver)]">
          <p>Built for deep learning. Powered by AI.</p>
        </footer>
      </main>
    </div>
  );
}

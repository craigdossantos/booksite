# refactor: Booksite Clean Slate Rebuild

---

title: "refactor: Booksite Clean Slate Rebuild"
type: refactor
date: 2026-02-04
brainstorm: docs/brainstorms/2026-02-04-booksite-rebuild-brainstorm.md

---

## Overview

Rebuild the book processing app with a clean, Medium-inspired reading experience. Delete all existing UI components and artifact generators, keeping only the core EPUB extraction pipeline. Generate voice-aware blog post summaries that match each book's writing style.

**Phase 1 MVP (this plan):** Single-user, full flow: Upload → Library → Reader
**Phase 2 (future):** Supabase integration with auth and per-user storage

## Problem Statement

The current implementation has 15 UI components and 14 artifact generators that don't match the new vision. The design is cluttered with learning modes, quizzes, and depth panels. The user wants a clean, typography-focused reading experience with just chapter summaries.

**Current pain points:**

- Overly complex UI with too many features
- Artifacts (quizzes, Feynman, schemas) not useful
- Design doesn't prioritize readability
- No clear processing status feedback

## Proposed Solution

**Clean Slate rebuild** that:

1. Deletes all 15 existing UI components
2. Deletes 14 artifact generator Python scripts
3. Keeps the core EPUB extraction pipeline
4. Creates new simplified Python script for voice-aware summaries
5. Builds new Medium-inspired UI from scratch

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  /                    │ /book/[id]           │ /book/[id]/chapter/[num] │
│  Library View         │ Book Detail          │ Chapter Reader            │
│  - Upload dropzone    │ - Chapter list       │ - Summary (collapsible)   │
│  - Book grid          │ - Summaries preview  │ - Full content            │
│  - Processing status  │ - Book metadata      │ - Chapter navigation      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Routes                               │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/books/upload     │ Upload EPUB, start processing      │
│  GET  /api/books            │ List all books                     │
│  GET  /api/books/[id]       │ Get book with chapters/summaries   │
│  GET  /api/books/[id]/status│ Polling endpoint for progress      │
│  DELETE /api/books/[id]     │ Remove book and cleanup files      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Python Processing Pipeline                    │
├─────────────────────────────────────────────────────────────────┤
│  1. convert_epub_to_markdown.py  │ Extract chapters as markdown  │
│  2. extract_cover.py             │ Extract cover image           │
│  3. analyze_voice.py (NEW)       │ Analyze book's writing style  │
│  4. generate_summaries.py (NEW)  │ Generate voice-matched summaries │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Storage (/data/books/{bookId}/)          │
├─────────────────────────────────────────────────────────────────┤
│  metadata.json   │ { id, title, author, voiceProfile, status }   │
│  chapters.json   │ [{ number, title, markdownPath, summary }]    │
│  status.json     │ { status, progress, currentStep, error }      │
│  cover.jpg       │ Extracted cover image                         │
│  markdown/       │ Chapter content as .md files                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Cleanup & Foundation (Day 1)

**Goal:** Remove old code, establish new data structures

**Tasks:**

- [ ] Delete all components in `src/components/` (15 files)
- [ ] Delete artifact generators in `execution/` (14 files, keep 4)
- [ ] Delete old pages: `src/app/page.tsx`, `src/app/book/[id]/page.tsx`
- [ ] Delete old API routes (keep cover route)
- [ ] Delete old documentation files (ARCHITECTURE_OVERVIEW.md, etc.)
- [ ] Create new type definitions in `src/types/book.ts`
- [ ] Create status.json schema for processing progress

**Files to delete:**

```
src/components/
├── AIAccordionItem.tsx
├── AIChat.tsx
├── AISidebar.tsx
├── AccordionPanel.tsx
├── AccordionSection.tsx
├── BookCard.tsx
├── BookExplorer.tsx
├── DeepDiveView.tsx
├── DepthPanel.tsx
├── ImageGallery.tsx
├── LearningInterface.tsx
├── LearningTree.tsx
├── ProcessButton.tsx
├── QuizMode.tsx
└── VoiceInput.tsx

execution/
├── generate_quizzes.py
├── generate_feynman.py
├── generate_schemas.py
├── generate_projects.py
├── generate_inquiry.py
├── generate_priming.py
├── generate_flight_plan.py
├── generate_images.py
├── generate_audio_scripts.py
├── generate_video_scripts.py
├── extract_concepts.py
├── aggregate_concepts.py
├── aggregate_feynman.py
└── extract_stories.py
```

**Files to keep:**

```
execution/
├── convert_epub_to_markdown.py  # Core extraction
├── extract_cover.py             # Cover extraction
├── filter_chapters.py           # Chapter filtering
└── process_book.py              # Will be simplified
```

**New type definitions (`src/types/book.ts`):**

```typescript
// Book metadata
export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  voiceProfile?: VoiceProfile;
  chapterCount: number;
  createdAt: string;
  processedAt?: string;
  status: BookStatus;
}

export type BookStatus =
  | "uploading"
  | "extracting"
  | "analyzing"
  | "summarizing"
  | "ready"
  | "error";

export interface VoiceProfile {
  tone: string; // "conversational" | "academic" | "storytelling" | etc.
  style: string; // "first-person" | "third-person" | "instructional"
  complexity: string; // "simple" | "moderate" | "complex"
  characteristics: string[];
}

// Chapter with summary
export interface Chapter {
  number: number;
  title: string;
  markdownPath: string;
  wordCount: number;
  summary?: ChapterSummary;
}

export interface ChapterSummary {
  content: string;
  wordCount: number;
  generatedAt: string;
}

// Processing status (for polling)
export interface ProcessingStatus {
  bookId: string;
  status: BookStatus;
  progress: number; // 0-100
  currentStep: string; // Human-readable step name
  chaptersProcessed: number;
  totalChapters: number;
  error?: string;
  startedAt: string;
  updatedAt: string;
}
```

#### Phase 2: Python Pipeline (Day 2)

**Goal:** Create simplified processing pipeline with voice analysis

**Tasks:**

- [ ] Create `execution/analyze_voice.py` - Analyze book's writing style
- [ ] Create `execution/generate_summaries.py` - Generate voice-matched summaries
- [ ] Simplify `execution/process_book.py` to orchestrate new pipeline
- [ ] Add status.json writing at each processing step
- [ ] Test pipeline with existing EPUB files

**analyze_voice.py:**

```python
"""
Analyze first 2-3 chapters to determine book's writing style.
Creates a voice profile stored in metadata.json.
"""

VOICE_ANALYSIS_PROMPT = """
Analyze the writing style of this book excerpt. Return a JSON object with:
- tone: The emotional tone (e.g., "conversational", "academic", "inspirational", "humorous")
- style: The narrative style (e.g., "first-person narrative", "third-person objective", "instructional")
- complexity: Vocabulary/sentence complexity (e.g., "simple", "moderate", "complex")
- characteristics: Array of 3-5 distinctive stylistic traits

Be specific to THIS book's unique voice.
"""
```

**generate_summaries.py:**

```python
"""
Generate voice-matched chapter summaries.
Uses voice profile to match the book's writing style.
Summary length adapts to chapter length/complexity.
"""

SUMMARY_PROMPT_TEMPLATE = """
You are writing a summary in the voice and style of this book.

Voice Profile:
- Tone: {tone}
- Style: {style}
- Complexity: {complexity}
- Characteristics: {characteristics}

Write a blog-post style summary of this chapter that:
1. Matches the author's voice exactly
2. Captures the key ideas and narrative
3. Feels like it could have been written by the author
4. Is approximately {target_words} words (adjust based on content density)

Chapter content:
{content}
"""
```

**Summary length rules:**

| Chapter Word Count | Target Summary Words |
| ------------------ | -------------------- |
| < 1,000            | 100-150              |
| 1,000 - 3,000      | 200-300              |
| 3,000 - 8,000      | 300-500              |
| > 8,000            | 500-700              |

#### Phase 3: API Routes (Day 3)

**Goal:** Create new API endpoints for upload, listing, status, and deletion

**Tasks:**

- [ ] Create `POST /api/books/upload` - Handle EPUB upload
- [ ] Create `GET /api/books` - List all books
- [ ] Create `GET /api/books/[id]` - Get book details
- [ ] Create `GET /api/books/[id]/status` - Polling endpoint
- [ ] Create `DELETE /api/books/[id]` - Delete book
- [ ] Update `GET /api/books/[id]/cover` - Keep existing

**src/app/api/books/upload/route.ts:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { spawn } from "child_process";
import { createHash } from "crypto";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  // Validate file
  if (!file || !file.name.endsWith(".epub")) {
    return NextResponse.json(
      { error: "Please upload a valid EPUB file" },
      { status: 400 },
    );
  }

  // Generate book ID from filename hash
  const bookId = createHash("md5").update(file.name).digest("hex").slice(0, 12);

  const bookDir = path.join(process.cwd(), "data", "books", bookId);

  // Create directory and save EPUB
  await mkdir(bookDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(bookDir, "original.epub"), buffer);

  // Initialize status.json
  const status = {
    bookId,
    status: "uploading",
    progress: 0,
    currentStep: "Saving file",
    chaptersProcessed: 0,
    totalChapters: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(bookDir, "status.json"),
    JSON.stringify(status, null, 2),
  );

  // Start processing in background
  spawnProcessing(bookId);

  return NextResponse.json({ bookId, status: "uploading" });
}
```

**src/app/api/books/[id]/status/route.ts:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const statusPath = path.join(
    process.cwd(),
    "data",
    "books",
    id,
    "status.json",
  );

  try {
    const content = await readFile(statusPath, "utf-8");
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
}
```

#### Phase 4: Library UI (Day 4)

**Goal:** Build the home page with book grid and upload

**Tasks:**

- [ ] Create `src/app/page.tsx` - Library view
- [ ] Create `src/components/UploadDropzone.tsx` - Drag-and-drop upload
- [ ] Create `src/components/BookCard.tsx` - Book card with cover
- [ ] Create `src/components/ProcessingCard.tsx` - Processing status card
- [ ] Create `src/components/EmptyLibrary.tsx` - Empty state
- [ ] Add polling hook for processing status

**src/app/page.tsx:**

```tsx
import { Suspense } from "react";
import { getBooks } from "@/lib/books";
import { UploadDropzone } from "@/components/UploadDropzone";
import { BookCard } from "@/components/BookCard";
import { EmptyLibrary } from "@/components/EmptyLibrary";

export default async function LibraryPage() {
  const books = await getBooks();

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-gray-900">
          Your Library
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Upload books and read AI-generated summaries
        </p>
      </header>

      <UploadDropzone />

      {books.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-12">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </main>
  );
}
```

**Design tokens (Tailwind):**

```css
/* Typography - Medium-inspired */
.prose-book {
  @apply font-serif text-gray-900 leading-relaxed;
  font-size: 1.125rem; /* 18px base */
  line-height: 1.75; /* 175% line height */
  max-width: 680px; /* Optimal reading width */
}

/* Colors */
--color-text: #1a1a1a;
--color-text-secondary: #6b6b6b;
--color-background: #ffffff;
--color-surface: #fafafa;
--color-border: #e5e5e5;
--color-accent: #1a8917; /* Medium green */
```

#### Phase 5: Reader UI (Day 5)

**Goal:** Build the book detail and chapter reader pages

**Tasks:**

- [ ] Create `src/app/book/[id]/page.tsx` - Book detail with chapter list
- [ ] Create `src/app/book/[id]/chapter/[num]/page.tsx` - Chapter reader
- [ ] Create `src/components/ChapterList.tsx` - Chapter listing
- [ ] Create `src/components/ChapterReader.tsx` - Reading view
- [ ] Create `src/components/Summary.tsx` - Collapsible summary
- [ ] Create `src/components/ChapterNav.tsx` - Previous/next navigation
- [ ] Add keyboard navigation (arrow keys)

**src/app/book/[id]/chapter/[num]/page.tsx:**

```tsx
import { getBook, getChapterContent } from "@/lib/books";
import { ChapterReader } from "@/components/ChapterReader";
import { ChapterNav } from "@/components/ChapterNav";
import { Summary } from "@/components/Summary";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string; num: string }>;
}

export default async function ChapterPage({ params }: Props) {
  const { id, num } = await params;
  const book = await getBook(id);
  const chapterNum = parseInt(num, 10);

  if (!book) notFound();

  const chapter = book.chapters[chapterNum - 1];
  if (!chapter) notFound();

  const content = await getChapterContent(id, chapter.markdownPath);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <ChapterNav
        bookId={id}
        currentChapter={chapterNum}
        totalChapters={book.chapterCount}
      />

      <article className="mt-8">
        <h1 className="text-3xl font-serif font-bold mb-4">{chapter.title}</h1>

        {chapter.summary && <Summary content={chapter.summary.content} />}

        <div className="prose-book mt-8">{content}</div>
      </article>

      <ChapterNav
        bookId={id}
        currentChapter={chapterNum}
        totalChapters={book.chapterCount}
        position="bottom"
      />
    </main>
  );
}
```

#### Phase 6: Polish & Testing (Day 6)

**Goal:** Add error handling, loading states, and tests

**Tasks:**

- [ ] Add error boundaries for graceful failures
- [ ] Add loading skeletons for all async content
- [ ] Add toast notifications for upload success/failure
- [ ] Test full upload → processing → reading flow
- [ ] Test error scenarios (invalid file, processing failure)
- [ ] Run lint and typecheck
- [ ] Update CLAUDE.md with new architecture

## Acceptance Criteria

### Functional Requirements

- [ ] User can drag-and-drop an EPUB file to upload
- [ ] User sees real-time processing progress (polling every 3 seconds)
- [ ] User can view library of uploaded books with covers
- [ ] User can click a book to see chapter list with summary previews
- [ ] User can read full chapters with voice-matched summaries
- [ ] User can navigate between chapters (arrows, keyboard)
- [ ] User can delete books from library

### Non-Functional Requirements

- [ ] Page load < 1s for library with 20 books
- [ ] Chapter load < 500ms
- [ ] Responsive design works on mobile (320px+)
- [ ] Accessible: keyboard navigation, semantic HTML

### Quality Gates

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] Manual test of full flow with 3 different EPUBs

## Success Metrics

| Metric                   | Target                          |
| ------------------------ | ------------------------------- |
| Time to first book ready | < 5 minutes for average book    |
| Library page load        | < 1 second                      |
| Chapter page load        | < 500ms                         |
| Summary quality          | Voice matches book (subjective) |

## Dependencies & Prerequisites

- [ ] Gemini API key configured in `.env.local`
- [ ] Python 3.13+ with google-generativeai installed
- [ ] Node 20+ for Next.js 16

## Risk Analysis & Mitigation

| Risk                                  | Likelihood | Impact | Mitigation                                    |
| ------------------------------------- | ---------- | ------ | --------------------------------------------- |
| Voice analysis produces poor results  | Medium     | High   | Allow manual voice profile editing in Phase 2 |
| Long processing times frustrate users | Medium     | Medium | Show granular progress, optimize API calls    |
| Gemini API rate limits                | Low        | High   | Add retry with backoff, queue processing      |
| Large EPUBs crash processing          | Low        | Medium | Add file size limit (50MB), memory monitoring |

## Future Considerations

- **Phase 2:** Supabase integration for auth and per-user storage
- **Phase 2:** User accounts and book ownership
- **Phase 2:** Reading progress persistence
- **Phase 3:** Dark mode
- **Phase 3:** Export summaries as PDF/Markdown

## Files Changed Summary

### Deleted (29 files)

```
src/components/*.tsx (15 files)
execution/*.py (14 artifact generators)
```

### Created (15+ files)

```
src/app/page.tsx
src/app/book/[id]/page.tsx
src/app/book/[id]/chapter/[num]/page.tsx
src/app/api/books/route.ts
src/app/api/books/upload/route.ts
src/app/api/books/[id]/route.ts
src/app/api/books/[id]/status/route.ts
src/components/UploadDropzone.tsx
src/components/BookCard.tsx
src/components/ProcessingCard.tsx
src/components/EmptyLibrary.tsx
src/components/ChapterList.tsx
src/components/ChapterReader.tsx
src/components/Summary.tsx
src/components/ChapterNav.tsx
execution/analyze_voice.py
execution/generate_summaries.py
```

### Modified (3 files)

```
src/types/book.ts (new types)
execution/process_book.py (simplified)
CLAUDE.md (updated architecture)
```

## References & Research

### Internal References

- Brainstorm: `docs/brainstorms/2026-02-04-booksite-rebuild-brainstorm.md`
- Existing extraction: `execution/convert_epub_to_markdown.py`
- Existing cover extraction: `execution/extract_cover.py`
- Type definitions: `src/types/book.ts`
- Data loading: `src/lib/bookContext.ts`

### Patterns to Follow

- API route params: `{ params }: { params: Promise<{ id: string }> }`
- Response format: `NextResponse.json({ data })` or `NextResponse.json({ error }, { status })`
- Python subprocess: `spawn("python3", ["-c", script])` with PYTHONPATH

### Design Reference

- Medium.com article reading experience
- Clean typography, 18px base font, 175% line height
- Max 680px content width for readability

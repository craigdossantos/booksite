# Booksite Rebuild Brainstorm

**Date:** 2026-02-04
**Status:** Ready for planning

## What We're Building

A rebuilt book processing app with a clean, Medium-inspired reading experience. The app takes EPUB files, extracts chapters as Markdown, and generates voice-aware blog post summaries that match each book's writing style.

### Phase 1 MVP (Single-user)

- **Upload UI** - Drag-and-drop EPUB upload
- **Processing status** - Show progress as book is processed
- **Library view** - List of uploaded books with covers
- **Reader** - Clean, typography-focused chapter view with AI-generated summaries

### Phase 2 (Multi-user)

- Supabase integration (Postgres + Auth)
- Per-user book storage
- User authentication

## Why This Approach

**Clean Slate rebuild** chosen over incremental refactor because:

1. Current UI components don't match the new vision (15 components to delete)
2. Current artifacts (quizzes, Feynman, schemas, etc.) aren't wanted
3. Faster to build fresh than surgically remove pieces
4. Cleaner architecture without legacy patterns

## Key Decisions

| Decision           | Choice                                     | Rationale                                                   |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------- |
| **Approach**       | Clean Slate                                | No salvageable UI code, fresh start is faster               |
| **Summary style**  | Narrative, voice-matched                   | Summaries should feel like they came from the book's author |
| **Design**         | Medium-inspired, minimal                   | Focus on typography and readability                         |
| **Phase 1 scope**  | Full flow (upload → library → reader)      | Complete experience before adding auth                      |
| **Future backend** | Supabase                                   | Easy auth, Postgres, file storage, scales well              |
| **Keep**           | EPUB → Markdown extraction pipeline        | Core value, works well                                      |
| **Delete**         | All UI components, all artifact generators | Don't match new vision                                      |
| **Summary length** | Adaptive                                   | AI decides based on chapter length/complexity               |
| **Voice analysis** | Once per book                              | Analyze first 2-3 chapters, create reusable voice profile   |
| **Progress UI**    | Simple polling                             | Check status every few seconds, simpler than WebSockets     |

## What to Keep

- `/execution/process_book.py` - Core EPUB extraction (needs simplification)
- `/execution/convert_epub_to_markdown.py` - Markdown conversion
- EPUB parsing logic using `ebooklib`
- Basic project structure (Next.js 16, React 19, Tailwind 4)

## What to Delete

### Components (all 15)

- AIAccordionItem, AIChat, AISidebar
- AccordionPanel, AccordionSection
- BookCard, BookExplorer
- DeepDiveView, DepthPanel
- ImageGallery, LearningInterface, LearningTree
- ProcessButton, QuizMode, VoiceInput

### Python artifact generators

- generate_quizzes.py
- generate_feynman.py
- generate_schemas.py
- generate_projects.py
- generate_inquiry.py
- generate_priming.py
- generate_flight_plan.py
- generate_images.py
- generate_audio_scripts.py
- generate_video_scripts.py
- extract_concepts.py
- aggregate_concepts.py
- aggregate_feynman.py
- extract_stories.py

### Other

- Current page components (will rebuild)
- Current API routes (will rebuild)
- Old documentation files (ARCHITECTURE_OVERVIEW.md, etc.)

## New Architecture

```
Upload EPUB
    ↓
Extract metadata + chapters (Python)
    ↓
Analyze book voice/style (AI)
    ↓
Generate voice-matched chapter summaries (AI)
    ↓
Store in data/books/{bookId}/
    ├── metadata.json (title, author, voice profile)
    ├── chapters.json (chapter list)
    ├── summaries.json (AI-generated summaries)
    └── markdown/ (chapter content)
    ↓
Display in clean reader UI
```

## New Data Structure

```typescript
// Book metadata
interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  voiceProfile: {
    tone: string; // e.g., "conversational", "academic", "storytelling"
    style: string; // e.g., "first-person narrative", "instructional"
    characteristics: string[];
  };
  chapterCount: number;
  createdAt: string;
  processedAt?: string;
  status: "uploading" | "processing" | "ready" | "error";
}

// Chapter with summary
interface Chapter {
  id: string;
  bookId: string;
  number: number;
  title: string;
  markdownPath: string;
  summary: {
    content: string; // The blog-post style summary
    wordCount: number;
  };
}
```

## UI Pages

1. **Home/Library** (`/`) - Grid of book cards, upload button
2. **Book view** (`/book/[id]`) - Chapter list with summaries
3. **Chapter view** (`/book/[id]/chapter/[num]`) - Full chapter + summary

## Design Principles

- **Typography-first** - Readable fonts, good line height, proper measure
- **Minimal chrome** - Content is the focus, not UI elements
- **Clean whitespace** - Let the content breathe
- **Responsive** - Works on mobile and desktop
- **Fast** - Server components where possible, minimal JS

## Resolved Questions

| Question                | Decision       | Details                                                                                                                 |
| ----------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Summary length**      | Adaptive       | AI decides based on chapter length/complexity. Short chapters → short summaries, dense chapters → longer ones.          |
| **Voice analysis**      | Once per book  | Analyze first 2-3 chapters to create a voice profile. Reuse for all chapter summaries. Faster, cheaper, consistent.     |
| **Processing feedback** | Simple polling | Poll `/api/books/{id}/status` every few seconds. Show "Processing chapter X of Y". WebSockets can come later if needed. |

## Next Steps

1. Run `/workflows:plan` to create implementation plan
2. Delete old components and artifacts
3. Build new UI from scratch
4. Simplify Python pipeline for summaries only
5. Test with existing EPUB files

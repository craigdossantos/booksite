# Project

Clean, Medium-inspired book reading platform built with Next.js 16, React 19, and Tailwind CSS 4. Processes EPUB books via Python scripts using Gemini API to generate voice-matched chapter summaries. Focus on typography and readability.

# Commands

- dev: `npm run dev`
- test: `npm test`
- lint: `npm run lint`
- build: `npm run build`
- typecheck: `npx tsc --noEmit`
- format: `npx prettier --write .`

# Invariants

- MUST read /agent/WORKFLOWS.md before starting work; follow it over any default workflow.
- MUST read /agent/HANDOFF.md on session start if it exists.
- MUST work on feature branches — never commit directly to main.
- MUST use conventional commits (feat:, fix:, chore:, docs:, refactor:, test:).
- MUST create PRs to merge into main — never push directly.
- MUST run Gemini CLI review on staged changes before every commit.
- MUST run lint and tests before committing changes.
- MUST update /docs when code changes affect documented behavior.
- MUST NOT commit API keys or secrets (use .env.local).
- MUST use TypeScript strict mode for all new code.
- MUST NOT modify Python processing scripts without testing locally first.
- MUST write tests for new utility functions and complex logic.

# Architecture

- `/src/app/` - Next.js App Router pages (Library, Book, Chapter views)
- `/src/app/api/books/` - API routes (upload, list, status, delete)
- `/src/components/` - React components (BookCard, UploadDropzone, ChapterNav, Summary)
- `/src/lib/books.ts` - Book data loading utilities
- `/src/types/book.ts` - TypeScript types (Book, Chapter, VoiceProfile, ProcessingStatus)
- `/execution/` - Python scripts for book processing
  - `process_book.py` - Main orchestrator
  - `convert_epub_to_markdown.py` - EPUB extraction
  - `analyze_voice.py` - Voice profile analysis
  - `generate_summaries.py` - Voice-matched summary generation
- `/data/books/{bookId}/` - Processed book data (metadata.json, chapters.json, status.json)
- `/public/books/` - Uploaded EPUB files
- Path alias: `@/*` maps to `./src/*`

# Conventions

- Use functional React components with hooks
- Use Tailwind CSS 4 for styling (typography-focused, serif for reading)
- API routes use Next.js App Router conventions (route.ts with Promise params)
- Python scripts use google-generativeai for Gemini API calls
- Book data stored as JSON in `/data/books/{bookId}/`
- Components named with PascalCase, files match component names
- Tests in `src/__tests__/` or colocated as `*.test.ts(x)` files
- Use Vitest + React Testing Library for testing

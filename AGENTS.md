# Booksite - Agent Guidance

**Workflow policy: /agent/WORKFLOWS.md (MUST read before starting work)**

## Project Summary

Clean, Medium-inspired book reading platform. Processes EPUB books and generates voice-matched chapter summaries. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4. Uses Python scripts with Gemini API.

## Quick Commands

| Command                  | Purpose                              |
| ------------------------ | ------------------------------------ |
| `npm run dev`            | Start development server (port 3000) |
| `npm run build`          | Production build                     |
| `npm run lint`           | Run ESLint                           |
| `npm test`               | Run Vitest tests                     |
| `npx tsc --noEmit`       | Type check                           |
| `npx prettier --write .` | Format code                          |

## Book Processing Pipeline

```
EPUB Upload → Extract Markdown → Analyze Voice → Generate Summaries → React UI
```

Python scripts in `/execution/`:

- `process_book.py` - Main orchestrator (coordinates all steps)
- `convert_epub_to_markdown.py` - EPUB extraction
- `analyze_voice.py` - Voice profile analysis (tone, style, complexity)
- `generate_summaries.py` - Voice-matched chapter summaries

## Safety Notes

- Never commit `.env.local` or API keys
- Test Python script changes locally before deploying
- Book processing can take 5-15 minutes per book
- Check `/data/books/{bookId}/status.json` for processing state

## Key Files

| File                                       | Purpose                      |
| ------------------------------------------ | ---------------------------- |
| `src/app/page.tsx`                         | Library view (book list)     |
| `src/app/book/[id]/page.tsx`               | Book detail (chapter list)   |
| `src/app/book/[id]/chapter/[num]/page.tsx` | Chapter reader with summary  |
| `src/components/UploadDropzone.tsx`        | EPUB upload component        |
| `src/components/BookCard.tsx`              | Book card with cover         |
| `src/components/Summary.tsx`               | Collapsible chapter summary  |
| `src/lib/books.ts`                         | Book data loading utilities  |
| `execution/process_book.py`                | Book processing orchestrator |

## Documentation Pointers

- **Constitution**: `CLAUDE.md` (Claude Code), `/agent/CONSTITUTION.md` (tool-agnostic)
- **Workflows**: `/agent/WORKFLOWS.md`
- **Memory**: `/agent/MEMORY.md` (learnings, selectively loaded)
- **Learnings**: `/agent/LEARNINGS.md` (distilled)
- **Plans**: `docs/plans/` (implementation plans)
- **Brainstorms**: `docs/brainstorms/` (design decisions)

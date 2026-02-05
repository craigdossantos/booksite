# Booksite Learning Platform - Agent Guidance

**Workflow policy: /agent/WORKFLOWS.md (MUST read before starting work)**

## Project Summary

AI-powered book learning platform that processes EPUB books and generates interactive learning content. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4. Uses Python scripts with Gemini API for content generation.

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
EPUB Upload → Python Scripts (Gemini API) → JSON Data → React UI
```

Python scripts in `/execution/`:

- `process_book.py` - Main orchestrator
- `convert_epub_to_markdown.py` - EPUB extraction
- `generate_quizzes.py` - Quiz generation
- `generate_feynman.py` - Feynman explanations
- `generate_schemas.py` - Mental models

## Safety Notes

- Never commit `.env.local` or API keys
- Test Python script changes locally before deploying
- Book processing can take 10-15 minutes per book
- Check `/data/books/{bookId}/processing_status.json` for state

## Key Files

| File                                   | Purpose               |
| -------------------------------------- | --------------------- |
| `src/app/page.tsx`                     | Home page / book list |
| `src/app/book/[id]/page.tsx`           | Book reader           |
| `src/components/LearningInterface.tsx` | Main learning UI      |
| `src/components/AIChat.tsx`            | AI chat sidebar       |
| `execution/process_book.py`            | Book processing entry |

## Documentation Pointers

- **Constitution**: `CLAUDE.md` (Claude Code), `/agent/CONSTITUTION.md` (tool-agnostic)
- **Workflows**: `/agent/WORKFLOWS.md`
- **Memory**: `/agent/MEMORY.md` (learnings, selectively loaded)
- **Learnings**: `/agent/LEARNINGS.md` (distilled)
- **Architecture**: `ARCHITECTURE_OVERVIEW.md`, `EXECUTIVE_SUMMARY.md`
- **Implementation**: `IMPLEMENTATION_GUIDE.md`, `QUICK_REFERENCE.md`

# Book Processing Pipeline

The pipeline converts EPUB files into structured chapter data with AI-generated voice-matched summaries.

## Overview

```
EPUB File → Extract Chapters → Extract Cover → Analyze Voice → Generate Summaries → Ready
```

All scripts are in `/execution/` and require Python 3.13+ with the `google-generativeai` package.

## Scripts

### process_book.py (Orchestrator)

Coordinates the full pipeline. Called by the upload API route as a detached subprocess.

```bash
python3 execution/process_book.py <book_id>
```

Updates `data/books/{bookId}/status.json` at each step so the frontend can poll progress.

### convert_epub_to_markdown.py

Extracts chapters from EPUB using `ebooklib`, converts HTML to Markdown with `BeautifulSoup`. Outputs individual `.md` files to `data/books/{bookId}/chapters/`. Filters out files smaller than 50 characters.

### extract_cover.py

Extracts the cover image from the EPUB. Tries `ebooklib` metadata first, falls back to searching the zip archive. Saves as `cover.jpg`. Optional - pipeline continues if extraction fails.

### analyze_voice.py

Reads the first 3 chapters and sends them to **Gemini 2.0 Flash** to create a voice profile:

```json
{
  "tone": "conversational",
  "style": "first-person narrative",
  "complexity": "moderate",
  "characteristics": ["uses anecdotes", "data-driven", "accessible"]
}
```

The voice profile is stored in `metadata.json` and used by summary generation to match the author's style.

### generate_summaries.py

For each chapter, sends the content + voice profile to Gemini to generate a blog-post-style summary that reads as if written by the original author.

Summary length scales with chapter length:

| Chapter Words | Target Summary |
| ------------- | -------------- |
| < 1,000       | 125 words      |
| 1,000 - 3,000 | 250 words      |
| 3,000 - 8,000 | 400 words      |
| > 8,000       | 600 words      |

Outputs to `chapters.json`. Resume-friendly: skips chapters that already have summaries.

### filter_chapters.py

Removes junk chapters (TOC, copyright, dedication, index, etc.) and cleans titles. Not currently used in the main pipeline.

## Output Structure

```
data/books/{bookId}/
  metadata.json     # { id, title, author, voiceProfile, coverUrl, status }
  status.json       # { status, progress, currentStep, chaptersProcessed, totalChapters }
  chapters.json     # [{ number, title, markdownPath, wordCount, summary }]
  cover.jpg         # Extracted cover image
  chapters/         # Individual chapter markdown files
    00_Chapter0.md
    01_Chapter1.md
    ...
```

## Environment Requirements

- Python 3.13+
- `google-generativeai` package (install via `pip install google-generativeai`)
- `GEMINI_API_KEY` environment variable
- Virtual environment at `./venv/`

## Running Manually

```bash
# Activate virtual environment
source venv/bin/activate

# Process a single book
python3 execution/process_book.py <book_id>

# Or run individual steps
python3 execution/convert_epub_to_markdown.py <book_id>
python3 execution/extract_cover.py <book_id>
python3 execution/analyze_voice.py <book_id>
python3 execution/generate_summaries.py <book_id>
```

## Limitations

- Processing runs locally only (not on Vercel - Python not available)
- Gemini API rate limits may affect large books
- No queue system - one book processes at a time per server
- EPUB files with DRM cannot be processed

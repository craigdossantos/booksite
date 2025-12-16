---
title: "Process Chapter Button - On-Demand AI Chapter Analysis"
category: "feature-implementation"
symptoms:
  - Book chapters displayed without content or summary
  - Users unable to view chapter details after initial import
  - No way to trigger epub-to-markdown processing from website UI
  - Manual script execution required for chapter processing
root_cause: "Chapters imported from EPUB files were not processed through the AI analysis pipeline, leaving them without extracted content and summaries"
solution: "Implemented 'Process Chapter' button in the website UI to trigger server-side Gemini AI processing of unprocessed chapters directly from the browser"
components:
  - "/src/app/api/process-chapter/route.ts"
  - "/src/components/DepthPanel.tsx"
  - "/src/components/BookExplorer.tsx"
tags:
  - "ui-feature"
  - "chapter-processing"
  - "gemini-ai"
  - "user-experience"
  - "api-endpoint"
  - "on-demand-processing"
severity: "low"
date: "2025-12-10"
status: "completed"
---

# Process Chapter Button - On-Demand AI Chapter Analysis

## Problem

Users encountered book chapters (like "Tactical Empathy Toolbox" in "The Full Fee Agent") that displayed no content - no summary, stories, or learning objectives. The chapter existed in the book's manifest but had not been processed through the AI analysis pipeline.

Previously, processing required manually running Python scripts from the command line, which was not accessible to end users.

## Solution Overview

Added a "Process Chapter" button to the UI that allows users to trigger AI-powered chapter analysis directly from the website. When a user views an unprocessed chapter, they see a clear message with a button to process it on-demand.

## Implementation

### 1. API Endpoint: `/api/process-chapter/route.ts`

Created a new Next.js API route that:
- Accepts POST requests with `bookId`, `chapterId`, and `chapterTitle`
- Reads chapter markdown content from disk
- Spawns a Python process that calls Gemini AI for analysis
- Updates `content.json` with the AI-generated summary, stories, and learning objectives
- Returns the processed chapter data

**Key code:**

```typescript
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { bookId, chapterId, chapterTitle } = await req.json();

  // Read chapter markdown
  const chapterContent = await fs.readFile(chapterPath, "utf-8");

  // Execute Python script with Gemini AI
  const pythonProcess = spawn("python3", ["-c", scriptContent], {
    env: { ...process.env, PYTHONPATH: sitePackages },
  });

  // Update content.json with results
  const updatedChapter = {
    id: chapterId,
    title: chapterTitle,
    ...result,  // summary, stories, learningObjectives
  };

  await fs.writeFile(contentPath, JSON.stringify(contentData, null, 2));

  return NextResponse.json({ success: true, chapter: updatedChapter });
}
```

### 2. DepthPanel Component Updates

Added processing state and UI to `DepthPanel.tsx`:

**Props added:**
```typescript
interface DepthPanelProps {
  bookId?: string;
  onChapterProcessed?: (chapter: ChapterData) => void;
  // ... existing props
}
```

**Detection logic:**
```typescript
const needsProcessing = type === 'chapter' && chapter && !chapter.summary;
```

**Handler function:**
```typescript
const handleProcessChapter = useCallback(async () => {
  setIsProcessing(true);
  setProcessingError(null);

  try {
    const response = await fetch('/api/process-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, chapterId: chapter.id, chapterTitle: chapter.title }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    if (data.chapter && onChapterProcessed) {
      onChapterProcessed(data.chapter);
    }
  } catch (error) {
    setProcessingError(error.message);
  } finally {
    setIsProcessing(false);
  }
}, [bookId, chapter, onChapterProcessed]);
```

### 3. BookExplorer Integration

Updated `BookExplorer.tsx` to pass required props:

```typescript
<DepthPanel
  type="chapter"
  bookId={bookId}
  chapter={selectedChapter}
  onChapterProcessed={() => {
    router.refresh();
  }}
  // ... other props
/>
```

## Data Flow

```
User clicks "Process Chapter"
         |
         v
handleProcessChapter() in DepthPanel
         |
         v
POST /api/process-chapter
         |
         v
API reads chapter markdown from disk
         |
         v
Python process spawned with Gemini API
         |
         v
Gemini returns: summary, stories, learningObjectives
         |
         v
API updates content.json on disk
         |
         v
Success response returned to frontend
         |
         v
onChapterProcessed() callback triggers router.refresh()
         |
         v
Page reloads with processed content
```

## UI States

1. **Unprocessed State**: Shows "Chapter Not Processed Yet" card with Process button
2. **Processing State**: Shows spinner with "Processing with AI..." text, button disabled
3. **Error State**: Shows error message in red, allows retry
4. **Success State**: Page refreshes with full chapter content

## Files Modified

| File | Changes |
|------|---------|
| `src/app/api/process-chapter/route.ts` | Created - API endpoint |
| `src/components/DepthPanel.tsx` | Added processing UI and logic |
| `src/components/BookExplorer.tsx` | Added bookId and callback props |

## Related Files

- `execution/process_book.py` - Full book processing script
- `data/books/{bookId}/content.json` - Data file updated by API
- `data/books/{bookId}/chapters.json` - Chapter manifest
- `directives/process_book.md` - SOP documentation

## Environment Requirements

- `GEMINI_API_KEY` environment variable must be set
- Python 3.x with `google-generativeai` package installed
- Virtual environment at `./venv/`

## Prevention Strategies

1. **Batch Processing**: Run full book processing after import to ensure all chapters are analyzed
2. **Progress Indicators**: Show which chapters need processing in the book overview
3. **Auto-Processing**: Consider background processing queue for new imports
4. **Validation**: Add pre-flight check for unprocessed chapters during book import

## Testing Considerations

1. Test with chapters of varying lengths (short, long, empty)
2. Verify error handling when Gemini API is unavailable
3. Test concurrent processing requests
4. Verify content.json updates correctly (doesn't corrupt existing data)
5. Test UI states (loading, error, success)

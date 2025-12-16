# Book Processing Pipeline Architecture Overview

## Current State Analysis

### Existing Pipeline

```
User Uploads EPUB
       ↓
public/books/{filename}
       ↓
POST /api/process-book
       ↓
spawn python3 execution/process_book.py --filename {filename}
       ↓
Extract book metadata
Extract chapters (EPUB or markdown files)
For each chapter:
  ├─ Get text content
  └─ Call Gemini API to analyze
       ├─ Summary
       ├─ Stories
       ├─ Learning objectives
       └─ Visual prompts
       ↓
Save to data/books/{bookId}/content.json
       ↓
User can view book
```

### Current Pain Points

1. **No Status Tracking** - Users don't know if processing succeeded/failed
2. **No Progress Updates** - Long wait with no feedback
3. **Manual Triggering** - Must click button to start processing
4. **Failure Handling** - Failed chapters not retried or logged
5. **Partial Processing** - Can't resume from where it failed
6. **No Validation** - Serves empty chapters without warning
7. **No Automation** - Every book must be manually processed

## Proposed Enhanced Architecture

### Layer 1: Detection & Validation

```
Book Display Request
       ↓
validateBook(bookId)
  ├─ Check required files exist
  ├─ Verify content.json structure
  ├─ Check for empty chapters
  ├─ Read processing_status.json
  └─ Return validation result
       ↓
Route Based on Status:
  ├─ Valid (100%) → Display normally
  ├─ Processing → Show progress
  ├─ Failed → Show error + retry button
  └─ Incomplete → Show completion % + resume button
```

### Layer 2: Processing Status Tracking

```
processing_status.json (per book)
{
  bookId: "abc123",
  processingState: "complete" | "in-progress" | "partial" | "failed",
  startedAt: "ISO timestamp",
  completedAt: "ISO timestamp",
  chaptersProcessed: 15,
  chaptersTotal: 20,
  chaptersFailed: ["ch5.md", "ch12.md"],
  phases: {
    phase1_basic: true,
    phase2_content: true,
    phase3_assessments: false,
    phase4_enhanced: false
  },
  errorLog: [
    {
      chapter: "ch5.md",
      phase: 2,
      error: "API rate limit",
      timestamp: "ISO timestamp",
      retryCount: 2
    }
  ]
}
```

### Layer 3: Processing Pipeline

```
Phase 1: Basic Metadata (Fast)
├─ Extract title, author
├─ Create chapters.json manifest
├─ Store in data/books/{bookId}/
└─ User sees book with chapter titles

Phase 2: Core Content (Slow - 30s per chapter)
├─ Process each chapter via Gemini
├─ Generate summaries
├─ Extract stories
├─ Create learning objectives
├─ Store in content.json
└─ User can start reading/learning

Phase 3: Assessments (Medium - 10s per chapter)
├─ Generate quizzes
├─ Extract key concepts
├─ Build concept graph
└─ User can test knowledge

Phase 4: Enhanced Features (Optional)
├─ Generate Feynman explanations
├─ Create mental models
├─ Design projects
├─ Generate visual prompts
└─ User unlocks advanced modes
```

### Layer 4: Automation & Resilience

```
Trigger Points:
├─ File watching: New EPUB detected → Auto-queue
├─ Scheduled: 2 AM nightly → Process unprocessed books
├─ Manual: User clicks button → High priority queue
└─ Resume: User navigates to partial book → Continue

Job Queue (Bull + Redis):
├─ Concurrency control (e.g., 2 books in parallel)
├─ Priority handling (high/normal/low)
├─ Automatic retries (exponential backoff)
├─ Progress tracking
└─ Failure logging

Error Handling:
├─ Rate limit → Wait and retry
├─ API error → Backoff and retry
├─ Invalid chapter → Log and continue
├─ Corruption → Use backup and retry
└─ Fatal error → Mark as failed, notify admin
```

## Data Flow Diagrams

### User Encounter with Unprocessed Chapter (Current)

```
User opens book page
    ↓
Load chapters from content.json
    ↓
Display chapter ← [NO DATA - empty fields]
    ↓
User sees empty content
    ↓
User confused! :(
```

### User Encounter with Unprocessed Chapter (Proposed)

```
User opens book page
    ↓
Validate book status
    ↓
Check processing_status.json
    ↓
processingState = "incomplete"
    ↓
Show: "Book 35% processed"
      [Resume Processing] button
    ↓
User clicks button
    ↓
High-priority queue job
    ↓
Processing resumes from chapter 8
    ↓
WebSocket progress update
    ↓
Completion → User directed to content
    ↓
User happy! :)
```

## File Structure

```
data/books/{bookId}/
├─ metadata.json              ← Basic book info
├─ content.json              ← Chapter content (main file)
├─ chapters.json             ← Chapter manifest (source of truth)
├─ processing_status.json    ← Processing state (NEW)
├─ quizzes.json             ← Generated quizzes
├─ master_concepts.json     ← Key concepts
├─ feynman_book.json        ← Feynman explanations
├─ feynman.json             ← Feynman per chapter
├─ schemas.json             ← Mental models
├─ projects.json            ← Project ideas
├─ generated_images.json    ← Visual metaphors
├─ markdown/
│  ├─ chapter_1.md
│  ├─ chapter_2.md
│  └─ ...
└─ logs/
   ├─ processing_2025-12-10.log
   └─ errors.log
```

## API Changes Required

### New Endpoints

```
GET /api/books/{bookId}/status
  Returns: { validation, processingStatus, completionPercentage }

POST /api/books/{bookId}/process
  Body: { phases?: number[], priority?: "high"|"normal"|"low" }
  Returns: { jobId, estimatedTime }

GET /api/jobs/{jobId}/progress
  Returns: { progress, status, chaptersProcessed, eta }

POST /api/books/{bookId}/resume
  Returns: { jobId, continuingFromChapter }

WebSocket /ws/books/{bookId}/progress
  Event: { type: "progress", percentage, chaptersProcessed, currentChapter }
```

### Modified Endpoints

```
GET /api/books/{bookId}
  Added: validation field showing processing status

POST /api/process-book (existing)
  Updated: Now creates job queue entry instead of direct spawn
  Returns: { jobId, status: "queued", estimatedTime }
```

## State Machine

```
                 ┌──────────────┐
                 │  UNPROCESSED │ ← Book uploaded, no status file
                 └──────┬───────┘
                        │ User clicks "Process"
                        ▼
                 ┌──────────────┐
                 │   QUEUED     │ ← Job added to queue
                 └──────┬───────┘
                        │ Job picked up by worker
                        ▼
                 ┌──────────────┐
                 │ IN_PROGRESS  │ ← Phases 1-2 running
                 └──┬─────────┬─┘
                    │         │
          Error ────┘         └─── Success
            │                      │
            ▼                      ▼
      ┌─────────────┐       ┌────────────┐
      │   FAILED    │       │  COMPLETE  │ ← All phases done
      └─────┬───────┘       └────────────┘
            │
            │ User clicks "Retry"
            ▼
      ┌─────────────┐
      │   QUEUED    │ ← Re-enter queue
      └─────────────┘

      (PARTIAL state: Phases complete but some chapters failed)
      └─ User can resume to retry failed chapters
```

## Key Design Decisions

### 1. Idempotent Processing
- **Principle**: Safe to run processing multiple times
- **Implementation**: Always check existing chapters before re-processing
- **Benefit**: Can resume safely without data loss

### 2. Manifest-Based Processing
- **Principle**: chapters.json is source of truth for what to process
- **Implementation**: Process from markdown files listed in manifest
- **Benefit**: Curation possible; avoid processing ads/metadata from EPUB

### 3. Atomic File Writes
- **Principle**: Temporary file → validate → atomic rename
- **Implementation**: Write to .tmp, verify JSON, mv atomically
- **Benefit**: Prevents partial/corrupted files on failure

### 4. Phase-Based Processing
- **Principle**: Provide user value incrementally
- **Implementation**: Phase 1 (metadata) fastest, Phase 4 (optional)
- **Benefit**: Users see chapters immediately, enhanced features later

### 5. Explicit Status Tracking
- **Principle**: Never rely on file existence alone for state
- **Implementation**: Dedicated processing_status.json
- **Benefit**: Clear visibility into processing state

## Technology Recommendations

### For Job Queue
- **Technology**: Bull (Node.js queue library)
- **Backing Store**: Redis (simple, fast)
- **Why**:
  - Zero maintenance (no separate service needed)
  - Built for job processing
  - Excellent retry/backoff support
  - Progress tracking
  - Integrates with Next.js easily

### For File Watching
- **Technology**: chokidar
- **Why**:
  - Production-ready
  - Works cross-platform
  - Handles file system quirks
  - Low overhead

### For WebSocket Progress
- **Technology**: Socket.io or native WebSockets
- **Backing**: Redis for pub/sub across multiple servers
- **Why**:
  - Real-time communication
  - Scales to multiple workers
  - Falls back to polling if needed

## Performance Targets

| Operation | Current | Target |
|-----------|---------|--------|
| Per chapter processing | 30-45s | 25-35s |
| 20-chapter book | 10-15 min | 8-12 min |
| Resume after failure | Full reprocess | 2-3 min |
| Status check | N/A | <100ms |
| Validation check | N/A | <50ms |

## Scalability Considerations

### Current Limitations
- Single-threaded (one book at a time)
- Blocking HTTP request
- No progress visibility
- Manual trigger required

### Proposed Solution
- Queue allows parallel processing (configurable concurrency)
- Async job processing
- Real-time progress via WebSocket
- Auto-detection and scheduled processing

### Future Scaling
1. **Multi-worker**: Multiple job queue workers
2. **API optimization**: Batch Gemini requests
3. **Caching**: Cache similar analyses
4. **Partial processing**: Process only changed chapters

## Migration Path

### Step 1: Add Status Tracking (Low Risk)
- Add processing_status.json creation
- Update Python script to write status
- No UI changes required

### Step 2: Add Validation (Low Risk)
- Implement validateBook() function
- Add validation checks to book page
- Show warning for incomplete books

### Step 3: Implement Job Queue (Medium Risk)
- Set up Redis + Bull
- Create job handler
- Gradual migration from direct spawn

### Step 4: Add Real-time Updates (Medium Risk)
- WebSocket server
- Client-side progress display
- Fallback to polling

### Step 5: Automation (Low Risk)
- File watching service
- Scheduled processing cron
- Both can be enabled independently

## Monitoring & Observability

### Key Metrics
```
Processing Pipeline
├─ Books queued: number
├─ Books in progress: number
├─ Books completed today: number
├─ Books failed: number
├─ Average time per chapter: duration
├─ API rate limit status: percentage
└─ Queue age (oldest job): duration

Data Quality
├─ Books with complete content: percentage
├─ Chapters with empty content: number
├─ Data consistency violations: number
└─ Last consistency check: timestamp

User Impact
├─ Avg time to first content: duration
├─ Books ready vs unprocessed: ratio
├─ User processing requests today: number
└─ Processing failures: number
```

### Alerting Rules
```
CRITICAL:
- Failed books > 5%
- Data consistency violations detected
- Job queue backup > 100 jobs
- Redis connection lost

WARNING:
- Processing time > 30s per chapter
- Failed jobs > 10%
- Queue age > 1 hour
- API rate limit near (>80%)

INFO:
- Processing completed
- New books detected
- Auto-processing started
```

## Conclusion

This architecture provides:

1. **Reliability**: Status tracking, error recovery, validation
2. **User Experience**: Progress visibility, clear feedback
3. **Scalability**: Job queue, parallel processing
4. **Maintainability**: Clear separation of concerns, atomic operations
5. **Flexibility**: Phased processing, optional features
6. **Resilience**: Partial failures don't block progress

The implementation can proceed in phases without breaking existing functionality.

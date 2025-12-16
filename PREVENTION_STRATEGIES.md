# Prevention Strategies for Unprocessed Chapters Problem

## Overview

This document outlines comprehensive prevention strategies to avoid the "unprocessed chapters" problem where users encounter chapters with no content because the processing pipeline hadn't been run.

**Current Problem**: Users could access a book and see chapter titles but no content because:
- Processing script hadn't been executed
- Partial processing left some chapters without data
- No visibility into processing status
- No automatic processing triggers

**Current Solution**: On-demand processing button (generates study guide)

---

## 1. Prevention Strategies

### 1.1 Pre-Flight Validation

**Purpose**: Detect unprocessed chapters before users encounter them

```typescript
// Check processing status when book is loaded
async function validateBookCompletion(bookId: string): Promise<ValidationResult> {
  const dataDir = path.join(process.cwd(), "data", "books", bookId);

  const requiredFiles = [
    "metadata.json",
    "content.json",
    "chapters.json"
  ];

  const missingFiles: string[] = [];

  for (const file of requiredFiles) {
    if (!await fs.pathExists(path.join(dataDir, file))) {
      missingFiles.push(file);
    }
  }

  return {
    isComplete: missingFiles.length === 0,
    missingFiles,
    requiresProcessing: missingFiles.length > 0
  };
}
```

**Implementation Points**:
- Run validation on page load for each book
- Flag books that need processing
- Prevent chapter navigation if content is unavailable

### 1.2 Content Availability Detection

**Purpose**: Identify empty or incomplete chapters programmatically

```typescript
// Scan chapters for empty content
async function detectEmptyChapters(
  bookId: string,
  chapters: ChapterData[]
): Promise<EmptyChapterReport> {
  const emptyChapters = chapters.filter(chapter =>
    !chapter.summary ||
    chapter.summary.length < 50 ||
    !chapter.stories ||
    chapter.stories.length === 0
  );

  return {
    totalChapters: chapters.length,
    emptyCount: emptyChapters.length,
    completionPercentage: ((chapters.length - emptyChapters.length) / chapters.length) * 100,
    emptyChapterIds: emptyChapters.map(c => c.id)
  };
}
```

**Key Checks**:
- Summary is present and has minimum length
- Stories/examples are populated
- Learning objectives are included
- Visual prompts exist
- All required schema fields are populated

### 1.3 Processing Status Tracking

**Purpose**: Maintain a processing state file for each book

```json
{
  "bookId": "abc123",
  "processingStatus": "complete" | "in-progress" | "partial" | "failed",
  "lastProcessedAt": "2025-12-10T10:30:00Z",
  "chaptersProcessed": 15,
  "chaptersTotal": 20,
  "failedChapters": ["chapter_5.md"],
  "errorLog": [
    {
      "chapter": "chapter_5.md",
      "error": "API rate limit exceeded",
      "timestamp": "2025-12-10T10:25:00Z"
    }
  ]
}
```

**Advantages**:
- Single source of truth for processing state
- Enables resume capability
- Tracks partial failures
- Provides user visibility

### 1.4 User-Facing Status Indicators

**Purpose**: Show users immediately if content is unavailable

```typescript
interface BookStatus {
  processingState: "complete" | "partial" | "unprocessed" | "failed";
  completionPercentage: number;
  lastUpdated: string;
  nextAction: "process" | "resume" | "retry" | "none";
}

// Display on book card and book page
function BookStatusBadge({ status }: { status: BookStatus }) {
  const statusConfig = {
    complete: { color: "emerald", label: "Ready to Learn", icon: "✓" },
    partial: { color: "amber", label: "Partially Processed", icon: "⚠" },
    unprocessed: { color: "blue", label: "Processing Required", icon: "↻" },
    failed: { color: "red", label: "Processing Failed", icon: "✕" }
  };

  return (
    <div className={`badge badge-${statusConfig[status.processingState].color}`}>
      {statusConfig[status.processingState].icon} {statusConfig[status.processingState].label}
    </div>
  );
}
```

### 1.5 Early Validation During Import

**Purpose**: Process books immediately upon upload

```typescript
// When book is added to public/books/
async function onBookAdded(filename: string) {
  // 1. Extract metadata
  const metadata = await extractBookMetadata(filename);

  // 2. Create processing state file
  await createProcessingState(metadata.bookId, {
    status: "queued",
    queuedAt: new Date().toISOString()
  });

  // 3. Queue for processing
  await enqueueBookProcessing(filename);

  // 4. Notify user
  return {
    bookId: metadata.bookId,
    status: "processing_started",
    estimatedTime: "15-30 minutes"
  };
}
```

---

## 2. Best Practices for Book Processing Pipeline

### 2.1 Pipeline Idempotency

**Principle**: Running the pipeline multiple times should be safe and resume-friendly

```python
def process_book(filename, limit=None):
    """
    BEST PRACTICE: Load existing chapters to avoid re-processing
    """
    output_dir = os.path.join(base_dir, "data", "books", get_book_id(filename))
    output_path = os.path.join(output_dir, "content.json")

    # Load existing data
    existing_chapters = {}
    if os.path.exists(output_path):
        try:
            with open(output_path, "r") as f:
                existing_data = json.load(f)
                for ch in existing_data.get("chapters", []):
                    existing_chapters[ch["id"]] = ch
        except Exception as e:
            log_error(f"Error loading existing content: {e}")

    # Process only new chapters
    for item in items_to_process:
        chapter_id = os.path.basename(item['path'])

        # Skip already processed chapters
        if chapter_id in existing_chapters:
            print(f"Skipping already processed chapter: {chapter_title}")
            processed_chapters.append(existing_chapters[chapter_id])
            continue

        # Process new chapter
        analysis = analyze_chapter(chapter_title, content)
        processed_chapters.append(analysis)
```

**Key Practices**:
1. Always check for existing processed chapters before re-processing
2. Skip chapters that have complete data
3. Merge new data with existing data
4. Never overwrite without verification

### 2.2 Atomic File Operations

**Principle**: Use temporary files and atomic writes to prevent corruption

```typescript
// Current approach: Direct file write (risky)
await fs.writeFile(contentPath, JSON.stringify(data), "utf-8");

// BETTER: Atomic write
async function atomicWriteJson(path: string, data: any): Promise<void> {
  const tmpPath = `${path}.tmp`;

  try {
    // Write to temporary file first
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");

    // Verify it's valid JSON
    JSON.parse(await fs.readFile(tmpPath, "utf-8"));

    // Atomic rename
    await fs.move(tmpPath, path, { overwrite: true });
  } catch (error) {
    // Clean up temp file
    await fs.remove(tmpPath);
    throw error;
  }
}
```

### 2.3 Manifest-Based Processing

**Principle**: Use chapters.json as the source of truth

**Current Implementation** (GOOD):
```python
# Check for chapters.json manifest
chapters_manifest_path = os.path.join(base_dir, "data", "books", get_book_id(filename), "chapters.json")

if os.path.exists(chapters_manifest_path):
    print(f"Using filtered chapters from {chapters_manifest_path}")
    with open(chapters_manifest_path, "r") as f:
        manifest = json.load(f)

    for item in manifest:
        chapter_title = item['title']
        file_path = item['path']
        # Process from markdown files
```

**Why This Works**:
- Markdown files are the source content
- chapters.json lists what should be processed
- Avoids processing navigation, ads, or metadata from EPUB
- Allows filtering/curation before processing

### 2.4 Chapter Content Validation

**Principle**: Verify chapter quality before marking as complete

```python
def validate_chapter_content(analysis: dict, content_length: int) -> tuple[bool, list[str]]:
    """
    Validate that chapter analysis meets minimum standards
    Returns: (is_valid, error_messages)
    """
    errors = []

    # Content length check
    if content_length < 50:
        errors.append("Chapter content too short (< 50 chars)")

    # Schema validation
    required_fields = ["summary", "stories", "learningObjectives", "visualPrompts"]
    for field in required_fields:
        if field not in analysis:
            errors.append(f"Missing required field: {field}")
        elif isinstance(analysis[field], (list, str)):
            if len(analysis[field]) == 0:
                errors.append(f"Empty field: {field}")

    # Story structure validation
    if "stories" in analysis:
        for idx, story in enumerate(analysis["stories"]):
            if not all(k in story for k in ["title", "description", "lesson"]):
                errors.append(f"Story {idx} missing required fields")

    return len(errors) == 0, errors
```

### 2.5 Progressive Processing

**Principle**: Process in phases to provide value incrementally

```
Phase 1 (CRITICAL): Extract metadata + basic chapters
├─ Metadata (title, author)
├─ Chapter list with titles
└─ Basic chapter content

Phase 2 (HIGH): Generate summaries and stories
├─ Chapter summaries
├─ Key stories/examples
└─ Learning objectives

Phase 3 (MEDIUM): Generate quizzes and concepts
├─ Quiz questions
├─ Key concepts
└─ Concept graph

Phase 4 (NICE-TO-HAVE): Generate advanced features
├─ Feynman explanations
├─ Mental models/schemas
├─ Projects
└─ Visual metaphors
```

**Implementation**:
```python
def process_book_phases(filename, max_chapters=None):
    """Process book in phases for faster user value"""

    # Phase 1: Always run first
    phase1_data = extract_basic_metadata(filename)
    save_processing_state(phase1_data["bookId"], "phase1_complete")

    # Phase 2: Core content
    if should_continue_processing():
        phase2_data = generate_chapter_content(filename, max_chapters)
        save_processing_state(phase1_data["bookId"], "phase2_complete")

    # Phase 3: Assessments
    if should_continue_processing():
        phase3_data = generate_quizzes_and_concepts(filename)
        save_processing_state(phase1_data["bookId"], "phase3_complete")

    # Phase 4: Enhanced features
    if should_continue_processing():
        phase4_data = generate_advanced_features(filename)
        save_processing_state(phase1_data["bookId"], "phase4_complete")
```

### 2.6 Error Handling and Recovery

**Principle**: Graceful degradation with detailed logging

```python
def process_chapter_with_recovery(chapter_data: dict, retry_count=0, max_retries=3):
    """
    Process chapter with exponential backoff retry
    """
    try:
        analysis = analyze_chapter(chapter_data["title"], chapter_data["content"])

        # Validate result
        is_valid, errors = validate_chapter_content(analysis, len(chapter_data["content"]))
        if not is_valid:
            raise ValueError(f"Validation failed: {errors}")

        return {
            "status": "success",
            "data": analysis,
            "processedAt": datetime.now().isoformat()
        }

    except RateLimitError as e:
        if retry_count < max_retries:
            wait_time = (2 ** retry_count) * 60  # Exponential backoff
            log_warning(f"Rate limited. Retrying in {wait_time}s...")
            time.sleep(wait_time)
            return process_chapter_with_recovery(chapter_data, retry_count + 1, max_retries)
        else:
            return {
                "status": "failed",
                "error": "Rate limit exceeded after retries",
                "chapter_id": chapter_data["id"]
            }

    except Exception as e:
        return {
            "status": "failed",
            "error": str(e),
            "chapter_id": chapter_data["id"],
            "timestamp": datetime.now().isoformat()
        }
```

### 2.7 Data Consistency Checks

**Principle**: Verify data integrity before serving to users

```typescript
async function verifyBookDataConsistency(bookId: string): Promise<ConsistencyReport> {
  const dataDir = path.join(process.cwd(), "data", "books", bookId);

  const checks = {
    metadataValid: false,
    contentValid: false,
    chapterCountMatch: false,
    allChaptersHaveContent: false,
    referencesResolved: false
  };

  try {
    // Check 1: Metadata file
    const metadata = await fs.readJson(path.join(dataDir, "metadata.json"));
    checks.metadataValid = !!metadata.title && !!metadata.author;

    // Check 2: Content file structure
    const content = await fs.readJson(path.join(dataDir, "content.json"));
    checks.contentValid = Array.isArray(content.chapters);

    // Check 3: Chapter count consistency
    const chapters = await fs.readJson(path.join(dataDir, "chapters.json"));
    checks.chapterCountMatch = chapters.length === content.chapters.length;

    // Check 4: All chapters have required fields
    checks.allChaptersHaveContent = content.chapters.every(ch =>
      ch.id && ch.title && ch.summary && ch.stories && ch.learningObjectives
    );

    // Check 5: Quizzes reference valid chapters
    const quizzes = await fs.readJson(path.join(dataDir, "quizzes.json"));
    const chapterIds = new Set(content.chapters.map(c => c.id));
    checks.referencesResolved = quizzes.every(q =>
      chapterIds.has(q.source_chapter)
    );

  } catch (error) {
    console.error(`Consistency check failed for ${bookId}:`, error);
  }

  return {
    bookId,
    checks,
    isConsistent: Object.values(checks).every(v => v),
    timestamp: new Date().toISOString()
  };
}
```

---

## 3. Potential Improvements

### 3.1 Batch Processing with Job Queues

**Current Limitation**: Processing triggered manually or on-demand

**Improvement**: Implement a job queue system

```typescript
// job-queue.ts
import Bull from "bull";

const bookProcessingQueue = new Bull("book-processing", {
  redis: { host: "127.0.0.1", port: 6379 }
});

// Queue a book for processing
export async function queueBookProcessing(filename: string, priority: "high" | "normal" | "low" = "normal") {
  const job = await bookProcessingQueue.add(
    { filename },
    {
      priority: priority === "high" ? 1 : priority === "normal" ? 5 : 10,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true
    }
  );

  return { jobId: job.id, status: "queued" };
}

// Process jobs with concurrency control
bookProcessingQueue.process(2, async (job) => {
  try {
    const { filename } = job.data;

    // Report progress
    job.progress(0);

    // Extract metadata
    const metadata = await extractMetadata(filename);
    job.progress(10);

    // Process chapters with progress updates
    for (let i = 0; i < chapters.length; i++) {
      await processChapter(chapters[i]);
      job.progress(Math.floor((i / chapters.length) * 80) + 10);
    }

    // Generate quizzes and other features
    await generateQuizzes(filename);
    job.progress(90);

    await generateConcepts(filename);
    job.progress(100);

    return { success: true, bookId: metadata.bookId };
  } catch (error) {
    throw error; // Will trigger retry
  }
});
```

**Benefits**:
- Parallel processing of multiple books
- Progress tracking and visibility
- Automatic retry on failure
- Priority-based processing
- Resilience to server restarts

### 3.2 Auto-Detection with File Watching

**Current Limitation**: Must manually upload and run processing

**Improvement**: Watch public/books directory for new files

```typescript
import { watch } from "chokidar";

// Watch for new EPUB files
const watcher = watch(path.join(process.cwd(), "public", "books"), {
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  }
});

watcher.on("add", async (filePath) => {
  if (path.extname(filePath) === ".epub") {
    const filename = path.basename(filePath);
    console.log(`New book detected: ${filename}`);

    // Auto-queue for processing
    await queueBookProcessing(filename, "high");

    // Notify admin
    await notifyAdmin({
      event: "new_book_detected",
      filename,
      autoQueued: true
    });
  }
});

// Optional: Delete event handling
watcher.on("unlink", async (filePath) => {
  const bookId = await getBookIdFromPath(filePath);
  await markBookAsDeleted(bookId);
});
```

### 3.3 Scheduled Background Processing

**Purpose**: Process books during off-peak hours

```typescript
import cron from "node-cron";

// Run book processing at 2 AM daily
cron.schedule("0 2 * * *", async () => {
  console.log("Starting nightly book processing...");

  const unprocessedBooks = await getUnprocessedBooks();

  for (const book of unprocessedBooks) {
    // Process with lower priority during off-peak
    await queueBookProcessing(book.filename, "normal");
  }
});

// Retry failed processing jobs every 6 hours
cron.schedule("0 */6 * * *", async () => {
  const failedJobs = await getFailedProcessingJobs();

  for (const job of failedJobs) {
    if (job.retryCount < 3) {
      await queueBookProcessing(job.filename, "low");
    }
  }
});
```

### 3.4 Partial Content Serving

**Current**: Require complete processing before display

**Improvement**: Serve content as it becomes available

```typescript
interface ChapterWithStatus {
  id: string;
  title: string;
  processingStatus: "complete" | "in-progress" | "pending" | "failed";

  // Content available immediately
  content?: string;

  // Content generated later
  summary?: string;
  stories?: Story[];
  learningObjectives?: string[];
}

// When chapter is in-progress:
// 1. Show basic chapter content
// 2. Display "Summary being generated..." placeholder
// 3. Update UI when summary arrives via WebSocket
// 4. Show full content when processing completes
```

### 3.5 User Notifications

**Improvement**: Keep users informed of processing status

```typescript
// Processing started notification
async function notifyProcessingStarted(bookId: string) {
  await sendNotification({
    type: "book_processing_started",
    bookId,
    title: "Processing started",
    message: "Your book is being processed. This may take 15-30 minutes.",
    action: { url: `/book/${bookId}`, label: "View Book" }
  });
}

// Progress update
async function updateProcessingProgress(bookId: string, progress: number) {
  await redis.set(`processing:${bookId}:progress`, progress);

  // WebSocket broadcast to connected clients
  io.emit(`book:${bookId}:progress`, { percentage: progress });
}

// Completion notification
async function notifyProcessingComplete(bookId: string) {
  await sendNotification({
    type: "book_processing_complete",
    bookId,
    title: "Your book is ready!",
    message: "All features are now available.",
    action: { url: `/book/${bookId}`, label: "Start Learning" }
  });
}
```

### 3.6 Differential Processing

**Purpose**: Only process chapters that changed or failed

```typescript
async function diffentialProcessBook(filename: string) {
  const bookId = getBookIdFromFilename(filename);
  const previousHash = await getPreviousBookHash(bookId);
  const currentHash = await calculateBookHash(filename);

  if (previousHash === currentHash) {
    console.log("Book unchanged, skipping processing");
    return { status: "unchanged" };
  }

  // Extract chapters
  const chapters = await extractChapters(filename);

  // Find chapters that changed
  const previousChapters = await getPreviousChapters(bookId);
  const changedChapters = chapters.filter(ch => {
    const prev = previousChapters.find(p => p.id === ch.id);
    return !prev || ch.content_hash !== prev.content_hash;
  });

  // Only process changed chapters + failed chapters
  const failedChapters = await getPreviouslyFailedChapters(bookId);
  const toProcess = [
    ...changedChapters,
    ...failedChapters.filter(f => !changedChapters.some(c => c.id === f.id))
  ];

  console.log(`Processing ${toProcess.length} changed/failed chapters`);

  for (const chapter of toProcess) {
    await processChapterIndividual(bookId, chapter);
  }

  return { status: "success", processedCount: toProcess.length };
}
```

---

## 4. Testing Considerations

### 4.1 Scenario Testing

**Scenario 1: Fresh Book Upload**
```typescript
test("should process new book completely", async () => {
  // 1. Upload EPUB
  const book = await uploadTestBook("test-book.epub");

  // 2. Verify processing queued
  expect(await getProcessingJobCount()).toBe(1);

  // 3. Wait for completion
  await waitForProcessingComplete(book.id);

  // 4. Verify all files exist
  const files = await getBookDataFiles(book.id);
  expect(files).toContain("metadata.json");
  expect(files).toContain("content.json");
  expect(files).toContain("chapters.json");

  // 5. Verify content integrity
  const content = await getBookContent(book.id);
  expect(content.chapters).toHaveLength(book.metadata.chapterCount);
  expect(content.chapters.every(c => c.summary)).toBe(true);
});
```

**Scenario 2: Partial Failure and Resume**
```typescript
test("should resume processing after partial failure", async () => {
  // 1. Start processing
  const book = await uploadTestBook("test-book.epub");

  // 2. Simulate failure at chapter 5
  await simulateProcessingFailure(book.id, 5);

  // 3. Verify state is saved
  const state = await getProcessingState(book.id);
  expect(state.status).toBe("failed");
  expect(state.failedChapters).toContain("chapter_5.md");
  expect(state.chaptersProcessed).toBe(4);

  // 4. Resume processing
  await resumeProcessing(book.id);

  // 5. Verify only remaining chapters processed
  await waitForProcessingComplete(book.id);
  const finalState = await getProcessingState(book.id);
  expect(finalState.status).toBe("complete");
});
```

**Scenario 3: Duplicate Processing Prevention**
```typescript
test("should prevent duplicate processing of chapters", async () => {
  const book = await uploadTestBook("test-book.epub");

  // 1. Process once
  await processBook(book.filename);
  const firstRun = await getProcessingTime();

  // 2. Process again (should skip already-processed chapters)
  const startTime = Date.now();
  await processBook(book.filename);
  const secondRunTime = Date.now() - startTime;

  // 3. Second run should be much faster
  expect(secondRunTime).toBeLessThan(firstRun * 0.2); // < 20% of first run
});
```

### 4.2 Data Integrity Tests

```typescript
test("should maintain data consistency through processing", async () => {
  const book = await uploadTestBook("test-book.epub");

  // Process and collect intermediate states
  const states: ProcessingState[] = [];

  const processHandler = async (event) => {
    if (event.type === "state_change") {
      states.push(await getProcessingState(book.id));
    }
  };

  on("processing:event", processHandler);
  await processBook(book.filename);

  // Verify consistency at each state
  for (const state of states) {
    const consistency = await verifyBookDataConsistency(book.id);
    expect(consistency.isConsistent).toBe(true);
  }
});
```

### 4.3 Edge Cases

```typescript
test("should handle edge cases gracefully", async () => {
  // Empty book
  const emptyBook = await createTestBook({ chapters: [] });
  await expect(processBook(emptyBook.filename)).rejects.toThrow("No processable chapters");

  // Very large book
  const largeBook = await createTestBook({ chapters: 500 });
  await processBook(largeBook.filename, { maxChaptersPerRun: 50 });
  expect(await getProcessingState(largeBook.id).status).toBe("in_progress");

  // Corrupted chapter
  const corruptedBook = await uploadTestBook("corrupted.epub");
  await processBook(corruptedBook.filename);
  const state = await getProcessingState(corruptedBook.id);
  expect(state.failedChapters.length).toBeGreaterThan(0);
  expect(state.chaptersProcessed).toBeGreaterThan(0); // Partial success
});
```

### 4.4 Performance Tests

```typescript
test("should meet performance benchmarks", async () => {
  const book = await uploadTestBook("performance-test.epub");

  const startTime = performance.now();
  await processBook(book.filename);
  const processingTime = performance.now() - startTime;

  const chapterCount = 20;
  const avgTimePerChapter = processingTime / chapterCount;

  // Should average < 30 seconds per chapter
  expect(avgTimePerChapter).toBeLessThan(30000);

  // Should complete within 15 minutes for 20 chapters
  expect(processingTime).toBeLessThan(15 * 60 * 1000);
});
```

---

## 5. Implementation Roadmap

### Phase 1: Immediate (This Sprint)
- [ ] Implement processing status tracking file
- [ ] Add pre-flight validation before loading books
- [ ] Add status badges to book cards
- [ ] Prevent navigation to unprocessed chapters

### Phase 2: Short-term (Next Sprint)
- [ ] Implement atomic file operations
- [ ] Add data consistency verification
- [ ] Create detailed error logging
- [ ] Add user-facing error messages

### Phase 3: Medium-term (2-3 Sprints)
- [ ] Implement job queue system (Bull/Redis)
- [ ] Add file watching for auto-detection
- [ ] Create batch processing with progress tracking
- [ ] Add processing notifications

### Phase 4: Long-term
- [ ] Implement scheduled background processing
- [ ] Add differential processing for changed books
- [ ] Enable partial content serving
- [ ] Add WebSocket-based real-time progress updates

---

## 6. Code Quality Checklist

Before any processing pipeline changes:

- [ ] Processing is idempotent (safe to re-run)
- [ ] Existing chapters are never overwritten without backup
- [ ] Temporary files are cleaned up on failure
- [ ] Error states are logged with chapter/book IDs
- [ ] Processing can be resumed from last successful point
- [ ] Data consistency is verified before serving
- [ ] User gets clear feedback on processing status
- [ ] Invalid data is rejected with specific error messages
- [ ] Partial failures don't prevent processing remaining items
- [ ] Tests cover happy path and failure scenarios

---

## 7. Monitoring and Alerts

**Key Metrics to Monitor**:
```typescript
{
  "processing.books.total": Counter,
  "processing.books.successful": Counter,
  "processing.books.failed": Counter,
  "processing.chapters.processed": Counter,
  "processing.chapters.failed": Counter,
  "processing.time.average": Histogram,
  "processing.queue.length": Gauge,
  "processing.errors.by_type": Counter,
  "data.books.unprocessed": Gauge,
  "data.consistency.violations": Counter
}
```

**Alert Thresholds**:
- Failed books > 5%
- Processing time > 30 seconds per chapter
- Processing queue backup > 50 jobs
- Data consistency violations detected
- Processing state file corrupted

---

## Summary

The unprocessed chapters problem can be prevented through:

1. **Detection**: Pre-flight validation and status indicators
2. **Prevention**: Atomic operations and consistency checks
3. **Automation**: Job queues and file watching
4. **Resilience**: Proper error handling and resume capability
5. **Visibility**: Clear user feedback and processing state tracking

By implementing these strategies in phases, the system will become increasingly robust and user-friendly.

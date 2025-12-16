# Quick Reference: Unprocessed Chapters Prevention

## Problem Summary

Users encounter chapters with no content because the processing pipeline hasn't been run or completed partially.

**Current Solution**: On-demand processing button in UI

## Key Files in the Pipeline

```
src/app/api/process-book/route.ts       → Spawns Python processing script
src/app/api/process-chapter/route.ts    → On-demand chapter processing
src/components/ProcessButton.tsx        → User-facing button component
execution/process_book.py               → Main processing logic
src/app/book/[id]/page.tsx             → Book display (checks availability)
src/app/page.tsx                        → Home page (shows completion %)
```

## Processing Pipeline Architecture

```
Upload EPUB
    ↓
Extract metadata + create book ID
    ↓
Extract chapters to markdown
    ↓
Create chapters.json manifest
    ↓
Process each chapter via Gemini API
    ├─ Generate summary
    ├─ Extract stories
    ├─ Create learning objectives
    └─ Generate visual prompts
    ↓
Save to content.json
    ↓
Generate quizzes, concepts, feynman, etc. (parallel)
    ↓
Book ready for learning
```

## Prevention Strategy Hierarchy

### Tier 1: Detection (Immediate Impact)
```
Pre-flight Validation
├─ Check if required files exist (metadata.json, content.json)
├─ Scan chapters for complete content
├─ Report processing status
└─ Prevent navigation to unprocessed chapters
```

### Tier 2: Prevention (Medium Impact)
```
Status Tracking
├─ Create processing_status.json per book
├─ Track chapter-by-chapter progress
├─ Log errors with recovery info
└─ Enable resume capability
```

### Tier 3: Automation (High Impact)
```
Background Processing
├─ Job queue system (Bull + Redis)
├─ File watching for auto-detection
├─ Batch processing with concurrency
└─ Scheduled background runs
```

## Critical Code Patterns

### Idempotent Processing (DO THIS)
```python
# Load existing chapters to skip re-processing
existing_chapters = {}
if os.path.exists(output_path):
    with open(output_path, "r") as f:
        existing_data = json.load(f)
        for ch in existing_data.get("chapters", []):
            existing_chapters[ch["id"]] = ch

# Skip already processed
if chapter_id in existing_chapters:
    processed_chapters.append(existing_chapters[chapter_id])
    continue

# Only process new chapters
analysis = analyze_chapter(title, content)
```

### Manifest-Based Processing (DO THIS)
```python
# Use chapters.json as source of truth
chapters_manifest_path = os.path.join(bookDir, "chapters.json")
if os.path.exists(chapters_manifest_path):
    with open(chapters_manifest_path, "r") as f:
        manifest = json.load(f)

    for item in manifest:
        chapter_title = item['title']
        file_path = item['path']  # Markdown file path
        # Process from the markdown file
```

### Atomic File Operations (DO THIS)
```typescript
// Write to temp file, validate, then atomic rename
const tmpPath = `${path}.tmp`;
await fs.writeFile(tmpPath, JSON.stringify(data), "utf-8");

// Validate it's valid JSON
JSON.parse(await fs.readFile(tmpPath, "utf-8"));

// Atomic move
await fs.move(tmpPath, path, { overwrite: true });
```

## Anti-Patterns (DON'T DO)

```python
# DON'T: Re-process everything every time
processed_chapters = []
for item in items:
    analysis = analyze_chapter(item['title'], item['content'])  # Always runs!

# DO: Skip existing chapters
if chapter_id in existing_chapters:
    processed_chapters.append(existing_chapters[chapter_id])
    continue
```

```typescript
// DON'T: Direct file overwrites (risky)
await fs.writeFile(path, JSON.stringify(data));  // No backup!

// DO: Use atomic writes with validation
await atomicWriteJson(path, data);
```

```typescript
// DON'T: No status visibility
const res = await fetch("/api/process-book", { ... });  // No way to check progress

// DO: Track and expose status
const status = await getProcessingStatus(bookId);
// { status: "in-progress", progress: 45%, chaptersProcessed: 9/20 }
```

## Implementation Checklist

### For Next PR:
- [ ] Add `processing_status.json` tracking
- [ ] Implement `validateBookCompletion()` function
- [ ] Add status indicator to book card
- [ ] Prevent chapter access if content missing
- [ ] Add detailed error logging
- [ ] Write tests for edge cases

### For Future Sprints:
- [ ] Implement job queue system
- [ ] Add file watching for auto-detection
- [ ] Create batch processing pipeline
- [ ] Add WebSocket progress updates
- [ ] Implement scheduled background processing
- [ ] Add differential processing for changed books

## Testing Scenarios

```typescript
// Scenario 1: Fresh book upload
test("processes new book completely", async () => {
  const book = await uploadBook("test.epub");
  await waitForProcessing(book.id);
  const content = await getBookContent(book.id);
  expect(content.chapters.every(c => c.summary)).toBe(true);
});

// Scenario 2: Partial failure recovery
test("resumes after failure", async () => {
  // Start processing → simulate failure at chapter 5
  // Resume processing → complete successfully
  const state = await getProcessingState(bookId);
  expect(state.status).toBe("complete");
});

// Scenario 3: Duplicate prevention
test("skips already-processed chapters", async () => {
  await processBook(filename);
  const firstTime = await getProcessingTime();
  await processBook(filename);  // Should be much faster
  const secondTime = await getProcessingTime();
  expect(secondTime).toBeLessThan(firstTime * 0.2);
});
```

## Monitoring Dashboard Metrics

```
Processing Health
├─ Books processed: 45/50 (90%)
├─ Unprocessed books: 5
├─ Failed books: 2
├─ Processing queue: 8 jobs pending
└─ Average time per chapter: 25s

Data Quality
├─ Books with complete content: 43/45
├─ Chapters with empty summaries: 0
├─ Data consistency violations: 0
└─ Last consistency check: 2 min ago

User Impact
├─ Users waiting for processing: 3
├─ Avg time to first content: 8 min
└─ Books ready to learn: 43
```

## Deployment Checklist

Before deploying processing improvements:

1. **Database/State**
   - [ ] Migration for processing_status schema
   - [ ] Backup existing content.json files
   - [ ] Verify no active processing jobs

2. **Code**
   - [ ] All tests passing
   - [ ] Error handling in place
   - [ ] Logging enabled

3. **Monitoring**
   - [ ] Alerts configured
   - [ ] Dashboard created
   - [ ] Rollback plan ready

4. **Communication**
   - [ ] Users notified of status
   - [ ] Support team briefed
   - [ ] Documentation updated

## Performance Benchmarks

**Current**:
- Per chapter: ~30-45 seconds
- 20-chapter book: ~10-15 minutes
- Peak API calls: 1 request/chapter (to Gemini)

**Target with Improvements**:
- Resume on failure: -80% time on retry
- Batch processing: -60% wall-clock time (parallel)
- Partial serving: User sees content immediately (phase 1)

## Debugging Tips

**Processing stuck?**
```bash
# Check processing state
curl http://localhost:3000/api/books/{bookId}/status

# View error log
cat data/books/{bookId}/processing_state.json

# Check Python logs
tail -f /tmp/process_book.log
```

**Content not updating?**
```bash
# Verify content.json exists
ls -la data/books/{bookId}/content.json

# Check file permissions
stat data/books/{bookId}/content.json

# Validate JSON structure
python3 -m json.tool data/books/{bookId}/content.json
```

**Chapters missing?**
```bash
# Count chapters in content.json
python3 -c "import json; print(len(json.load(open('data/books/{bookId}/content.json'))['chapters']))"

# Check chapters.json manifest
cat data/books/{bookId}/chapters.json | python3 -m json.tool
```

## Key Takeaways

1. **Always check existing data before re-processing** - Idempotency is critical
2. **Track processing state explicitly** - Don't rely on file existence alone
3. **Provide user visibility** - Show status clearly in UI
4. **Use atomic operations** - Prevent partial writes
5. **Log failures with context** - Enable debugging and recovery
6. **Validate data integrity** - Check consistency before serving
7. **Plan for partial failures** - Resume capability is essential
8. **Automate where possible** - Job queues reduce manual work

## Resources

- Full strategies: See `PREVENTION_STRATEGIES.md`
- Current API: `/src/app/api/process-book/route.ts`
- Processing script: `/execution/process_book.py`
- Book page logic: `/src/app/book/[id]/page.tsx`

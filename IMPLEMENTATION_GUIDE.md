# Implementation Guide: Prevention Strategies

This guide provides concrete code examples for implementing prevention strategies.

## 1. Processing Status Tracking

### Step 1: Define Processing Status Type

```typescript
// src/types/processing.ts
export interface ProcessingStatus {
  bookId: string;
  processingState: "unprocessed" | "queued" | "in-progress" | "complete" | "partial" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  lastUpdatedAt: string;
  chaptersTotal: number;
  chaptersProcessed: number;
  chaptersFailed: string[];
  phases: {
    phase1_basic: boolean;      // Metadata + chapter list
    phase2_content: boolean;    // Summaries and stories
    phase3_assessments: boolean; // Quizzes and concepts
    phase4_enhanced: boolean;   // Feynman, schemas, projects
  };
  errorLog: Array<{
    chapter: string;
    phase: number;
    error: string;
    timestamp: string;
    retryCount: number;
  }>;
  metadata: {
    title: string;
    author: string;
    totalChapters: number;
  };
}
```

### Step 2: Create Status Management Module

```typescript
// src/lib/processing-status.ts
import fs from "fs-extra";
import path from "path";

const getStatusPath = (bookId: string): string =>
  path.join(process.cwd(), "data", "books", bookId, "processing_status.json");

export async function initializeProcessingStatus(
  bookId: string,
  bookMetadata: { title: string; author: string; totalChapters: number }
): Promise<ProcessingStatus> {
  const status: ProcessingStatus = {
    bookId,
    processingState: "queued",
    startedAt: null,
    completedAt: null,
    lastUpdatedAt: new Date().toISOString(),
    chaptersTotal: bookMetadata.totalChapters,
    chaptersProcessed: 0,
    chaptersFailed: [],
    phases: {
      phase1_basic: false,
      phase2_content: false,
      phase3_assessments: false,
      phase4_enhanced: false
    },
    errorLog: [],
    metadata: bookMetadata
  };

  const statusPath = getStatusPath(bookId);
  await fs.ensureDir(path.dirname(statusPath));
  await fs.writeJson(statusPath, status, { spaces: 2 });

  return status;
}

export async function getProcessingStatus(bookId: string): Promise<ProcessingStatus> {
  const statusPath = getStatusPath(bookId);

  if (!await fs.pathExists(statusPath)) {
    throw new Error(`Processing status not found for book ${bookId}`);
  }

  return fs.readJson(statusPath);
}

export async function updateProcessingStatus(
  bookId: string,
  updates: Partial<ProcessingStatus>
): Promise<ProcessingStatus> {
  const current = await getProcessingStatus(bookId);
  const updated: ProcessingStatus = {
    ...current,
    ...updates,
    lastUpdatedAt: new Date().toISOString()
  };

  const statusPath = getStatusPath(bookId);

  // Atomic write
  const tmpPath = `${statusPath}.tmp`;
  await fs.writeJson(tmpPath, updated, { spaces: 2 });
  await fs.move(tmpPath, statusPath, { overwrite: true });

  return updated;
}

export async function recordProcessingError(
  bookId: string,
  chapter: string,
  phase: number,
  error: string,
  retryCount: number = 0
): Promise<void> {
  const status = await getProcessingStatus(bookId);

  status.errorLog.push({
    chapter,
    phase,
    error,
    timestamp: new Date().toISOString(),
    retryCount
  });

  if (!status.chaptersFailed.includes(chapter)) {
    status.chaptersFailed.push(chapter);
  }

  await updateProcessingStatus(bookId, status);
}

export async function markPhaseComplete(
  bookId: string,
  phase: number
): Promise<void> {
  const status = await getProcessingStatus(bookId);

  const phaseKey = `phase${phase}_${
    phase === 1 ? "basic" : phase === 2 ? "content" : phase === 3 ? "assessments" : "enhanced"
  }` as keyof ProcessingStatus["phases"];

  status.phases[phaseKey] = true;

  // Check if fully complete
  const allPhasesComplete = Object.values(status.phases).every(v => v);

  await updateProcessingStatus(bookId, {
    phases: status.phases,
    processingState: allPhasesComplete ? "complete" : "partial",
    completedAt: allPhasesComplete ? new Date().toISOString() : null
  });
}
```

### Step 3: Update Processing Script

```python
# execution/process_book.py - Add status tracking
import json
import os
from pathlib import Path

def get_status_path(book_id):
    return os.path.join(os.getcwd(), "data", "books", book_id, "processing_status.json")

def update_status(book_id, updates):
    """Update processing status with atomic write"""
    status_path = get_status_path(book_id)

    with open(status_path, "r") as f:
        status = json.load(f)

    status.update(updates)
    status["lastUpdatedAt"] = datetime.now().isoformat()

    # Atomic write
    tmp_path = f"{status_path}.tmp"
    with open(tmp_path, "w") as f:
        json.dump(status, f, indent=2)

    os.replace(tmp_path, status_path)

def process_book(filename, limit=None):
    """Process book with status tracking"""
    base_dir = os.getcwd()
    books_dir = os.path.join(base_dir, "public", "books")
    file_path = os.path.join(books_dir, filename)

    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)

    # Get book ID
    book_id = get_book_id(filename)

    # Initialize status
    if not os.path.exists(get_status_path(book_id)):
        print(f"Initializing processing status for {book_id}")
        # Status would be initialized by TypeScript endpoint

    try:
        # Update to in-progress
        update_status(book_id, {
            "processingState": "in-progress",
            "startedAt": datetime.now().isoformat()
        })

        # Parse EPUB
        print(f"Parsing EPUB: {filename}")
        book = epub.read_epub(file_path)

        book_title = book.get_metadata('DC', 'title')[0][0] if book.get_metadata('DC', 'title') else "Unknown Title"
        book_author = book.get_metadata('DC', 'creator')[0][0] if book.get_metadata('DC', 'creator') else "Unknown Author"

        # Load existing chapters
        output_dir = os.path.join(base_dir, "data", "books", book_id)
        output_path = os.path.join(output_dir, "content.json")

        existing_chapters = {}
        if os.path.exists(output_path):
            try:
                with open(output_path, "r") as f:
                    existing_data = json.load(f)
                    for ch in existing_data.get("chapters", []):
                        existing_chapters[ch["id"]] = ch
                print(f"Loaded {len(existing_chapters)} existing chapters")
            except Exception as e:
                print(f"Warning: Could not load existing chapters: {e}", file=sys.stderr)

        processed_chapters = []
        chapters_processed = 0
        chapters_failed = []

        # Load manifest
        chapters_manifest_path = os.path.join(output_dir, "chapters.json")

        if os.path.exists(chapters_manifest_path):
            with open(chapters_manifest_path, "r") as f:
                manifest = json.load(f)

            print(f"Found {len(manifest)} chapters in manifest")

            for idx, item in enumerate(manifest):
                if limit and chapters_processed >= limit:
                    break

                chapter_id = os.path.basename(item['path'])
                chapter_title = item['title']

                # Skip already processed
                if chapter_id in existing_chapters:
                    print(f"Skipping already processed: {chapter_title}")
                    processed_chapters.append(existing_chapters[chapter_id])
                    chapters_processed += 1
                    continue

                try:
                    # Read and process
                    with open(item['path'], "r") as f:
                        content = f.read()

                    if len(content) < 50:
                        continue

                    print(f"Analyzing chapter: {chapter_title}")
                    analysis = analyze_chapter(chapter_title, content)

                    if "error" in analysis:
                        chapters_failed.append(chapter_id)
                        # Log error
                        update_status(book_id, {
                            "chaptersFailed": chapters_failed,
                            "chaptersProcessed": chapters_processed
                        })
                        continue

                    processed_chapters.append({
                        "id": chapter_id,
                        "title": chapter_title,
                        **analysis
                    })

                    chapters_processed += 1

                    # Update progress
                    if idx % 5 == 0:  # Update every 5 chapters to avoid too many writes
                        update_status(book_id, {
                            "chaptersProcessed": chapters_processed,
                            "processingState": "in-progress"
                        })

                except Exception as e:
                    print(f"Error processing chapter {chapter_id}: {e}", file=sys.stderr)
                    chapters_failed.append(chapter_id)

        # Save final data
        os.makedirs(output_dir, exist_ok=True)

        final_data = {
            "title": book_title,
            "author": book_author,
            "processedAt": datetime.now().isoformat(),
            "chapters": processed_chapters
        }

        # Atomic write
        tmp_path = f"{output_path}.tmp"
        with open(tmp_path, "w") as f:
            json.dump(final_data, f, indent=2)

        os.replace(tmp_path, output_path)

        # Mark phase complete
        print(f"Successfully processed {chapters_processed} chapters")
        update_status(book_id, {
            "processingState": "complete" if not chapters_failed else "partial",
            "completedAt": datetime.now().isoformat(),
            "chaptersProcessed": chapters_processed,
            "phases": {
                "phase1_basic": True,
                "phase2_content": True,
                "phase3_assessments": False,
                "phase4_enhanced": False
            }
        })

    except Exception as e:
        print(f"Fatal error processing book: {e}", file=sys.stderr)
        update_status(book_id, {
            "processingState": "failed",
            "errorLog": [{"error": str(e), "timestamp": datetime.now().isoformat()}]
        })
        sys.exit(1)
```

## 2. Pre-Flight Validation

### Step 1: Create Validation Module

```typescript
// src/lib/book-validation.ts
import fs from "fs-extra";
import path from "path";
import { ProcessingStatus } from "@/types/processing";

interface ValidationResult {
  isValid: boolean;
  status: "ready" | "processing" | "failed" | "incomplete";
  missingFiles: string[];
  emptyChapters: string[];
  completionPercentage: number;
  requiresAction: boolean;
  actionRequired?: "process" | "resume" | "retry" | "none";
  message: string;
}

export async function validateBook(bookId: string): Promise<ValidationResult> {
  const dataDir = path.join(process.cwd(), "data", "books", bookId);

  // Required files for basic functionality
  const requiredFiles = ["metadata.json", "content.json", "chapters.json"];
  const missingFiles: string[] = [];

  for (const file of requiredFiles) {
    const filePath = path.join(dataDir, file);
    if (!await fs.pathExists(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    return {
      isValid: false,
      status: "incomplete",
      missingFiles,
      emptyChapters: [],
      completionPercentage: 0,
      requiresAction: true,
      actionRequired: "process",
      message: `Book missing required files: ${missingFiles.join(", ")}`
    };
  }

  // Load content and check for empty chapters
  let content;
  try {
    content = await fs.readJson(path.join(dataDir, "content.json"));
  } catch (error) {
    return {
      isValid: false,
      status: "failed",
      missingFiles: [],
      emptyChapters: [],
      completionPercentage: 0,
      requiresAction: true,
      actionRequired: "retry",
      message: "Invalid or corrupted content.json"
    };
  }

  // Check for empty chapters
  const emptyChapters = (content.chapters || []).filter(
    (chapter: any) =>
      !chapter.summary ||
      chapter.summary.length < 50 ||
      !chapter.stories ||
      chapter.stories.length === 0
  );

  const completionPercentage =
    content.chapters && content.chapters.length > 0
      ? ((content.chapters.length - emptyChapters.length) / content.chapters.length) * 100
      : 0;

  // Check processing status
  let processingStatus: ProcessingStatus | null = null;
  try {
    const statusPath = path.join(dataDir, "processing_status.json");
    if (await fs.pathExists(statusPath)) {
      processingStatus = await fs.readJson(statusPath);
    }
  } catch (error) {
    console.error("Error reading processing status:", error);
  }

  // Determine validation result
  if (emptyChapters.length === 0 && completionPercentage === 100) {
    return {
      isValid: true,
      status: "ready",
      missingFiles: [],
      emptyChapters: [],
      completionPercentage: 100,
      requiresAction: false,
      actionRequired: "none",
      message: "Book is ready to use"
    };
  }

  if (processingStatus?.processingState === "in-progress") {
    return {
      isValid: false,
      status: "processing",
      missingFiles: [],
      emptyChapters: emptyChapters.map((c: any) => c.id),
      completionPercentage,
      requiresAction: false,
      actionRequired: "none",
      message: `Processing in progress (${processingStatus.chaptersProcessed}/${processingStatus.chaptersTotal} chapters)`
    };
  }

  if (processingStatus?.processingState === "failed") {
    return {
      isValid: false,
      status: "failed",
      missingFiles: [],
      emptyChapters,
      completionPercentage,
      requiresAction: true,
      actionRequired: "retry",
      message: "Previous processing failed"
    };
  }

  // Partial processing
  return {
    isValid: false,
    status: "incomplete",
    missingFiles: [],
    emptyChapters: emptyChapters.map((c: any) => c.id),
    completionPercentage,
    requiresAction: true,
    actionRequired: "resume",
    message: `Book partially processed (${completionPercentage.toFixed(1)}% complete)`
  };
}
```

### Step 2: Add Validation to Book Page

```typescript
// src/app/book/[id]/page.tsx - Updated
import { validateBook } from "@/lib/book-validation";

export default async function BookPage({ params, searchParams }: PageProps) {
  const { id } = await params;

  // Validate book before loading
  const validation = await validateBook(id);

  if (!validation.isValid && validation.status !== "processing") {
    return (
      <div className="min-h-screen bg-[var(--color-void)] flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-[var(--color-snow)] mb-2">
            Book Not Ready
          </h2>
          <p className="text-[var(--color-pearl)] mb-6">
            {validation.message}
          </p>

          {validation.actionRequired === "process" && (
            <ProcessButton filename={`${id}.epub`} />
          )}

          {validation.actionRequired === "resume" && (
            <div className="text-sm text-[var(--color-silver)] mb-4">
              {validation.completionPercentage.toFixed(1)}% complete
            </div>
          )}

          <Link
            href="/"
            className="inline-block text-[var(--color-electric-blue)] hover:underline"
          >
            Return to Library
          </Link>
        </div>
      </div>
    );
  }

  // Rest of page implementation...
}
```

## 3. User-Facing Status Component

```typescript
// src/components/BookStatusBadge.tsx
import { ValidationResult } from "@/lib/book-validation";

interface BookStatusBadgeProps {
  validation: ValidationResult;
  compact?: boolean;
}

const statusConfig = {
  ready: {
    color: "emerald",
    icon: "✓",
    label: "Ready",
    description: "All content processed"
  },
  processing: {
    color: "blue",
    icon: "↻",
    label: "Processing",
    description: "Content being generated"
  },
  incomplete: {
    color: "amber",
    icon: "⚠",
    label: "Incomplete",
    description: "Processing required"
  },
  failed: {
    color: "red",
    icon: "✕",
    label: "Failed",
    description: "Retry processing"
  }
};

export default function BookStatusBadge({
  validation,
  compact = false
}: BookStatusBadgeProps) {
  const config = statusConfig[validation.status];

  if (compact) {
    return (
      <span className={`badge badge-${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  }

  return (
    <div className={`badge badge-${config.color} gap-2`}>
      <span className="text-lg">{config.icon}</span>
      <div>
        <div className="font-semibold">{config.label}</div>
        <div className="text-xs opacity-75">{config.description}</div>
        {validation.completionPercentage > 0 && validation.completionPercentage < 100 && (
          <div className="mt-1 w-32 h-1 bg-black/20 rounded-full overflow-hidden">
            <div
              className={`h-full bg-${config.color}-500 transition-all`}
              style={{ width: `${validation.completionPercentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

## 4. Atomic File Operations Utility

```typescript
// src/lib/atomic-fs.ts
import fs from "fs-extra";
import path from "path";

export async function atomicWriteJson(
  filePath: string,
  data: any,
  options: { backup?: boolean; validate?: (data: string) => void } = {}
): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  const backupPath = options.backup ? `${filePath}.backup` : null;

  try {
    // Create directory if needed
    await fs.ensureDir(path.dirname(filePath));

    // Write to temporary file
    const jsonStr = JSON.stringify(data, null, 2);
    await fs.writeFile(tmpPath, jsonStr, "utf-8");

    // Validate (parse to ensure valid JSON)
    if (options.validate) {
      options.validate(await fs.readFile(tmpPath, "utf-8"));
    } else {
      JSON.parse(await fs.readFile(tmpPath, "utf-8"));
    }

    // Backup existing file if requested
    if (backupPath && (await fs.pathExists(filePath))) {
      await fs.copy(filePath, backupPath, { overwrite: true });
    }

    // Atomic move (rename is atomic on most filesystems)
    await fs.move(tmpPath, filePath, { overwrite: true });
  } catch (error) {
    // Clean up temp file
    await fs.remove(tmpPath);

    if (error instanceof Error) {
      throw new Error(`Failed to write ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

export async function atomicReadJson<T = any>(
  filePath: string,
  fallback?: T
): Promise<T> {
  try {
    if (!await fs.pathExists(filePath)) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    if (fallback !== undefined) {
      console.warn(`Failed to read ${filePath}, using fallback:`, error);
      return fallback;
    }
    throw error;
  }
}
```

## 5. Testing Implementation

```typescript
// src/__tests__/book-validation.test.ts
import { validateBook } from "@/lib/book-validation";
import { initializeProcessingStatus } from "@/lib/processing-status";
import fs from "fs-extra";
import path from "path";

describe("Book Validation", () => {
  const testBookId = "test-book-123";
  const testDataDir = path.join(process.cwd(), "data", "books", testBookId);

  beforeEach(async () => {
    await fs.ensureDir(testDataDir);
  });

  afterEach(async () => {
    await fs.remove(testDataDir);
  });

  test("should detect missing required files", async () => {
    const validation = await validateBook(testBookId);

    expect(validation.isValid).toBe(false);
    expect(validation.status).toBe("incomplete");
    expect(validation.missingFiles).toContain("metadata.json");
    expect(validation.actionRequired).toBe("process");
  });

  test("should validate complete book", async () => {
    // Create required files
    await fs.writeJson(path.join(testDataDir, "metadata.json"), {
      title: "Test Book",
      author: "Test Author"
    });

    await fs.writeJson(path.join(testDataDir, "chapters.json"), [
      { id: "ch1", title: "Chapter 1", path: "ch1.md" }
    ]);

    await fs.writeJson(path.join(testDataDir, "content.json"), {
      title: "Test Book",
      author: "Test Author",
      chapters: [
        {
          id: "ch1",
          title: "Chapter 1",
          summary: "This is a complete summary with proper length",
          stories: [{ title: "Story 1", description: "Desc", lesson: "Lesson" }],
          learningObjectives: ["Learn X", "Learn Y"]
        }
      ]
    });

    const validation = await validateBook(testBookId);

    expect(validation.isValid).toBe(true);
    expect(validation.status).toBe("ready");
    expect(validation.completionPercentage).toBe(100);
  });

  test("should detect empty chapters", async () => {
    await fs.writeJson(path.join(testDataDir, "metadata.json"), {
      title: "Test Book",
      author: "Test Author"
    });

    await fs.writeJson(path.join(testDataDir, "chapters.json"), [
      { id: "ch1", title: "Chapter 1", path: "ch1.md" },
      { id: "ch2", title: "Chapter 2", path: "ch2.md" }
    ]);

    await fs.writeJson(path.join(testDataDir, "content.json"), {
      title: "Test Book",
      author: "Test Author",
      chapters: [
        {
          id: "ch1",
          title: "Chapter 1",
          summary: "Complete summary",
          stories: [{ title: "Story", description: "Desc", lesson: "Lesson" }],
          learningObjectives: ["Learn X"]
        },
        {
          id: "ch2",
          title: "Chapter 2",
          summary: "",  // Empty summary
          stories: [],  // No stories
          learningObjectives: []
        }
      ]
    });

    const validation = await validateBook(testBookId);

    expect(validation.isValid).toBe(false);
    expect(validation.status).toBe("incomplete");
    expect(validation.emptyChapters).toContain("ch2");
    expect(validation.completionPercentage).toBe(50);
  });

  test("should detect processing in progress", async () => {
    await fs.writeJson(path.join(testDataDir, "metadata.json"), {
      title: "Test Book",
      author: "Test Author"
    });

    await initializeProcessingStatus(testBookId, {
      title: "Test Book",
      author: "Test Author",
      totalChapters: 5
    });

    const validation = await validateBook(testBookId);

    expect(validation.isValid).toBe(false);
    expect(validation.status).toBe("processing");
    expect(validation.requiresAction).toBe(false);
  });
});
```

---

## Summary

These implementation examples provide a concrete foundation for:

1. **Status Tracking**: Persistent state with atomic writes
2. **Validation**: Pre-flight checks before rendering
3. **User Feedback**: Clear status indicators
4. **Data Safety**: Atomic operations prevent corruption
5. **Testing**: Comprehensive test scenarios

Each module is designed to be:
- Independent and testable
- Production-ready
- Following existing codebase patterns
- Well-documented with examples

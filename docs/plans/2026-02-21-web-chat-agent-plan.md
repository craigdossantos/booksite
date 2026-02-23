# Web Chat Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive AI chat panel to the book detail page, where users can ask questions about a book, explore themes, and create versioned HTML artifacts (concept maps, study guides, diagrams) that persist as first-class content.

**Architecture:** Vercel AI SDK `streamText` with Claude on a Next.js API route. Tools defined in TypeScript read/write book data from the filesystem. Frontend uses `useChat` hook. Artifacts are versioned HTML files stored per-book.

**Tech Stack:** Vercel AI SDK v5 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`), Next.js 16, React 19, Tailwind CSS 4, Zod 4

---

### Task 1: Artifact Types

**Files:**

- Modify: `src/types/book.ts`

**Step 1: Add artifact types to the existing type file**

Add these types at the end of `src/types/book.ts`:

```typescript
// Artifact types for agent-created learning materials

export interface ArtifactVersion {
  version: number;
  createdAt: string;
  changeNote: string;
}

export interface ArtifactMeta {
  id: string;
  title: string;
  description: string;
  versions: ArtifactVersion[];
  currentVersion: number;
  chapters: number[];
}

export interface ArtifactIndexEntry {
  id: string;
  title: string;
  description: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  chapters: number[];
}

export interface SessionSummary {
  lastUpdated: string;
  summary: string;
  openQuestions: string[];
}
```

**Step 2: Commit**

```bash
git add src/types/book.ts
git commit -m "feat: add artifact and session summary types"
```

---

### Task 2: Artifact CRUD Library

**Files:**

- Create: `src/lib/artifacts.ts`
- Test: `src/__tests__/lib/artifacts.test.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/lib/artifacts.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import {
  createArtifact,
  updateArtifact,
  getArtifact,
  getArtifactHtml,
  listArtifacts,
} from "@/lib/artifacts";

const TEST_BOOK_DIR = path.join(
  process.cwd(),
  "data",
  "books",
  "_test_artifacts",
);

beforeEach(async () => {
  await fs.ensureDir(TEST_BOOK_DIR);
});

afterEach(async () => {
  await fs.remove(TEST_BOOK_DIR);
});

describe("createArtifact", () => {
  it("creates artifact directory, meta.json, v1.html, and index entry", async () => {
    const result = await createArtifact("_test_artifacts", {
      title: "Concept Map",
      description: "A concept map for chapter 1",
      htmlContent: "<h1>Concepts</h1>",
      chapters: [1],
    });

    expect(result.id).toBeDefined();
    expect(result.title).toBe("Concept Map");

    // Check files exist
    const artifactDir = path.join(TEST_BOOK_DIR, "artifacts", result.id);
    expect(await fs.pathExists(path.join(artifactDir, "v1.html"))).toBe(true);
    expect(await fs.pathExists(path.join(artifactDir, "meta.json"))).toBe(true);

    // Check index
    const index = await fs.readJson(
      path.join(TEST_BOOK_DIR, "artifacts", "artifact-index.json"),
    );
    expect(index).toHaveLength(1);
    expect(index[0].title).toBe("Concept Map");
  });
});

describe("updateArtifact", () => {
  it("creates a new version and updates meta", async () => {
    const created = await createArtifact("_test_artifacts", {
      title: "Concept Map",
      description: "A concept map",
      htmlContent: "<h1>V1</h1>",
      chapters: [1],
    });

    const updated = await updateArtifact("_test_artifacts", created.id, {
      htmlContent: "<h1>V2</h1>",
      changeNote: "Updated colors",
    });

    expect(updated.currentVersion).toBe(2);

    const artifactDir = path.join(TEST_BOOK_DIR, "artifacts", created.id);
    expect(await fs.pathExists(path.join(artifactDir, "v2.html"))).toBe(true);

    const v1 = await fs.readFile(path.join(artifactDir, "v1.html"), "utf-8");
    expect(v1).toBe("<h1>V1</h1>");
  });
});

describe("getArtifactHtml", () => {
  it("returns current version HTML by default", async () => {
    const created = await createArtifact("_test_artifacts", {
      title: "Test",
      description: "Test",
      htmlContent: "<h1>V1</h1>",
      chapters: [],
    });

    await updateArtifact("_test_artifacts", created.id, {
      htmlContent: "<h1>V2</h1>",
      changeNote: "v2",
    });

    const html = await getArtifactHtml("_test_artifacts", created.id);
    expect(html).toBe("<h1>V2</h1>");
  });

  it("returns specific version when requested", async () => {
    const created = await createArtifact("_test_artifacts", {
      title: "Test",
      description: "Test",
      htmlContent: "<h1>V1</h1>",
      chapters: [],
    });

    await updateArtifact("_test_artifacts", created.id, {
      htmlContent: "<h1>V2</h1>",
      changeNote: "v2",
    });

    const html = await getArtifactHtml("_test_artifacts", created.id, 1);
    expect(html).toBe("<h1>V1</h1>");
  });
});

describe("listArtifacts", () => {
  it("returns empty array when no artifacts exist", async () => {
    const list = await listArtifacts("_test_artifacts");
    expect(list).toEqual([]);
  });

  it("returns all artifacts in the index", async () => {
    await createArtifact("_test_artifacts", {
      title: "First",
      description: "First artifact",
      htmlContent: "<p>1</p>",
      chapters: [1],
    });
    await createArtifact("_test_artifacts", {
      title: "Second",
      description: "Second artifact",
      htmlContent: "<p>2</p>",
      chapters: [2],
    });

    const list = await listArtifacts("_test_artifacts");
    expect(list).toHaveLength(2);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/lib/artifacts.test.ts`
Expected: FAIL — module `@/lib/artifacts` does not exist

**Step 3: Implement `src/lib/artifacts.ts`**

```typescript
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import type { ArtifactMeta, ArtifactIndexEntry } from "@/types/book";

const DATA_DIR = path.join(process.cwd(), "data", "books");

function artifactsDir(bookId: string): string {
  return path.join(DATA_DIR, bookId, "artifacts");
}

function indexPath(bookId: string): string {
  return path.join(artifactsDir(bookId), "artifact-index.json");
}

function artifactDir(bookId: string, artifactId: string): string {
  return path.join(artifactsDir(bookId), artifactId);
}

async function readIndex(bookId: string): Promise<ArtifactIndexEntry[]> {
  const p = indexPath(bookId);
  if (!(await fs.pathExists(p))) return [];
  return fs.readJson(p);
}

async function writeIndex(
  bookId: string,
  index: ArtifactIndexEntry[],
): Promise<void> {
  await fs.ensureDir(artifactsDir(bookId));
  await fs.writeJson(indexPath(bookId), index, { spaces: 2 });
}

export async function createArtifact(
  bookId: string,
  input: {
    title: string;
    description: string;
    htmlContent: string;
    chapters: number[];
  },
): Promise<ArtifactIndexEntry> {
  const id = crypto.randomBytes(6).toString("hex");
  const now = new Date().toISOString();
  const dir = artifactDir(bookId, id);

  await fs.ensureDir(dir);

  // Write v1.html
  await fs.writeFile(path.join(dir, "v1.html"), input.htmlContent, "utf-8");

  // Write meta.json
  const meta: ArtifactMeta = {
    id,
    title: input.title,
    description: input.description,
    versions: [{ version: 1, createdAt: now, changeNote: "Initial creation" }],
    currentVersion: 1,
    chapters: input.chapters,
  };
  await fs.writeJson(path.join(dir, "meta.json"), meta, { spaces: 2 });

  // Update index
  const index = await readIndex(bookId);
  const entry: ArtifactIndexEntry = {
    id,
    title: input.title,
    description: input.description,
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
    chapters: input.chapters,
  };
  index.push(entry);
  await writeIndex(bookId, index);

  return entry;
}

export async function updateArtifact(
  bookId: string,
  artifactId: string,
  input: {
    htmlContent: string;
    changeNote: string;
    title?: string;
    description?: string;
    chapters?: number[];
  },
): Promise<ArtifactMeta> {
  const dir = artifactDir(bookId, artifactId);
  const metaPath = path.join(dir, "meta.json");
  const meta: ArtifactMeta = await fs.readJson(metaPath);
  const now = new Date().toISOString();

  const newVersion = meta.currentVersion + 1;

  // Write new version HTML
  await fs.writeFile(
    path.join(dir, `v${newVersion}.html`),
    input.htmlContent,
    "utf-8",
  );

  // Update meta
  meta.versions.push({
    version: newVersion,
    createdAt: now,
    changeNote: input.changeNote,
  });
  meta.currentVersion = newVersion;
  if (input.title) meta.title = input.title;
  if (input.description) meta.description = input.description;
  if (input.chapters) meta.chapters = input.chapters;
  await fs.writeJson(metaPath, meta, { spaces: 2 });

  // Update index
  const index = await readIndex(bookId);
  const indexEntry = index.find((e) => e.id === artifactId);
  if (indexEntry) {
    indexEntry.currentVersion = newVersion;
    indexEntry.updatedAt = now;
    if (input.title) indexEntry.title = input.title;
    if (input.description) indexEntry.description = input.description;
    if (input.chapters) indexEntry.chapters = input.chapters;
    await writeIndex(bookId, index);
  }

  return meta;
}

export async function getArtifact(
  bookId: string,
  artifactId: string,
): Promise<ArtifactMeta | null> {
  const metaPath = path.join(artifactDir(bookId, artifactId), "meta.json");
  if (!(await fs.pathExists(metaPath))) return null;
  return fs.readJson(metaPath);
}

export async function getArtifactHtml(
  bookId: string,
  artifactId: string,
  version?: number,
): Promise<string | null> {
  const dir = artifactDir(bookId, artifactId);
  const meta = await getArtifact(bookId, artifactId);
  if (!meta) return null;

  const v = version ?? meta.currentVersion;
  const htmlPath = path.join(dir, `v${v}.html`);
  if (!(await fs.pathExists(htmlPath))) return null;
  return fs.readFile(htmlPath, "utf-8");
}

export async function listArtifacts(
  bookId: string,
): Promise<ArtifactIndexEntry[]> {
  return readIndex(bookId);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/lib/artifacts.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/lib/artifacts.ts src/__tests__/lib/artifacts.test.ts
git commit -m "feat: add artifact CRUD library with tests"
```

---

### Task 3: Session Summary Library

**Files:**

- Create: `src/lib/session.ts`

**Step 1: Implement session summary read/write**

```typescript
import fs from "fs-extra";
import path from "path";
import type { SessionSummary } from "@/types/book";

const DATA_DIR = path.join(process.cwd(), "data", "books");

export async function getSessionSummary(
  bookId: string,
): Promise<SessionSummary | null> {
  const p = path.join(DATA_DIR, bookId, "session-summary.json");
  if (!(await fs.pathExists(p))) return null;
  return fs.readJson(p);
}

export async function saveSessionSummary(
  bookId: string,
  summary: SessionSummary,
): Promise<void> {
  const p = path.join(DATA_DIR, bookId, "session-summary.json");
  await fs.writeJson(
    p,
    { ...summary, lastUpdated: new Date().toISOString() },
    {
      spaces: 2,
    },
  );
}
```

**Step 2: Commit**

```bash
git add src/lib/session.ts
git commit -m "feat: add session summary read/write utilities"
```

---

### Task 4: Chat Tools

**Files:**

- Create: `src/lib/chat-tools.ts`

This is the core of the agent — tool definitions that the AI SDK passes to Claude.

**Step 1: Implement chat tools**

Each tool uses the `tool()` helper from the AI SDK with a Zod input schema and an `execute` function. All tools take `bookId` as a closure (injected by the API route), not as a tool parameter.

```typescript
import { tool } from "ai";
import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import type { Chapter } from "@/types/book";
import {
  createArtifact,
  updateArtifact,
  getArtifact,
  getArtifactHtml,
  listArtifacts,
} from "@/lib/artifacts";
import { saveSessionSummary } from "@/lib/session";

const DATA_DIR = path.join(process.cwd(), "data", "books");

function bookPath(bookId: string, ...parts: string[]): string {
  return path.join(DATA_DIR, bookId, ...parts);
}

async function loadChapters(bookId: string): Promise<Chapter[]> {
  const p = bookPath(bookId, "chapters.json");
  if (!(await fs.pathExists(p))) return [];
  return fs.readJson(p);
}

export function createBookTools(bookId: string) {
  return {
    listChapters: tool({
      description:
        "List all chapters with titles, word counts, and summary previews.",
      inputSchema: z.object({}),
      execute: async () => {
        const chapters = await loadChapters(bookId);
        if (!chapters.length) return "No chapters found for this book.";
        return chapters
          .map((ch) => {
            const preview = ch.summary?.content?.slice(0, 120) ?? "";
            return `Ch ${ch.number}: ${ch.title} (${ch.wordCount} words)${preview ? `\n  ${preview}...` : ""}`;
          })
          .join("\n\n");
      },
    }),

    readChapter: tool({
      description:
        "Read the full markdown content of a specific chapter. Use this to deeply understand what the chapter says.",
      inputSchema: z.object({
        chapterNumber: z.number().describe("The chapter number to read"),
      }),
      execute: async ({ chapterNumber }) => {
        const chapters = await loadChapters(bookId);
        const chapter = chapters.find((c) => c.number === chapterNumber);
        if (!chapter) {
          return `Chapter ${chapterNumber} not found. Available: ${chapters.map((c) => c.number).join(", ")}`;
        }
        const content = await fs.readFile(
          bookPath(bookId, chapter.markdownPath),
          "utf-8",
        );
        return `# Chapter ${chapter.number}: ${chapter.title}\nWord count: ${chapter.wordCount}\n\n${content}`;
      },
    }),

    readChapters: tool({
      description:
        "Read multiple chapters at once. Useful for comparing themes across chapters.",
      inputSchema: z.object({
        chapterNumbers: z
          .array(z.number())
          .describe("List of chapter numbers to read"),
      }),
      execute: async ({ chapterNumbers }) => {
        const chapters = await loadChapters(bookId);
        const results: string[] = [];
        for (const num of chapterNumbers) {
          const chapter = chapters.find((c) => c.number === num);
          if (!chapter) {
            results.push(`--- Chapter ${num}: NOT FOUND ---`);
            continue;
          }
          const content = await fs.readFile(
            bookPath(bookId, chapter.markdownPath),
            "utf-8",
          );
          results.push(
            `--- Chapter ${chapter.number}: ${chapter.title} (${chapter.wordCount} words) ---\n\n${content}`,
          );
        }
        return results.join("\n\n");
      },
    }),

    searchBook: tool({
      description:
        "Search for a term or phrase across all chapters. Returns matching lines with context.",
      inputSchema: z.object({
        query: z.string().describe("The search term or phrase"),
      }),
      execute: async ({ query }) => {
        const chapters = await loadChapters(bookId);
        const queryLower = query.toLowerCase();
        const results: string[] = [];

        for (const ch of chapters) {
          const mdPath = bookPath(bookId, ch.markdownPath);
          if (!(await fs.pathExists(mdPath))) continue;
          const content = await fs.readFile(mdPath, "utf-8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(queryLower)) {
              results.push(
                `Ch ${ch.number} "${ch.title}", line ${i + 1}:\n  ${lines[i].trim().slice(0, 150)}`,
              );
            }
          }
        }

        if (!results.length) return `No matches found for "${query}".`;
        const header = `Found ${results.length} match(es) for "${query}":\n\n`;
        if (results.length > 25) {
          return (
            header +
            results.slice(0, 25).join("\n\n") +
            `\n\n... and ${results.length - 25} more.`
          );
        }
        return header + results.join("\n\n");
      },
    }),

    saveNote: tool({
      description:
        "Save a note, question, or insight about a specific chapter. Notes persist across sessions.",
      inputSchema: z.object({
        chapterNumber: z.number().describe("The chapter this note relates to"),
        note: z.string().describe("The note content"),
        noteType: z
          .enum(["note", "question", "insight", "confusion", "connection"])
          .describe("Type of note"),
      }),
      execute: async ({ chapterNumber, note, noteType }) => {
        const notesPath = bookPath(bookId, "notes.json");
        const notes = (await fs.pathExists(notesPath))
          ? await fs.readJson(notesPath)
          : [];
        notes.push({
          chapter: chapterNumber,
          type: noteType,
          content: note,
          created_at: new Date().toISOString(),
        });
        await fs.writeJson(notesPath, notes, { spaces: 2 });
        return `Note saved (#${notes.length}): [${noteType}] for chapter ${chapterNumber}`;
      },
    }),

    getNotes: tool({
      description:
        "Retrieve all saved notes for this book. Use this to recall previous questions, insights, and confusions.",
      inputSchema: z.object({}),
      execute: async () => {
        const notesPath = bookPath(bookId, "notes.json");
        if (!(await fs.pathExists(notesPath))) return "No notes saved yet.";
        const notes = await fs.readJson(notesPath);
        if (!notes.length) return "No notes saved yet.";
        return notes
          .map(
            (
              n: {
                type: string;
                chapter: number;
                created_at: string;
                content: string;
              },
              i: number,
            ) =>
              `#${i + 1} [${n.type}] Ch ${n.chapter} (${n.created_at.slice(0, 10)}):\n  ${n.content}`,
          )
          .join("\n\n");
      },
    }),

    saveConcepts: tool({
      description:
        "Save or update extracted concepts and relationships. Builds a knowledge graph over time. Call this after reading chapters and identifying key concepts.",
      inputSchema: z.object({
        concepts: z
          .array(
            z.object({
              name: z.string(),
              definition: z.string(),
              chapters: z.array(z.number()).optional(),
              related_concepts: z.array(z.string()).optional(),
            }),
          )
          .describe("Concepts to save or update"),
        relationships: z
          .array(
            z.object({
              from: z.string(),
              to: z.string(),
              type: z.string(),
            }),
          )
          .optional()
          .describe("Relationships between concepts"),
      }),
      execute: async ({ concepts, relationships }) => {
        const conceptsPath = bookPath(bookId, "concepts.json");
        const existing = (await fs.pathExists(conceptsPath))
          ? await fs.readJson(conceptsPath)
          : { concepts: [], relationships: [] };

        // Normalize old array format
        if (Array.isArray(existing)) {
          const migrated = existing.map(
            (item: {
              name?: string;
              definition?: string;
              source_chapter?: number;
            }) => ({
              name: item.name ?? "",
              definition: item.definition ?? "",
              chapters: item.source_chapter ? [item.source_chapter] : [],
            }),
          );
          existing.concepts = migrated;
          existing.relationships = [];
        }

        // Merge concepts by name
        const byName: Record<string, (typeof concepts)[0]> = {};
        for (const c of existing.concepts ?? [])
          byName[c.name.toLowerCase()] = c;
        for (const c of concepts) {
          const key = c.name.toLowerCase();
          if (byName[key]) {
            byName[key].definition = c.definition || byName[key].definition;
            const chs = new Set([
              ...(byName[key].chapters ?? []),
              ...(c.chapters ?? []),
            ]);
            byName[key].chapters = [...chs].sort();
          } else {
            byName[key] = c;
          }
        }

        // Merge relationships
        const existingRels = new Set(
          (existing.relationships ?? []).map(
            (r: { from: string; to: string; type: string }) =>
              `${r.from}|${r.to}|${r.type}`,
          ),
        );
        const newRels = [...(existing.relationships ?? [])];
        for (const r of relationships ?? []) {
          const key = `${r.from}|${r.to}|${r.type}`;
          if (!existingRels.has(key)) {
            newRels.push(r);
            existingRels.add(key);
          }
        }

        const result = {
          concepts: Object.values(byName),
          relationships: newRels,
        };
        await fs.writeJson(conceptsPath, result, { spaces: 2 });
        return `Concept map updated: ${result.concepts.length} concepts, ${result.relationships.length} relationships.`;
      },
    }),

    getConcepts: tool({
      description:
        "Retrieve the concept map. Check this before answering questions to see if relevant concepts have already been extracted.",
      inputSchema: z.object({}),
      execute: async () => {
        const conceptsPath = bookPath(bookId, "concepts.json");
        if (!(await fs.pathExists(conceptsPath)))
          return "No concepts extracted yet.";
        const data = await fs.readJson(conceptsPath);
        const concepts = data.concepts ?? data;
        if (!concepts.length) return "No concepts extracted yet.";
        const lines = concepts.map(
          (c: { name: string; definition?: string; chapters?: number[] }) =>
            `**${c.name}**: ${c.definition ?? "N/A"} (Ch: ${(c.chapters ?? []).join(", ") || "N/A"})`,
        );
        return lines.join("\n\n");
      },
    }),

    createArtifact: tool({
      description:
        "Create a new HTML artifact (concept map, study guide, diagram, quiz, etc.). Write self-contained HTML with inline CSS and SVG. The artifact will be saved and displayed to the user.",
      inputSchema: z.object({
        title: z.string().describe("Title for the artifact"),
        description: z.string().describe("Brief description of what it shows"),
        htmlContent: z
          .string()
          .describe("Complete self-contained HTML with inline CSS"),
        chapters: z
          .array(z.number())
          .describe("Chapter numbers this artifact relates to"),
      }),
      execute: async ({ title, description, htmlContent, chapters }) => {
        const entry = await createArtifact(bookId, {
          title,
          description,
          htmlContent,
          chapters,
        });
        return `Artifact created: "${entry.title}" (id: ${entry.id}). It is now visible in the user's Artifacts tab.`;
      },
    }),

    updateArtifact: tool({
      description:
        "Update an existing artifact with new HTML content. Creates a new version (previous versions are preserved).",
      inputSchema: z.object({
        artifactId: z.string().describe("The artifact ID to update"),
        htmlContent: z.string().describe("The updated HTML content"),
        changeNote: z.string().describe("Brief description of what changed"),
      }),
      execute: async ({ artifactId, htmlContent, changeNote }) => {
        const meta = await updateArtifact(bookId, artifactId, {
          htmlContent,
          changeNote,
        });
        return `Artifact updated to v${meta.currentVersion}: "${meta.title}" — ${changeNote}`;
      },
    }),

    getArtifact: tool({
      description:
        "Read an artifact's current HTML content. Use this before updating an artifact so you can see the current state.",
      inputSchema: z.object({
        artifactId: z.string().describe("The artifact ID to read"),
      }),
      execute: async ({ artifactId }) => {
        const html = await getArtifactHtml(bookId, artifactId);
        if (!html) return `Artifact ${artifactId} not found.`;
        const meta = await getArtifact(bookId, artifactId);
        return `Artifact: "${meta?.title}" (v${meta?.currentVersion})\n\n${html}`;
      },
    }),

    getArtifacts: tool({
      description: "List all artifacts the user has created for this book.",
      inputSchema: z.object({}),
      execute: async () => {
        const artifacts = await listArtifacts(bookId);
        if (!artifacts.length) return "No artifacts created yet.";
        return artifacts
          .map(
            (a) =>
              `- "${a.title}" (id: ${a.id}, v${a.currentVersion}, chapters: ${a.chapters.join(", ") || "none"})\n  ${a.description}`,
          )
          .join("\n\n");
      },
    }),

    saveSessionSummary: tool({
      description:
        "Save a summary of the current conversation for context in future sessions. Call this proactively every few messages.",
      inputSchema: z.object({
        summary: z
          .string()
          .describe("Brief summary of what was discussed and discovered"),
        openQuestions: z
          .array(z.string())
          .describe("Questions or topics still open for exploration"),
      }),
      execute: async ({ summary, openQuestions }) => {
        await saveSessionSummary(bookId, {
          lastUpdated: new Date().toISOString(),
          summary,
          openQuestions,
        });
        return "Session summary saved.";
      },
    }),
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/chat-tools.ts
git commit -m "feat: add chat tool definitions for AI SDK"
```

---

### Task 5: Chat API Route

**Files:**

- Create: `src/app/api/chat/[bookId]/route.ts`

**Step 1: Implement the streaming chat endpoint**

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import fs from "fs-extra";
import path from "path";
import { createBookTools } from "@/lib/chat-tools";
import { getSessionSummary } from "@/lib/session";
import { listArtifacts } from "@/lib/artifacts";

export const maxDuration = 60;

const DATA_DIR = path.join(process.cwd(), "data", "books");

interface ChatRequest {
  messages: UIMessage[];
  activeView?: {
    type: "chapter" | "artifact";
    id: string;
  };
}

async function buildSystemPrompt(
  bookId: string,
  activeView?: ChatRequest["activeView"],
): Promise<string> {
  const bookDir = path.join(DATA_DIR, bookId);
  const metadataPath = path.join(bookDir, "metadata.json");

  let bookContext = "";
  if (await fs.pathExists(metadataPath)) {
    const meta = await fs.readJson(metadataPath);
    bookContext = `You are helping the user explore "${meta.title}" by ${meta.author}. The book has ${meta.chapterCount} chapters.`;
  }

  // Load session summary
  let sessionContext = "";
  const session = await getSessionSummary(bookId);
  if (session) {
    sessionContext = `\n\n## Previous Session Context\n${session.summary}`;
    if (session.openQuestions?.length) {
      sessionContext += `\n\nOpen questions from last time:\n${session.openQuestions.map((q) => `- ${q}`).join("\n")}`;
    }
  }

  // Load artifact index
  let artifactContext = "";
  const artifacts = await listArtifacts(bookId);
  if (artifacts.length) {
    artifactContext = `\n\n## User's Artifacts (${artifacts.length})\n${artifacts.map((a) => `- "${a.title}" (id: ${a.id}) — ${a.description}`).join("\n")}`;
  }

  // Active view context
  let viewContext = "";
  if (activeView?.type === "chapter") {
    viewContext = `\n\nThe user is currently viewing Chapter ${activeView.id}. You can reference it directly or use readChapter to load its content.`;
  } else if (activeView?.type === "artifact") {
    viewContext = `\n\nThe user is currently viewing artifact "${activeView.id}". Use getArtifact to read its content if they want to discuss or edit it.`;
  }

  return `You are a book learning assistant. You help users deeply understand books through conversation, exploration, and creating artifacts.

${bookContext}

## What you can do

- **Read** individual chapters or multiple chapters at once
- **Search** across the book for specific terms, themes, or concepts
- **Take notes** — save questions, insights, confusions, and connections that persist across sessions
- **Extract concepts** — build a knowledge graph of key concepts and relationships
- **Create artifacts** — self-contained HTML files with visual explainers, concept maps, study guides, chapter breakdowns, diagrams (using inline SVG), comparison tables, quizzes, or any other learning aid
- **Edit artifacts** — update existing artifacts when the user wants changes

## How to behave

- Adapt to the user's knowledge level. Simplify for beginners, go deeper for experts.
- When creating artifacts, make them visually clean with good typography. Use inline CSS and SVG. Make them self-contained (no external dependencies).
- Be concise in conversation. Save the detail for artifacts.
- When summarizing chapters, capture the key stories and anecdotes.
- If the user asks about themes spanning multiple chapters, read the relevant chapters first.
- Check getNotes and getConcepts early in the conversation if the user has worked with this book before.
- When you read chapters and identify important concepts, proactively use saveConcepts.
- Proactively call saveSessionSummary every 4-5 exchanges to preserve context.
- When creating visual outputs (concept maps, guides, diagrams), ALWAYS use createArtifact — never put HTML in the chat.${sessionContext}${artifactContext}${viewContext}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const { messages, activeView }: ChatRequest = await req.json();

  const systemPrompt = await buildSystemPrompt(bookId, activeView);
  const tools = createBookTools(bookId);

  const result = streamText({
    model: anthropic("claude-sonnet-4-5-20250514"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
```

**Step 2: Commit**

```bash
git add src/app/api/chat/[bookId]/route.ts
git commit -m "feat: add streaming chat API route with book tools"
```

---

### Task 6: Chat Panel Component

**Files:**

- Create: `src/components/chat/ChatPanel.tsx`
- Create: `src/components/chat/ChatMessage.tsx`
- Create: `src/components/chat/ArtifactCard.tsx`

**Step 1: Create ChatPanel**

The main chat UI component using `useChat` from `@ai-sdk/react`.

```typescript
// src/components/chat/ChatPanel.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";

interface ChatPanelProps {
  bookId: string;
  activeView?: { type: "chapter" | "artifact"; id: string };
  onArtifactCreated?: () => void;
}

export function ChatPanel({ bookId, activeView, onArtifactCreated }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    api: `/api/chat/${bookId}`,
    body: { activeView },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect artifact creation in tool results and notify parent
  useEffect(() => {
    if (!onArtifactCreated) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const hasArtifactTool = last.parts?.some(
      (p) =>
        p.type === "tool-createArtifact" || p.type === "tool-updateArtifact",
    );
    if (hasArtifactTool) onArtifactCreated();
  }, [messages, onArtifactCreated]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-medium text-gray-700">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8">
            <p>Ask me anything about this book.</p>
            <p className="mt-1">
              I can read chapters, search for themes, create concept maps, study
              guides, and more.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <span className="animate-pulse">●</span>
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isLoading) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="p-4 border-t border-gray-200 bg-white"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this book..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Create ChatMessage**

```typescript
// src/components/chat/ChatMessage.tsx
"use client";

import type { UIMessage } from "ai";
import { ArtifactCard } from "./ArtifactCard";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
          isUser
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {message.parts?.map((part, i) => {
          switch (part.type) {
            case "text":
              return (
                <div key={i} className="whitespace-pre-wrap leading-relaxed">
                  {part.text}
                </div>
              );
            case "tool-createArtifact":
            case "tool-updateArtifact":
              return (
                <ArtifactCard
                  key={i}
                  toolName={part.type}
                  args={part.args}
                  result={part.result}
                />
              );
            default:
              // Hide other tool calls (search, read, etc.)
              return null;
          }
        })}
      </div>
    </div>
  );
}
```

**Step 3: Create ArtifactCard**

```typescript
// src/components/chat/ArtifactCard.tsx
"use client";

interface ArtifactCardProps {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

export function ArtifactCard({ toolName, args }: ArtifactCardProps) {
  const isUpdate = toolName === "tool-updateArtifact";
  const title = (args.title as string) ?? "Artifact";

  return (
    <div className="my-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">{isUpdate ? "✏️" : "📄"}</span>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {isUpdate ? "Updated" : "Created"}: {title}
          </p>
          {args.description && (
            <p className="text-xs text-gray-500">
              {args.description as string}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/chat/
git commit -m "feat: add chat panel, message, and artifact card components"
```

---

### Task 7: Artifact Display Components

**Files:**

- Create: `src/components/artifacts/ArtifactList.tsx`
- Create: `src/components/artifacts/ArtifactViewer.tsx`

**Step 1: Create ArtifactList**

```typescript
// src/components/artifacts/ArtifactList.tsx
"use client";

import type { ArtifactIndexEntry } from "@/types/book";

interface ArtifactListProps {
  artifacts: ArtifactIndexEntry[];
  onSelect: (artifactId: string) => void;
  selectedId?: string;
}

export function ArtifactList({
  artifacts,
  onSelect,
  selectedId,
}: ArtifactListProps) {
  if (!artifacts.length) {
    return (
      <div className="text-center text-gray-400 text-sm py-8">
        <p>No artifacts yet.</p>
        <p className="mt-1">
          Ask the chat agent to create concept maps, study guides, or diagrams.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {artifacts.map((artifact) => (
        <button
          key={artifact.id}
          onClick={() => onSelect(artifact.id)}
          className={`w-full text-left p-4 border rounded-lg transition-all ${
            selectedId === artifact.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
          }`}
        >
          <h3 className="font-serif font-semibold text-gray-900 text-sm">
            {artifact.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{artifact.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span>v{artifact.currentVersion}</span>
            {artifact.chapters.length > 0 && (
              <span>Ch {artifact.chapters.join(", ")}</span>
            )}
            <span>{new Date(artifact.updatedAt).toLocaleDateString()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Create ArtifactViewer**

```typescript
// src/components/artifacts/ArtifactViewer.tsx
"use client";

import { useState, useEffect } from "react";
import type { ArtifactMeta } from "@/types/book";

interface ArtifactViewerProps {
  bookId: string;
  artifactId: string;
}

export function ArtifactViewer({ bookId, artifactId }: ArtifactViewerProps) {
  const [meta, setMeta] = useState<ArtifactMeta | null>(null);
  const [html, setHtml] = useState<string>("");
  const [viewVersion, setViewVersion] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(
        `/api/artifacts/${bookId}/${artifactId}${viewVersion ? `?version=${viewVersion}` : ""}`,
      );
      if (res.ok) {
        const data = await res.json();
        setMeta(data.meta);
        setHtml(data.html);
        if (!viewVersion) setViewVersion(data.meta.currentVersion);
      }
      setLoading(false);
    }
    load();
  }, [bookId, artifactId, viewVersion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading...
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Artifact not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with version nav */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700 truncate">
          {meta.title}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => setViewVersion((v) => Math.max(1, v - 1))}
            disabled={viewVersion <= 1}
            className="px-1 hover:text-gray-900 disabled:opacity-30"
          >
            ←
          </button>
          <span>
            v{viewVersion}/{meta.currentVersion}
          </span>
          <button
            onClick={() =>
              setViewVersion((v) => Math.min(meta.currentVersion, v + 1))
            }
            disabled={viewVersion >= meta.currentVersion}
            className="px-1 hover:text-gray-900 disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      {/* Sandboxed iframe */}
      <div className="flex-1">
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          className="w-full h-full border-0"
          title={meta.title}
        />
      </div>
    </div>
  );
}
```

**Step 3: Create Artifact API route for fetching artifact data**

Create `src/app/api/artifacts/[bookId]/[artifactId]/route.ts`:

```typescript
import { getArtifact, getArtifactHtml } from "@/lib/artifacts";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; artifactId: string }> },
) {
  const { bookId, artifactId } = await params;
  const version = req.nextUrl.searchParams.get("version");

  const meta = await getArtifact(bookId, artifactId);
  if (!meta) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const html = await getArtifactHtml(
    bookId,
    artifactId,
    version ? parseInt(version, 10) : undefined,
  );

  return Response.json({ meta, html });
}
```

**Step 4: Create Artifacts list API route**

Create `src/app/api/artifacts/[bookId]/route.ts`:

```typescript
import { listArtifacts } from "@/lib/artifacts";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const artifacts = await listArtifacts(bookId);
  return Response.json({ artifacts });
}
```

**Step 5: Commit**

```bash
git add src/components/artifacts/ src/app/api/artifacts/
git commit -m "feat: add artifact list, viewer components, and API routes"
```

---

### Task 8: Refactor Book Detail Page

**Files:**

- Modify: `src/app/book/[id]/page.tsx`

This is the integration point — transform the book detail page into the split layout with tabs and chat panel.

**Step 1: Create the client-side book detail component**

The page itself stays as a server component (data fetching), but delegates rendering to a client component that manages the tab state, chat panel, and artifact loading.

Create `src/components/BookDetailView.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { BookWithChapters, ArtifactIndexEntry } from "@/types/book";
import { ChapterList } from "@/components/ChapterList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ArtifactList } from "@/components/artifacts/ArtifactList";
import { ArtifactViewer } from "@/components/artifacts/ArtifactViewer";

interface BookDetailViewProps {
  book: BookWithChapters;
  initialArtifacts: ArtifactIndexEntry[];
}

type Tab = "chapters" | "artifacts";

export function BookDetailView({ book, initialArtifacts }: BookDetailViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chapters");
  const [chatOpen, setChatOpen] = useState(true);
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<
    { type: "chapter" | "artifact"; id: string } | undefined
  >(undefined);

  const refreshArtifacts = useCallback(async () => {
    const res = await fetch(`/api/artifacts/${book.id}`);
    if (res.ok) {
      const data = await res.json();
      setArtifacts(data.artifacts);
    }
  }, [book.id]);

  const handleArtifactSelect = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setActiveView({ type: "artifact", id: artifactId });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          <span>←</span>
          <span>Back to library</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — book content */}
        <div
          className={`flex-1 overflow-y-auto ${chatOpen ? "border-r border-gray-200" : ""}`}
        >
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Book header */}
            <header className="flex gap-8 mb-8">
              <div className="w-24 shrink-0">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={`Cover of ${book.title}`}
                    className="w-full rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-3xl">📖</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-serif font-bold text-gray-900 mb-1">
                  {book.title}
                </h1>
                <p className="text-lg text-gray-600 mb-3">{book.author}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{book.chapterCount} chapters</span>
                  {book.voiceProfile && (
                    <span className="capitalize">
                      {book.voiceProfile.tone} · {book.voiceProfile.style}
                    </span>
                  )}
                </div>
              </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-gray-200">
              <button
                onClick={() => {
                  setActiveTab("chapters");
                  setSelectedArtifactId(null);
                  setActiveView(undefined);
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "chapters"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Chapters
              </button>
              <button
                onClick={() => {
                  setActiveTab("artifacts");
                  refreshArtifacts();
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "artifacts"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Artifacts
                {artifacts.length > 0 && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {artifacts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "chapters" && (
              <ChapterList bookId={book.id} chapters={book.chapters} />
            )}

            {activeTab === "artifacts" && !selectedArtifactId && (
              <ArtifactList
                artifacts={artifacts}
                onSelect={handleArtifactSelect}
              />
            )}

            {activeTab === "artifacts" && selectedArtifactId && (
              <div>
                <button
                  onClick={() => {
                    setSelectedArtifactId(null);
                    setActiveView(undefined);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                  ← Back to artifacts
                </button>
                <div className="h-[600px] border border-gray-200 rounded-lg overflow-hidden">
                  <ArtifactViewer
                    bookId={book.id}
                    artifactId={selectedArtifactId}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — chat */}
        {chatOpen ? (
          <div className="w-96 flex flex-col bg-white">
            <ChatPanel
              bookId={book.id}
              activeView={activeView}
              onArtifactCreated={refreshArtifacts}
            />
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed right-4 bottom-4 w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
            title="Open chat"
          >
            💬
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Update the book detail page to use the new component**

Replace `src/app/book/[id]/page.tsx` with:

```typescript
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getBook } from "@/lib/books";
import { listArtifacts } from "@/lib/artifacts";
import { BookDetailView } from "@/components/BookDetailView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const book = await getBook(id, session?.user?.id);

  if (!book) {
    notFound();
  }

  const artifacts = await listArtifacts(id);

  return <BookDetailView book={book} initialArtifacts={artifacts} />;
}
```

**Step 3: Run lint and typecheck**

Run: `npm run lint`
Run: `npx tsc --noEmit`
Expected: Both pass

**Step 4: Commit**

```bash
git add src/components/BookDetailView.tsx src/app/book/[id]/page.tsx
git commit -m "feat: refactor book detail page with split layout, tabs, and chat"
```

---

### Task 9: Integration Test & Polish

**Step 1: Verify the full flow locally**

Run: `npm run dev`

1. Navigate to a book detail page (e.g. `/book/32f9d9359972`)
2. Verify the split layout renders — chapters on left, chat on right
3. Type a message in the chat (e.g. "What chapters does this book have?")
4. Verify the agent responds with chapter list (uses `listChapters` tool)
5. Ask "Create a concept map for chapter 1"
6. Verify an artifact is created and appears in the Artifacts tab
7. Click the artifact to view it in the iframe
8. Test version navigation (ask the agent to edit the artifact)

**Step 2: Fix any issues found during testing**

Address type errors, styling issues, or tool execution problems.

**Step 3: Run quality gates**

Run: `npm run lint`
Run: `npx tsc --noEmit`
Run: `npm test`
Expected: All pass

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete web chat agent integration"
```

---

### Summary of New Files

| File                                                   | Purpose                                         |
| ------------------------------------------------------ | ----------------------------------------------- |
| `src/types/book.ts`                                    | Modified — artifact and session types added     |
| `src/lib/artifacts.ts`                                 | Artifact CRUD (create, update, read, list)      |
| `src/lib/session.ts`                                   | Session summary read/write                      |
| `src/lib/chat-tools.ts`                                | AI SDK tool definitions for all book operations |
| `src/app/api/chat/[bookId]/route.ts`                   | Streaming chat endpoint                         |
| `src/app/api/artifacts/[bookId]/route.ts`              | List artifacts API                              |
| `src/app/api/artifacts/[bookId]/[artifactId]/route.ts` | Get artifact HTML + meta API                    |
| `src/components/chat/ChatPanel.tsx`                    | Chat UI with useChat hook                       |
| `src/components/chat/ChatMessage.tsx`                  | Message rendering with tool call handling       |
| `src/components/chat/ArtifactCard.tsx`                 | Clickable artifact card in chat                 |
| `src/components/artifacts/ArtifactList.tsx`            | Artifact grid in Artifacts tab                  |
| `src/components/artifacts/ArtifactViewer.tsx`          | Sandboxed iframe viewer with version nav        |
| `src/components/BookDetailView.tsx`                    | Split-layout book page with tabs and chat       |
| `src/__tests__/lib/artifacts.test.ts`                  | Artifact CRUD tests                             |

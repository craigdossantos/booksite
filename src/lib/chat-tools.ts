import { tool } from "ai";
import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import { loadChapters, getChapterContent } from "@/lib/books";
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
        const content = await getChapterContent(bookId, chapter.markdownPath);
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
          const content = await getChapterContent(bookId, chapter.markdownPath);
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
          const content = await getChapterContent(bookId, ch.markdownPath);
          if (!content) continue;
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
        let existing: {
          concepts: Array<{
            name: string;
            definition: string;
            chapters?: number[];
          }>;
          relationships: Array<{ from: string; to: string; type: string }>;
        };

        if (await fs.pathExists(conceptsPath)) {
          const raw = await fs.readJson(conceptsPath);
          // Normalize old array format
          if (Array.isArray(raw)) {
            existing = {
              concepts: raw.map(
                (item: {
                  name?: string;
                  definition?: string;
                  source_chapter?: number;
                }) => ({
                  name: item.name ?? "",
                  definition: item.definition ?? "",
                  chapters: item.source_chapter ? [item.source_chapter] : [],
                }),
              ),
              relationships: [],
            };
          } else {
            existing = raw;
          }
        } else {
          existing = { concepts: [], relationships: [] };
        }

        // Merge concepts by name
        const byName: Record<
          string,
          { name: string; definition: string; chapters?: number[] }
        > = {};
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
            (r) => `${r.from}|${r.to}|${r.type}`,
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
        type: z
          .enum(["summary", "quiz", "diagram", "note"])
          .describe("The type of artifact being created"),
      }),
      execute: async ({ title, description, htmlContent, chapters, type }) => {
        const entry = await createArtifact(bookId, {
          title,
          description,
          htmlContent,
          chapters,
          type,
        });
        return JSON.stringify({
          action: "created",
          id: entry.id,
          title: entry.title,
          message: `Artifact created: "${entry.title}" (id: ${entry.id}). It is now visible in the user's Artifacts tab.`,
        });
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
        return JSON.stringify({
          action: "updated",
          id: artifactId,
          title: meta.title,
          version: meta.currentVersion,
          message: `Artifact updated to v${meta.currentVersion}: "${meta.title}" — ${changeNote}`,
        });
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

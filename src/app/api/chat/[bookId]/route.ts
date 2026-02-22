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

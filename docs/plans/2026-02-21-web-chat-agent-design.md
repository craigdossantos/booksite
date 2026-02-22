# Web Chat Agent Design

## Overview

Add an interactive AI chat agent to the book detail page. Users chat with Claude about a book — asking questions, exploring themes, and creating artifacts (concept maps, study guides, diagrams) that persist as first-class content alongside chapters and summaries.

Built with the Vercel AI SDK (`streamText` + `useChat`), running entirely within the existing Next.js app.

## Goals

- Non-technical users can chat with an agent about any uploaded book
- Agent has full access to book content: chapters, search, notes, concepts
- Artifacts (HTML learning materials) are first-class, versioned content the user builds up over time
- Session context persists via summaries, not full chat history
- Single deployment — no separate Python service

## Page Layout

The book detail page (`/book/[id]`) becomes a split layout:

```
┌──────────────────────────────────────────────────────────┐
│  <- Back to library                                      │
├──────────────────────────────┬───────────────────────────┤
│                              │                           │
│  Book Header (title, author) │   Chat Panel              │
│                              │   ┌───────────────────┐   │
│  --- Tabs ---------------    │   │ Messages...        │   │
│  [Chapters] [Artifacts]      │   │                    │   │
│                              │   │                    │   │
│  Chapter/Artifact content    │   │                    │   │
│  depending on active tab     │   └───────────────────┘   │
│                              │   ┌───────────────────┐   │
│                              │   │ Type a message...  │   │
│                              │   └───────────────────┘   │
└──────────────────────────────┴───────────────────────────┘
```

- **Left:** Book content with tabs for Chapters and Artifacts
- **Right:** Collapsible chat panel (toggle button when closed)
- **Mobile:** Chat becomes a bottom sheet/drawer

## API Route

`POST /api/chat/[bookId]/route.ts`

Uses `streamText()` from the Vercel AI SDK with Claude (via `@ai-sdk/anthropic`).

### Request Shape

```typescript
{
  messages: Message[],
  activeView?: {
    type: "chapter" | "artifact",
    id: string  // chapter number or artifact ID
  }
}
```

The `activeView` tells the agent what the user is currently looking at, so it can discuss or edit it without the user having to specify.

### System Prompt

Includes at conversation start:

1. Session summary (from `session-summary.json`) — what was discussed last time
2. Artifact index (titles, descriptions, chapter refs — not full HTML)
3. If `activeView` references an artifact, the full HTML of that artifact
4. If `activeView` references a chapter, instruction to read it via tool

Notes and concepts are available via tools, loaded on demand.

## Tools

All tools operate on `data/books/{bookId}/`. The `bookId` comes from the route parameter.

### Book Reading

| Tool           | Description                                   | Reads             |
| -------------- | --------------------------------------------- | ----------------- |
| `listChapters` | Chapter titles, word counts, summary previews | `chapters.json`   |
| `readChapter`  | Full markdown of one chapter                  | `chapters/{n}.md` |
| `readChapters` | Multiple chapters at once                     | `chapters/{n}.md` |
| `searchBook`   | Keyword search across all chapter markdown    | All `.md` files   |

### Notes

| Tool       | Description                                     | File         |
| ---------- | ----------------------------------------------- | ------------ |
| `saveNote` | Persist a note, question, insight, or confusion | `notes.json` |
| `getNotes` | Retrieve all saved notes                        | `notes.json` |

### Concepts / Knowledge Graph

| Tool           | Description                           | File            |
| -------------- | ------------------------------------- | --------------- |
| `saveConcepts` | Add/update concepts and relationships | `concepts.json` |
| `getConcepts`  | Retrieve the full concept map         | `concepts.json` |

### Artifacts

| Tool             | Description                                     | Files                           |
| ---------------- | ----------------------------------------------- | ------------------------------- |
| `createArtifact` | Create a new artifact (HTML + metadata)         | `artifacts/{id}/`               |
| `updateArtifact` | Edit an existing artifact (creates new version) | `artifacts/{id}/`               |
| `getArtifact`    | Read an artifact's current HTML                 | `artifacts/{id}/`               |
| `getArtifacts`   | List all artifacts with metadata                | `artifacts/artifact-index.json` |

### Session

| Tool                 | Description                  | File                   |
| -------------------- | ---------------------------- | ---------------------- |
| `saveSessionSummary` | Write/update session context | `session-summary.json` |

### Built-in (Vercel AI SDK)

- `webSearch` — search the web for author interviews, related content, etc.

## Artifact Storage

### Directory Structure

```
data/books/{bookId}/artifacts/
  artifact-index.json
  {artifactId}/
    v1.html
    v2.html
    v3.html
    meta.json
```

### `artifact-index.json`

```json
[
  {
    "id": "a1b2c3",
    "title": "Chapter 3 Concept Map",
    "description": "Visual map of key negotiation tactics",
    "currentVersion": 3,
    "createdAt": "2026-02-21T...",
    "updatedAt": "2026-02-21T...",
    "chapters": [3]
  }
]
```

### `meta.json` (per artifact)

```json
{
  "id": "a1b2c3",
  "title": "Chapter 3 Concept Map",
  "description": "Visual map of key negotiation tactics",
  "versions": [
    {
      "version": 1,
      "createdAt": "2026-02-21T...",
      "changeNote": "Initial creation"
    },
    {
      "version": 2,
      "createdAt": "2026-02-21T...",
      "changeNote": "Warmer color palette"
    },
    {
      "version": 3,
      "createdAt": "2026-02-21T...",
      "changeNote": "Added chapter 4 concepts"
    }
  ],
  "currentVersion": 3,
  "chapters": [3, 4]
}
```

### Artifact Lifecycle

1. User asks agent for a visual/standalone output
2. Agent creates HTML content, calls `createArtifact` with title, description, HTML, chapter refs
3. Tool writes `v1.html`, creates `meta.json`, updates `artifact-index.json`
4. Chat message includes a clickable artifact card that opens/focuses it in the Artifacts tab
5. User can ask agent to edit: "make the colors warmer"
6. Agent calls `getArtifact` to read current HTML, modifies it, calls `updateArtifact`
7. Tool writes `v2.html`, updates `meta.json` and index
8. UI shows version navigation arrows (like Claude's artifact viewer)

### Rendering

Artifacts render in a sandboxed iframe with restrictive CSP. Self-contained HTML only — inline CSS, inline SVG, no external dependencies.

## Session Persistence

### Session Summary

The agent proactively saves a rolling session summary every few messages via `saveSessionSummary`. This ensures context is preserved even if the user closes the tab unexpectedly.

```json
// data/books/{bookId}/session-summary.json
{
  "lastUpdated": "2026-02-21T...",
  "summary": "User explored chapters 1-3 focusing on negotiation tactics. Created a concept map artifact for mirroring techniques. Had questions about tactical empathy vs regular empathy.",
  "openQuestions": [
    "How does tactical empathy differ from cognitive empathy?",
    "Connection between labeling and loss aversion"
  ]
}
```

### What Persists Across Sessions

- Session summary (agent-written recap)
- Notes (user/agent-saved insights, questions, confusions)
- Concepts (knowledge graph built over time)
- Artifacts (versioned HTML learning materials)

### What Does Not Persist

- Full chat message history (starts fresh each session)

## Context Loading on Conversation Start

The system prompt is assembled from:

1. **Static instructions** — agent personality, behavior guidelines, tool usage patterns
2. **Session summary** — loaded from `session-summary.json` if it exists
3. **Artifact index** — titles and descriptions of all saved artifacts (not full HTML)
4. **Active view context** — if user is viewing a chapter or artifact, that content is included or the agent is instructed to load it

The agent is instructed to call `getNotes` and `getConcepts` at the start if notes/concepts exist, to refresh its understanding of the user's progress.

## New Components

| Component          | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `ChatPanel`        | Right-side chat UI — message list, input, streaming responses   |
| `ChatMessage`      | Individual message rendering (text, tool calls, artifact cards) |
| `ChatToggle`       | Button to open/close the chat panel                             |
| `ArtifactCard`     | Clickable card in chat that links to an artifact                |
| `ArtifactList`     | Grid/list of artifacts in the Artifacts tab                     |
| `ArtifactViewer`   | Renders artifact HTML in sandboxed iframe with version nav      |
| `BookDetailLayout` | New split-screen layout wrapper for the book page               |

## New Files

```
src/app/api/chat/[bookId]/route.ts      — Chat streaming endpoint
src/lib/chat-tools.ts                    — Tool definitions for the AI SDK
src/lib/artifacts.ts                     — Artifact CRUD (create, read, update, list)
src/components/chat/ChatPanel.tsx        — Chat panel component
src/components/chat/ChatMessage.tsx      — Message rendering
src/components/chat/ChatToggle.tsx       — Open/close button
src/components/chat/ArtifactCard.tsx     — Artifact reference card in chat
src/components/artifacts/ArtifactList.tsx    — Artifacts tab content
src/components/artifacts/ArtifactViewer.tsx  — Sandboxed renderer + version nav
src/app/book/[id]/page.tsx               — Modified: split layout with chat
```

## Out of Scope (For Now)

- Multi-user artifact sharing
- Artifact commenting/annotation
- Real-time collaboration
- Artifact export (PDF, image)
- Chat history storage
- Authentication-gated chat (uses existing auth)

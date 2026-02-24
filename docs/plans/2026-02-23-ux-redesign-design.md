# UX Redesign — Artifact Workspace

**Date:** 2026-02-23
**Status:** Approved
**Approach:** Incremental reskin (Approach A) — restyle existing components in place
**Branch:** feat/ux-redesign
**Reference:** docs/stitch-design/screen.png, docs/stitch-design/code.html

## Summary

Full app overhaul from the current Medium-inspired minimal reader to a three-panel "Artifact Workspace" layout. Slate color palette, Plus Jakarta Sans typography, Material Symbols icons. The book detail page becomes the primary workspace for exploring AI-generated artifacts. The library page gets a visual refresh to match.

## Design Decisions

| Decision       | Choice                                               | Rationale                                                     |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Scope          | Full app overhaul                                    | Library + book detail + header, all match new visual language |
| Approach       | Incremental reskin                                   | Low risk, each step testable, reuses working logic            |
| Artifact types | AI auto-classifies on creation                       | Add `type` field to schema, AI picks type via tool parameter  |
| AI companion   | "Book Companion" — suggestions + styling, no persona | Context-aware suggestion chips, no avatar or character name   |
| Icons          | Google Material Symbols                              | Matches Stitch design, large icon set, loaded via CDN         |
| Dark mode      | Classes in place, not active in v1                   | Stitch design includes dark tokens, we'll wire it up later    |

## 1. Design System & Global Styles

**Font:** Plus Jakarta Sans (Google Fonts CDN). All UI text — headings, body, labels.

**Color palette (slate-based):**

- Primary text: `slate-900` / `slate-200` (dark)
- Secondary text: `slate-500` / `slate-400` (dark)
- Backgrounds: `slate-50` (light page bg), `white` (cards/panels), `slate-100` (center content bg)
- Borders: `slate-200` / `slate-800` (dark)
- Artifact type accents:
  - Summary: emerald-500 (`#10b981`)
  - Quiz: amber-500 (`#f59e0b`)
  - Diagram: blue-500 (`#3b82f6`)
  - Note: purple-500 (`#a855f7`)

**Icons:** Google Material Symbols Outlined, loaded in root layout via Google Fonts CDN link.

**Border radius:** `rounded-md` (8px) for small elements, `rounded-lg` (12px) for cards/containers, `rounded-xl` (16px) for large panels.

**Shadows:** Subtle — `shadow-sm` on cards, minimal depth. Not heavy drop shadows.

## 2. Three-Panel Layout (Book Detail Page)

```
┌─────────────────────────────────────────────────────────────┐
│  Header: BookSite / Book Title    [Search]    Author  [Av]  │
├──────────┬────────────────────────────┬─────────────────────┤
│  Left    │        Center              │  Right              │
│ Sidebar  │    Artifact Viewer /       │  Book Companion     │
│ (264px)  │    Welcome State           │  (320px)            │
│          │    (flexible)              │                     │
│ [Create] │                            │  Context awareness  │
│          │                            │  Suggestion chips   │
│ Artifact │                            │  Recent activity    │
│ nav by   │                            │  Chat input         │
│ type     │                            │                     │
│          │                            │                     │
│ Storage  │                            │                     │
└──────────┴────────────────────────────┴─────────────────────┘
```

### Header (full-width top bar)

- Left: BookSite logo (slate-800 square with `menu_book` icon) + breadcrumb ("BookSite / Atomic Habits")
- Center-right: Search artifacts input (slate-50 bg, border, search icon)
- Right: Author name + user avatar

### Left Sidebar — `ArtifactSidebar.tsx` (new component)

- "Create New" button at top (dark, full-width)
- Artifacts grouped by type with section headers: "Summaries (4)", "Quizzes (2)", "Diagrams (1)", "Notes (8)"
- Each item: type-colored icon + title
- Active item: white bg, border, shadow, left border accent in type color
- Bottom: storage indicator ("Storage: 12/50 Artifacts" + progress bar)

### Center Content — modified `BookDetailView.tsx`

- When artifact selected: header (type icon, title, metadata, action buttons) + artifact content below (iframe viewer)
- When no artifact selected: book overview / chapter list as welcome state
- Background: `slate-100` to differentiate from white sidebar/panels

### Right Panel — restyled `ChatPanel.tsx`

- Header: "Book Companion" label
- Context-aware section: brief note about the currently viewed artifact + suggestion chips
- Suggestion chips: action buttons that change based on viewed content type
- Recent activity: last 2-3 actions with timestamps
- Input: rounded text field with arrow-up send icon button inside

## 3. Artifact Type System

**New type on the data model:**

```typescript
type ArtifactType = "summary" | "quiz" | "diagram" | "note";
```

Added as a field to `ArtifactMeta` and `ArtifactIndexEntry`. Optional for backwards compatibility — untyped artifacts default to `"note"`.

**Type metadata mapping:**

| Type    | Material Symbol | Accent Color | Sidebar Label |
| ------- | --------------- | ------------ | ------------- |
| summary | `visibility`    | emerald-500  | Summaries     |
| quiz    | `quiz`          | amber-500    | Quizzes       |
| diagram | `schema`        | blue-500     | Diagrams      |
| note    | `description`   | purple-500   | Notes         |

**AI tool change:** `createArtifact` tool gets a new required `type` parameter. The AI selects the appropriate type based on what it's creating.

## 4. Chat Panel — Book Companion

**Empty state suggestions** (when no messages):

- "Summarize the key takeaways"
- "Quiz me on Chapter 1"
- "Create a concept diagram"
- "What's the main argument?"

**Context-aware suggestions** (when artifact is selected):

- Summary selected → "Generate Quiz", "Extract Key Quotes", "Create Diagram"
- Quiz selected → "Review Wrong Answers", "Create Study Notes", "Deeper on Chapter X"
- Diagram selected → "Generate Quiz", "Summarize Related Chapters"
- Note selected → "Expand on This", "Create Diagram", "Generate Quiz"

Clicking a chip sends it as a chat message (pre-fills and submits). No special API.

**Recent activity:** Pulled from artifact index timestamps. Shows last 2-3 items like "Created summary for Chapter 2", "Updated Habit Loop diagram".

**Input:** Rounded input field, placeholder "Ask about this book...", arrow-up icon button inside the field on the right side.

## 5. Library / Home Page

Visual refresh to match the new design language. Structure stays the same.

**Header:** Same top bar as book detail — BookSite logo, search, user avatar.

**Book cards:** White cards on `slate-50` background. Rounded corners, subtle border + `shadow-sm`. Cover image, title, author, chapter count, artifact count. Status badges for processing books.

**Upload dropzone:** Restyled to match — slate borders, Plus Jakarta Sans text, Material Symbols `upload` icon.

## Files Changed

Existing files modified (not replaced):

- `src/app/layout.tsx` — Google Fonts links (Plus Jakarta Sans, Material Symbols)
- `src/app/page.tsx` — Library page styling
- `src/app/book/[id]/page.tsx` — Pass artifact type data
- `src/components/BookDetailView.tsx` — Three-panel layout
- `src/components/BookCard.tsx` — New card styling
- `src/components/ChapterList.tsx` — Restyled
- `src/components/UploadDropzone.tsx` — Restyled
- `src/components/chat/ChatPanel.tsx` — Suggestion chips, context awareness, restyled
- `src/components/chat/ChatMessage.tsx` — Restyled
- `src/components/artifacts/ArtifactList.tsx` — Type grouping (may be absorbed into sidebar)
- `src/components/artifacts/ArtifactViewer.tsx` — New header with type icon + actions
- `src/lib/artifacts.ts` — Add type field handling
- `src/lib/chat-tools.ts` — Add type parameter to createArtifact tool
- `src/types/book.ts` — Add ArtifactType, type field on ArtifactMeta/ArtifactIndexEntry
- `tailwind.config.ts` — Extend theme with custom colors, font family

New files:

- `src/components/ArtifactSidebar.tsx` — Left sidebar with typed artifact navigation
- `src/components/AppHeader.tsx` — Shared header component

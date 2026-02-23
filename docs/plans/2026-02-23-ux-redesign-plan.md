# UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the entire app UI from Medium-inspired reader to a three-panel Artifact Workspace matching the Stitch design.

**Architecture:** Incremental reskin — modify existing components in place, adding new ones only where needed (ArtifactSidebar, AppHeader). Data model gets one additive change (artifact `type` field). All styling moves to Plus Jakarta Sans, slate palette, Material Symbols icons.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4 (CSS-first config via globals.css), Google Material Symbols, Plus Jakarta Sans

---

### Task 1: Design System — Fonts, Icons, CSS Variables

**Files:**

- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update `src/app/layout.tsx` to load Plus Jakarta Sans and Material Symbols**

Replace the Geist font imports and add Google Fonts links in the `<head>`:

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BookSite - AI-Powered Book Learning",
  description:
    "Learn from books with AI-powered explanations, quizzes, and deep dive features",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${plusJakarta.variable} font-[family-name:var(--font-display)] antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 2: Replace `src/app/globals.css` with new design tokens**

Strip out the old CSS variables and utility classes. Replace with the Stitch-aligned slate palette:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme inline {
  --color-background: #f8fafc;
  --color-foreground: #0f172a;
  --font-display: "Plus Jakarta Sans", system-ui, sans-serif;

  /* Artifact type accent colors */
  --color-summary-accent: #10b981;
  --color-quiz-accent: #f59e0b;
  --color-diagram-accent: #3b82f6;
  --color-note-accent: #a855f7;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-display);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar — thin, subtle */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
```

**Step 3: Run lint and typecheck**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit`
Expected: PASS (no new errors — just swapped fonts and CSS)

**Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: replace design system with Plus Jakarta Sans and slate palette"
```

---

### Task 2: Artifact Type System — Data Model + Tests

**Files:**

- Modify: `src/types/book.ts`
- Modify: `src/lib/artifacts.ts`
- Modify: `src/__tests__/lib/artifacts.test.ts`

**Step 1: Write the failing test**

Add to `src/__tests__/lib/artifacts.test.ts`:

```typescript
describe("artifact type field", () => {
  it("stores type when creating an artifact", async () => {
    const result = await createArtifact("_test_artifacts", {
      title: "Quiz: Ch 1-3",
      description: "Review quiz",
      htmlContent: "<h1>Quiz</h1>",
      chapters: [1, 2, 3],
      type: "quiz",
    });

    expect(result.type).toBe("quiz");

    const meta = await getArtifact("_test_artifacts", result.id);
    expect(meta?.type).toBe("quiz");
  });

  it("defaults to note when type is not provided", async () => {
    const result = await createArtifact("_test_artifacts", {
      title: "Untitled",
      description: "No type",
      htmlContent: "<p>test</p>",
      chapters: [],
    });

    expect(result.type).toBe("note");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd .claude/worktrees/ux-redesign && npx vitest run src/__tests__/lib/artifacts.test.ts`
Expected: FAIL — `type` property doesn't exist on the input or return types

**Step 3: Add ArtifactType to `src/types/book.ts`**

Add the type and update the interfaces:

```typescript
export type ArtifactType = "summary" | "quiz" | "diagram" | "note";

export interface ArtifactMeta {
  id: string;
  title: string;
  description: string;
  type: ArtifactType;
  versions: ArtifactVersion[];
  currentVersion: number;
  chapters: number[];
}

export interface ArtifactIndexEntry {
  id: string;
  title: string;
  description: string;
  type: ArtifactType;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  chapters: number[];
}
```

**Step 4: Update `src/lib/artifacts.ts` createArtifact to accept and store type**

Update the `createArtifact` input parameter to include `type?` (optional, defaults to `"note"`):

```typescript
export async function createArtifact(
  bookId: string,
  input: {
    title: string;
    description: string;
    htmlContent: string;
    chapters: number[];
    type?: ArtifactType;
  },
): Promise<ArtifactIndexEntry> {
```

Inside the function, set `type: input.type ?? "note"` on both the `ArtifactMeta` object and the `ArtifactIndexEntry`.

**Step 5: Run tests to verify they pass**

Run: `cd .claude/worktrees/ux-redesign && npx vitest run src/__tests__/lib/artifacts.test.ts`
Expected: ALL PASS

**Step 6: Run lint and typecheck**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 7: Commit**

```bash
git add src/types/book.ts src/lib/artifacts.ts src/__tests__/lib/artifacts.test.ts
git commit -m "feat: add artifact type field (summary, quiz, diagram, note)"
```

---

### Task 3: Update createArtifact AI Tool with Type Parameter

**Files:**

- Modify: `src/lib/chat-tools.ts`

**Step 1: Add `type` parameter to the `createArtifact` tool**

In `src/lib/chat-tools.ts`, update the `createArtifact` tool's `inputSchema` to include:

```typescript
type: z.enum(["summary", "quiz", "diagram", "note"]).describe(
  "The type of artifact being created"
),
```

And pass it through in the `execute` function:

```typescript
execute: async ({ title, description, htmlContent, chapters, type }) => {
  const entry = await createArtifact(bookId, {
    title,
    description,
    htmlContent,
    chapters,
    type,
  });
```

**Step 2: Run lint and typecheck**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/chat-tools.ts
git commit -m "feat: add type parameter to createArtifact AI tool"
```

---

### Task 4: AppHeader Component

**Files:**

- Create: `src/components/AppHeader.tsx`

**Step 1: Create the shared header component**

This is a presentational component. Create `src/components/AppHeader.tsx`:

```tsx
import Link from "next/link";

interface AppHeaderProps {
  bookTitle?: string;
  authorName?: string;
  avatarUrl?: string;
}

export function AppHeader({
  bookTitle,
  authorName,
  avatarUrl,
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-slate-900">
          <div className="size-8 rounded bg-slate-800 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">menu_book</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            BookSite
            {bookTitle && (
              <>
                <span className="text-slate-400 font-normal mx-2">/</span>
                {bookTitle}
              </>
            )}
          </h2>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {authorName && (
          <>
            <span className="text-sm font-medium text-slate-600">
              {authorName}
            </span>
            <div className="h-6 w-px bg-slate-200" />
          </>
        )}
        <button className="flex items-center justify-center rounded-full h-8 w-8 bg-slate-200 overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="User"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-slate-500 text-lg">
              person
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
```

**Step 2: Run lint and typecheck**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "feat: add AppHeader component with breadcrumb navigation"
```

---

### Task 5: ArtifactSidebar Component

**Files:**

- Create: `src/components/ArtifactSidebar.tsx`

**Step 1: Create the left sidebar component**

Create `src/components/ArtifactSidebar.tsx`. This groups artifacts by type and shows them with color-coded icons:

```tsx
"use client";

import type { ArtifactIndexEntry, ArtifactType } from "@/types/book";

const TYPE_CONFIG: Record<
  ArtifactType,
  { icon: string; label: string; color: string; activeColor: string }
> = {
  summary: {
    icon: "visibility",
    label: "Summaries",
    color: "text-emerald-500",
    activeColor: "border-l-emerald-500",
  },
  quiz: {
    icon: "quiz",
    label: "Quizzes",
    color: "text-amber-500",
    activeColor: "border-l-amber-500",
  },
  diagram: {
    icon: "schema",
    label: "Diagrams",
    color: "text-blue-500",
    activeColor: "border-l-blue-500",
  },
  note: {
    icon: "description",
    label: "Notes",
    color: "text-purple-500",
    activeColor: "border-l-purple-500",
  },
};

const TYPE_ORDER: ArtifactType[] = ["summary", "quiz", "diagram", "note"];

interface ArtifactSidebarProps {
  artifacts: ArtifactIndexEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export function ArtifactSidebar({
  artifacts,
  selectedId,
  onSelect,
  onCreateNew,
}: ArtifactSidebarProps) {
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    config: TYPE_CONFIG[type],
    items: artifacts.filter((a) => (a.type ?? "note") === type),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-4">
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2 px-4 rounded-lg font-semibold text-sm transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Create New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
        {grouped.map(({ type, config, items }) => (
          <div key={type} className="mb-6">
            <div className="px-3 mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {config.label}
              </h3>
              <span className="text-xs text-slate-400">{items.length}</span>
            </div>
            <ul className="space-y-0.5">
              {items.map((artifact) => {
                const isActive = artifact.id === selectedId;
                return (
                  <li key={artifact.id}>
                    <button
                      onClick={() => onSelect(artifact.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                        isActive
                          ? `bg-white border border-slate-200 shadow-sm border-l-4 ${config.activeColor} font-medium text-slate-900`
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-lg ${isActive ? config.color : "text-slate-400"}`}
                      >
                        {config.icon}
                      </span>
                      <span className="truncate">{artifact.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {artifacts.length === 0 && (
          <div className="text-center text-slate-400 text-sm px-4 py-8">
            <span className="material-symbols-outlined text-3xl mb-2 block">
              auto_awesome
            </span>
            <p>No artifacts yet.</p>
            <p className="mt-1">
              Ask the Book Companion to create summaries, quizzes, or diagrams.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="material-symbols-outlined text-sm">storage</span>
          <span>Storage: {artifacts.length}/50 Artifacts</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
          <div
            className="bg-slate-600 h-1 rounded-full transition-all"
            style={{
              width: `${Math.min(100, (artifacts.length / 50) * 100)}%`,
            }}
          />
        </div>
      </div>
    </aside>
  );
}
```

**Step 2: Run lint and typecheck**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/ArtifactSidebar.tsx
git commit -m "feat: add ArtifactSidebar with type-grouped artifact navigation"
```

---

### Task 6: Restyle ChatPanel with Suggestion Chips

**Files:**

- Modify: `src/components/chat/ChatPanel.tsx`

**Step 1: Rewrite ChatPanel with new styling and suggestion chips**

This is a visual overhaul of the existing ChatPanel. Keep all the existing `useChat` logic, artifact detection, and message rendering. Add:

- "Book Companion" header
- Context-aware suggestion chips section
- Recent activity section (derived from artifacts)
- Restyled input with arrow-up icon button

Key changes to the JSX:

**Header:** Replace the plain "Chat" header with:

```tsx
<div className="p-5 border-b border-slate-100 flex items-center gap-3">
  <div className="size-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
    <span className="material-symbols-outlined text-white text-xl">
      auto_awesome
    </span>
  </div>
  <div>
    <h3 className="font-bold text-sm text-slate-900">Book Companion</h3>
    <p className="text-xs text-slate-500">Workspace Assistant</p>
  </div>
</div>
```

**Suggestion chips:** Add a `getSuggestions` function that returns different suggestions based on `activeView`:

- No view / chapter: general book suggestions
- Summary artifact: "Generate Quiz", "Extract Key Quotes", "Create Diagram"
- Quiz artifact: "Review Wrong Answers", "Create Study Notes"
- Diagram artifact: "Generate Quiz", "Summarize Related Chapters"
- Note artifact: "Expand on This", "Create Diagram"

Each chip is a button that calls `sendMessage` with the chip text.

**Input area:** Replace the flex row with a relative-positioned input and an icon button inside:

```tsx
<div className="p-4 border-t border-slate-200 bg-slate-50">
  <div className="relative">
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Ask about this book..."
      disabled={isLoading}
      className="w-full bg-white border border-slate-200 rounded-md pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-shadow shadow-sm placeholder:text-slate-400 text-slate-700"
    />
    <button
      type="submit"
      disabled={!input.trim() || isLoading}
      className="absolute right-1.5 top-1.5 p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 transition-colors disabled:opacity-30"
    >
      <span className="material-symbols-outlined text-lg">arrow_upward</span>
    </button>
  </div>
</div>
```

**Step 2: Restyle ChatMessage and ArtifactCard to match slate palette**

Update `src/components/chat/ChatMessage.tsx`:

- User bubbles: `bg-slate-900 text-white`
- Assistant bubbles: `bg-slate-100 text-slate-800`

Update `src/components/chat/ArtifactCard.tsx`:

- Use `border-slate-200`, `hover:border-slate-400`
- Replace emoji with Material Symbols icons (pencil for update, document for create)
- Add type-colored accent if available

**Step 3: Run lint and typecheck**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/chat/ChatPanel.tsx src/components/chat/ChatMessage.tsx src/components/chat/ArtifactCard.tsx
git commit -m "feat: restyle chat panel as Book Companion with suggestion chips"
```

---

### Task 7: Restyle ArtifactViewer

**Files:**

- Modify: `src/components/artifacts/ArtifactViewer.tsx`

**Step 1: Update the artifact viewer header**

Replace the minimal gray header with the Stitch-style header showing:

- Type icon (color-coded) in a rounded badge
- Title (large, bold)
- Metadata line ("Visual Summary • Created 2 days ago")
- Action buttons (edit, share, more) on the right

The iframe viewer stays the same — just restyle the chrome around it.

Use the `TYPE_CONFIG` mapping (extract to a shared constant file `src/lib/artifact-types.ts` or inline it).

**Step 2: Run lint and typecheck**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/artifacts/ArtifactViewer.tsx
git commit -m "feat: restyle artifact viewer with type-colored header and actions"
```

---

### Task 8: Three-Panel BookDetailView Layout

**Files:**

- Modify: `src/components/BookDetailView.tsx`
- Modify: `src/app/book/[id]/page.tsx`

This is the main structural change. Replace the current two-panel (content + chat) layout with the three-panel Artifact Workspace.

**Step 1: Rewrite BookDetailView layout**

The new structure:

```
<div className="h-screen flex flex-col">
  <AppHeader bookTitle={book.title} authorName={book.author} />
  <div className="flex flex-1 overflow-hidden">
    <ArtifactSidebar ... />
    <main className="flex-1 bg-slate-100 overflow-y-auto custom-scrollbar p-6 md:p-10 flex justify-center">
      {/* center content */}
    </main>
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
      <ChatPanel ... />
    </aside>
  </div>
</div>
```

**Center content logic:**

- When `selectedArtifactId` is set: show the artifact viewer header + ArtifactViewer iframe
- When no artifact is selected: show a welcome state with book hero (cover, title, author, chapter count) and a ChapterList below. Restyle ChapterList items to match the slate palette.

**State management:** The existing state (artifacts, selectedArtifactId, activeView, chatOpen) stays. Remove `activeTab` (no more tabs — sidebar replaces them). Remove `chatOpen` toggle (chat panel is always visible in the three-panel layout).

Add an `onCreateNew` handler for the sidebar button — it should focus the chat input with a pre-filled prompt like "Create a new...".

**Step 2: Update `src/app/book/[id]/page.tsx` if needed**

The server component currently passes `book` and `initialArtifacts`. This should still work. Just verify the types match.

**Step 3: Run lint and typecheck**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 4: Run tests**

Run: `cd .claude/worktrees/ux-redesign && npx vitest run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/BookDetailView.tsx src/app/book/[id]/page.tsx
git commit -m "feat: three-panel Artifact Workspace layout for book detail page"
```

---

### Task 9: Restyle Library / Home Page

**Files:**

- Modify: `src/app/page.tsx`
- Modify: `src/components/LibraryView.tsx`
- Modify: `src/components/BookCard.tsx`
- Modify: `src/components/UploadDropzone.tsx`

**Step 1: Update `src/app/page.tsx` to use AppHeader**

Replace the inline header with `<AppHeader />` (no bookTitle, no authorName — just the logo).

Move the auth button / user menu into the AppHeader or keep them separate but restyled.

```tsx
return (
  <div className="min-h-screen flex flex-col">
    <AppHeader avatarUrl={session?.user?.image ?? undefined} />
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">
          {isAuthenticated ? "Your Library" : "Community Library"}
        </h1>
        <p className="mt-2 text-slate-500">
          {isAuthenticated
            ? "Your books and community discoveries"
            : "Browse books shared by the community"}
        </p>
      </header>
      <LibraryView initialBooks={initialBooks} />
    </main>
  </div>
);
```

**Step 2: Restyle BookCard**

Update to slate palette:

- `border-slate-200 hover:border-slate-300`
- Font: `font-semibold text-slate-900` (remove `font-serif`)
- `text-slate-600` for author, `text-slate-400` for meta
- Processing overlay: keep the spinner but use slate colors

**Step 3: Restyle UploadDropzone**

- `border-slate-300 hover:border-slate-400`
- Replace emoji `📤` with `<span className="material-symbols-outlined text-4xl text-slate-400">upload_file</span>`
- Replace `🔐` with `<span className="material-symbols-outlined text-4xl text-slate-400">lock</span>`
- Use slate palette for all text colors

**Step 4: Restyle LibraryView**

- Loading spinner: `border-slate-900` instead of `border-stone-900`
- Empty state text: `text-slate-900`, `text-slate-600` instead of `stone`

**Step 5: Run lint and typecheck**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/page.tsx src/components/LibraryView.tsx src/components/BookCard.tsx src/components/UploadDropzone.tsx
git commit -m "feat: restyle library page with slate palette and AppHeader"
```

---

### Task 10: Restyle ChapterList and Remaining Components

**Files:**

- Modify: `src/components/ChapterList.tsx`
- Modify: `src/components/LibraryTabs.tsx`
- Modify: `src/components/EmptyLibrary.tsx`
- Modify: `src/components/AuthButton.tsx`
- Modify: `src/components/UserMenu.tsx`

**Step 1: Restyle all remaining components to slate palette**

For each component:

- Replace `gray-*` with `slate-*`
- Replace `stone-*` with `slate-*`
- Remove `font-serif` references (we now use Plus Jakarta Sans everywhere)
- Replace any emoji icons with Material Symbols where appropriate

**Step 2: Run lint, typecheck, and tests**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit && npx vitest run`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/components/ChapterList.tsx src/components/LibraryTabs.tsx src/components/EmptyLibrary.tsx src/components/AuthButton.tsx src/components/UserMenu.tsx
git commit -m "feat: restyle remaining components to slate palette"
```

---

### Task 11: Extract Shared Artifact Type Config

**Files:**

- Create: `src/lib/artifact-types.ts`
- Modify: `src/components/ArtifactSidebar.tsx` (import from shared)
- Modify: `src/components/artifacts/ArtifactViewer.tsx` (import from shared)
- Modify: `src/components/chat/ArtifactCard.tsx` (import from shared)

**Step 1: Create `src/lib/artifact-types.ts`**

Extract the `TYPE_CONFIG` and `TYPE_ORDER` constants that are used by multiple components:

```typescript
import type { ArtifactType } from "@/types/book";

export const ARTIFACT_TYPE_CONFIG: Record<
  ArtifactType,
  {
    icon: string;
    label: string;
    color: string;
    bgLight: string;
    activeColor: string;
  }
> = {
  summary: {
    icon: "visibility",
    label: "Summaries",
    color: "text-emerald-500",
    bgLight: "bg-emerald-50",
    activeColor: "border-l-emerald-500",
  },
  quiz: {
    icon: "quiz",
    label: "Quizzes",
    color: "text-amber-500",
    bgLight: "bg-amber-50",
    activeColor: "border-l-amber-500",
  },
  diagram: {
    icon: "schema",
    label: "Diagrams",
    color: "text-blue-500",
    bgLight: "bg-blue-50",
    activeColor: "border-l-blue-500",
  },
  note: {
    icon: "description",
    label: "Notes",
    color: "text-purple-500",
    bgLight: "bg-purple-50",
    activeColor: "border-l-purple-500",
  },
};

export const ARTIFACT_TYPE_ORDER: ArtifactType[] = [
  "summary",
  "quiz",
  "diagram",
  "note",
];
```

**Step 2: Update ArtifactSidebar, ArtifactViewer, and ArtifactCard to import from shared**

Replace inline `TYPE_CONFIG` definitions with imports from `@/lib/artifact-types`.

**Step 3: Run lint, typecheck, and tests**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit && npx vitest run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/lib/artifact-types.ts src/components/ArtifactSidebar.tsx src/components/artifacts/ArtifactViewer.tsx src/components/chat/ArtifactCard.tsx
git commit -m "refactor: extract shared artifact type config to src/lib/artifact-types.ts"
```

---

### Task 12: Visual QA and Polish

**Files:**

- Any file that needs tweaks

**Step 1: Run the dev server and visually check all pages**

Run: `cd .claude/worktrees/ux-redesign && npm run dev`

Check:

1. Library page — header, book cards, upload dropzone, tabs
2. Book detail page — three-panel layout, sidebar, center content, chat panel
3. Artifact creation flow — create via chat, appears in sidebar, click to view
4. Responsive behavior — panels don't overlap, scrolling works

**Step 2: Fix any visual issues found**

Common things to watch for:

- Material Symbols not loading (check CDN link)
- Font not applying (check CSS variable chain)
- Overflow issues in the three-panel layout
- Sidebar scroll behavior
- Chat panel suggestion chips wrapping

**Step 3: Run full quality checks**

Run: `cd .claude/worktrees/ux-redesign && npm run lint && npx tsc --noEmit && npx vitest run`
Expected: ALL PASS

**Step 4: Commit any polish fixes**

```bash
git add -A
git commit -m "fix: visual polish and responsive adjustments"
```

---

### Task 13: Update Documentation

**Files:**

- Modify: `docs/architecture.md` (if it references old layout)

**Step 1: Update any docs that reference old UI structure**

Check `docs/architecture.md` and `docs/README.md` for references to:

- "Medium-inspired" (now "Artifact Workspace")
- Two-panel layout (now three-panel)
- Tab-based navigation (now sidebar)

Update briefly — don't over-document.

**Step 2: Commit**

```bash
git add docs/
git commit -m "docs: update architecture docs for Artifact Workspace layout"
```

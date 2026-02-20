# Architecture

BookSite uses a hybrid storage architecture: Prisma/PostgreSQL for user and book metadata, filesystem for book content (chapters, covers).

## Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Database:** PostgreSQL via Supabase (Prisma ORM)
- **Auth:** NextAuth.js v5 with Google OAuth + PrismaAdapter
- **AI:** Gemini 2.0 Flash (voice analysis + summary generation)
- **Processing:** Python 3.13+ scripts
- **Hosting:** Vercel

## Data Flow

```
EPUB Upload → API Route → Filesystem Storage → Python Processing → JSON Output → React UI
```

### Book Processing Pipeline

```
1. Upload EPUB          → POST /api/books/upload
2. Extract chapters     → convert_epub_to_markdown.py
3. Extract cover        → extract_cover.py
4. Analyze voice style  → analyze_voice.py (Gemini API)
5. Generate summaries   → generate_summaries.py (Gemini API)
6. Update status        → status.json polled by frontend
```

## Directory Layout

```
src/
  app/
    page.tsx                          # Library view (home)
    book/[id]/page.tsx                # Book detail + chapter list
    book/[id]/chapter/[num]/page.tsx  # Chapter reader
    api/
      auth/[...nextauth]/route.ts     # OAuth handlers
      books/route.ts                  # GET public books
      books/upload/route.ts           # POST upload EPUB
      books/[id]/route.ts             # GET/DELETE book
      books/[id]/status/route.ts      # GET processing status
      books/[id]/visibility/route.ts  # PATCH toggle public/private
      books/[id]/cover/route.ts       # GET cover image
      bookmarks/route.ts              # GET/POST bookmarks
      bookmarks/[id]/route.ts         # DELETE bookmark
      user/library/route.ts           # GET owned + bookmarked
  components/                         # 14 React components
  lib/
    books.ts                          # Book CRUD, hybrid Prisma+filesystem
    prisma.ts                         # Prisma client singleton
  types/
    book.ts                           # Book, Chapter, VoiceProfile types
    next-auth.d.ts                    # Session type extension
  auth.ts                             # NextAuth configuration

execution/
  process_book.py                     # Main orchestrator
  convert_epub_to_markdown.py         # EPUB → Markdown
  extract_cover.py                    # Cover image extraction
  analyze_voice.py                    # Voice profile via Gemini
  generate_summaries.py               # Voice-matched summaries via Gemini
  filter_chapters.py                  # Chapter filtering (unused)

data/books/{bookId}/
  metadata.json                       # Title, author, voiceProfile, status
  status.json                         # Processing progress
  chapters.json                       # Chapter list with summaries
  cover.jpg                           # Cover image
  chapters/                           # Markdown files per chapter
```

## Database Schema

```
User ──< Account     (NextAuth OAuth accounts)
User ──< Session     (NextAuth sessions)
User ──< Book        (ownership)
User ──< Bookmark >── Book  (many-to-many bookmarking)
```

Key models: User, Account, Session, VerificationToken (NextAuth), Book, Bookmark (application).

See `prisma/schema.prisma` for full schema.

## Auth Flow

1. User clicks "Sign in with Google"
2. NextAuth redirects to Google OAuth consent
3. Google redirects back to `/api/auth/callback/google`
4. PrismaAdapter creates/updates User + Account in PostgreSQL
5. Session stored in database, cookie set on client
6. `auth()` server-side and `useSession()` client-side for access

## API Authorization

| Endpoint                         | Unauth         | Auth (not owner) | Auth (owner) |
| -------------------------------- | -------------- | ---------------- | ------------ |
| GET /api/books                   | Public only    | Public only      | Public + own |
| POST /api/books/upload           | 401            | Creates book     | -            |
| GET /api/books/[id]              | 404 if private | 404 if private   | Full access  |
| DELETE /api/books/[id]           | 401            | 403              | Delete       |
| PATCH /api/books/[id]/visibility | 401            | 403              | Toggle       |
| POST /api/bookmarks              | 401            | Create           | -            |
| DELETE /api/bookmarks/[id]       | 401            | Delete own       | -            |

## Hybrid Storage

- **PostgreSQL (Prisma):** User accounts, sessions, book metadata, bookmarks, ownership, visibility
- **Filesystem:** EPUB files, extracted markdown chapters, cover images, processing status, voice profiles, chapter summaries

This separation keeps the Python processing pipeline simple (reads/writes files) while enabling user relationships and access control through the database.

# Google Auth & User Libraries Brainstorm

**Date:** 2026-02-05
**Status:** Ready for planning

## What We're Building

Authentication system with Google Login that enables personal book libraries with community sharing.

### Core Features

1. **Google OAuth Login** - Sign in with Google, session management
2. **User Libraries** - Each user has their own collection of books
3. **Community Library** - Public books visible to everyone (including unauthenticated visitors)
4. **Book Visibility** - Upload as public or private, toggle later
5. **Bookmarking** - Add community books to personal library (reference, not copy)

### User Experience Flow

```
Unauthenticated visitor:
  → Lands on Community Library (home page)
  → Can browse and read public books
  → Sees "Sign in" button in header
  → Must log in to upload or access private books

Authenticated user:
  → Two tabs: "My Library" | "Community Library"
  → My Library shows: uploaded books + bookmarked community books
  → Can upload books (choose public/private at upload)
  → Can toggle visibility of their books later
  → Can bookmark community books to their library
```

## Why This Approach

**NextAuth.js v5 + Prisma + SQLite** chosen because:

- **NextAuth.js v5 (Auth.js):** Industry standard for Next.js, built-in Google OAuth, handles sessions
- **Prisma:** Type-safe database access, works perfectly with TypeScript strict mode
- **SQLite:** Zero infrastructure, single file database, sufficient for personal/small-scale use
- **Migration path:** Can switch to PostgreSQL later without code changes

### Alternatives Considered

| Approach        | Why Not                                                          |
| --------------- | ---------------------------------------------------------------- |
| Filesystem-only | No referential integrity, hard to query, complex session storage |
| Supabase        | Overkill for current scale, external dependency                  |

## Key Decisions

1. **Two-tab library UI** - "My Library" and "Community Library" as tabs, not separate pages
2. **Unauthenticated access** - Visitors can browse Community Library, login required for upload/private books
3. **No landing page** - Go straight to Community Library with login in header
4. **Visibility toggle** - Set at upload time, can change later
5. **Bookmarks not copies** - Adding community book to personal library creates reference
6. **SQLite database** - Store users, sessions, book ownership; book content stays on filesystem
7. **My Library contents** - User's uploaded books + their bookmarked community books

## Data Model (Conceptual)

```
User
  - id (from Google)
  - email
  - name
  - image

Book (existing, extended)
  - id
  - title, author, etc.
  - ownerId → User (who uploaded)
  - isPublic (boolean)

Bookmark
  - userId → User
  - bookId → Book
  - createdAt
```

## Open Questions

1. **Book deletion** - If user deletes a public book, what happens to others' bookmarks?
   - Suggestion: Soft delete or orphan the bookmarks gracefully

2. **Duplicate uploads** - If two users upload the same book, treat as separate or dedupe?
   - Suggestion: Treat as separate (simpler, avoids ownership conflicts)

## Scope Boundaries

**In scope:**

- Google OAuth login/logout
- User sessions
- Book ownership (userId on books)
- Public/private visibility toggle
- Bookmark community books
- Two-tab library UI

**Out of scope (future):**

- Reading progress tracking
- User preferences/settings
- Multiple OAuth providers
- Admin/moderation tools
- Book recommendations

## Next Steps

Run `/workflows:plan` to create implementation plan covering:

1. Database setup (Prisma + SQLite)
2. Auth configuration (NextAuth.js v5 + Google provider)
3. API route updates (ownership, visibility filtering)
4. UI updates (tabs, login button, visibility toggle, bookmark button)

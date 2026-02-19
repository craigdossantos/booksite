/**
 * Book data utilities with Prisma integration
 * Hybrid approach: metadata in SQLite, content on filesystem
 */

import fs from "fs-extra";
import path from "path";
import { prisma } from "@/lib/prisma";
import type {
  Book,
  BookWithChapters,
  Chapter,
  ProcessingStatus,
  VoiceProfile,
} from "@/types/book";

const DATA_DIR = path.join(process.cwd(), "data", "books");

/**
 * Convert Prisma book to our Book type
 */
function prismaBookToBook(
  prismaBook: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    chapterCount: number;
    status: string;
    isPublic: boolean;
    ownerId: string | null;
    createdAt: Date;
    processedAt: Date | null;
  },
  voiceProfile?: VoiceProfile,
): Book {
  return {
    id: prismaBook.id,
    title: prismaBook.title,
    author: prismaBook.author,
    coverUrl: prismaBook.coverUrl ?? undefined,
    chapterCount: prismaBook.chapterCount,
    status: prismaBook.status as Book["status"],
    isPublic: prismaBook.isPublic,
    ownerId: prismaBook.ownerId,
    createdAt: prismaBook.createdAt.toISOString(),
    processedAt: prismaBook.processedAt?.toISOString(),
    voiceProfile,
  };
}

/**
 * Load voice profile from filesystem
 */
async function loadVoiceProfile(
  bookId: string,
): Promise<VoiceProfile | undefined> {
  const metadataPath = path.join(DATA_DIR, bookId, "metadata.json");
  try {
    const metadata = await fs.readJson(metadataPath);
    return metadata.voiceProfile;
  } catch {
    return undefined;
  }
}

/**
 * Get all books from the filesystem (fallback when database is unavailable)
 */
async function getBooksFromFilesystem(): Promise<Book[]> {
  try {
    const entries = await fs.readdir(DATA_DIR);
    const books: Book[] = [];

    for (const entry of entries) {
      const metadataPath = path.join(DATA_DIR, entry, "metadata.json");
      try {
        const metadata = await fs.readJson(metadataPath);
        books.push({
          id: metadata.id ?? entry,
          title: metadata.title ?? "Untitled",
          author: metadata.author ?? "Unknown",
          coverUrl: metadata.coverUrl,
          chapterCount: metadata.chapterCount ?? 0,
          status: metadata.status ?? "ready",
          isPublic: true,
          ownerId: null,
          createdAt: metadata.createdAt ?? new Date().toISOString(),
          processedAt: metadata.processedAt,
          voiceProfile: metadata.voiceProfile,
        });
      } catch {
        // Skip directories without valid metadata
      }
    }

    return books.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

/**
 * Get all public books (for community library)
 * Falls back to filesystem if database is unavailable
 */
export async function getPublicBooks(): Promise<Book[]> {
  try {
    const books = await prisma.book.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
    });

    const booksWithVoice = await Promise.all(
      books.map(async (book) => {
        const voiceProfile = await loadVoiceProfile(book.id);
        return prismaBookToBook(book, voiceProfile);
      }),
    );

    return booksWithVoice;
  } catch {
    return getBooksFromFilesystem();
  }
}

/**
 * Get user's library (owned books + bookmarked books)
 */
export async function getUserLibrary(userId: string): Promise<{
  owned: Book[];
  bookmarked: Book[];
}> {
  const [ownedBooks, bookmarks] = await Promise.all([
    prisma.book.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bookmark.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const owned = await Promise.all(
    ownedBooks.map(async (book) => {
      const voiceProfile = await loadVoiceProfile(book.id);
      return prismaBookToBook(book, voiceProfile);
    }),
  );

  const bookmarked = await Promise.all(
    bookmarks.map(async (bookmark) => {
      const voiceProfile = await loadVoiceProfile(bookmark.book.id);
      return prismaBookToBook(bookmark.book, voiceProfile);
    }),
  );

  return { owned, bookmarked };
}

/**
 * Get all books in the library (legacy function for backwards compatibility)
 * If userId provided, returns public books + user's private books
 * If no userId, returns only public books
 */
export async function getBooks(userId?: string): Promise<Book[]> {
  const where = userId
    ? {
        OR: [{ isPublic: true }, { ownerId: userId }],
      }
    : { isPublic: true };

  const books = await prisma.book.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const booksWithVoice = await Promise.all(
    books.map(async (book) => {
      const voiceProfile = await loadVoiceProfile(book.id);
      return prismaBookToBook(book, voiceProfile);
    }),
  );

  return booksWithVoice;
}

/**
 * Get a single book by ID with its chapters
 * Returns null if book doesn't exist or user doesn't have access
 * Falls back to filesystem if database is unavailable
 */
export async function getBook(
  bookId: string,
  userId?: string,
): Promise<BookWithChapters | null> {
  const bookDir = path.join(DATA_DIR, bookId);

  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) return null;

    // Check access: public books or owned by user
    if (!book.isPublic && book.ownerId !== userId) {
      return null;
    }

    const [voiceProfile, chapters] = await Promise.all([
      loadVoiceProfile(bookId),
      fs.readJson(path.join(bookDir, "chapters.json")).catch(() => []),
    ]);

    return {
      ...prismaBookToBook(book, voiceProfile),
      chapters: chapters as Chapter[],
    };
  } catch {
    // Fallback: read from filesystem
    try {
      const [metadata, chapters] = await Promise.all([
        fs.readJson(path.join(bookDir, "metadata.json")),
        fs.readJson(path.join(bookDir, "chapters.json")).catch(() => []),
      ]);

      return {
        id: metadata.id ?? bookId,
        title: metadata.title ?? "Untitled",
        author: metadata.author ?? "Unknown",
        coverUrl: metadata.coverUrl,
        chapterCount: metadata.chapterCount ?? 0,
        status: metadata.status ?? "ready",
        isPublic: true,
        ownerId: null,
        createdAt: metadata.createdAt ?? new Date().toISOString(),
        processedAt: metadata.processedAt,
        voiceProfile: metadata.voiceProfile,
        chapters: chapters as Chapter[],
      };
    } catch {
      return null;
    }
  }
}

/**
 * Check if user can access a book
 * Falls back to filesystem check if database is unavailable
 */
export async function canAccessBook(
  bookId: string,
  userId?: string,
): Promise<boolean> {
  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { isPublic: true, ownerId: true },
    });

    if (!book) return false;
    if (book.isPublic) return true;
    return book.ownerId === userId;
  } catch {
    // Fallback: if metadata.json exists on filesystem, allow access
    const metadataPath = path.join(DATA_DIR, bookId, "metadata.json");
    return fs.pathExists(metadataPath);
  }
}

/**
 * Check if user owns a book
 */
export async function ownsBook(
  bookId: string,
  userId: string,
): Promise<boolean> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { ownerId: true },
  });

  return book?.ownerId === userId;
}

/**
 * Create a new book in the database
 */
export async function createBook(data: {
  id: string;
  title: string;
  author: string;
  ownerId: string;
  isPublic?: boolean;
  coverUrl?: string;
  chapterCount?: number;
  status?: string;
}): Promise<Book> {
  const book = await prisma.book.create({
    data: {
      id: data.id,
      title: data.title,
      author: data.author,
      ownerId: data.ownerId,
      isPublic: data.isPublic ?? false,
      coverUrl: data.coverUrl,
      chapterCount: data.chapterCount ?? 0,
      status: data.status ?? "uploading",
    },
  });

  return prismaBookToBook(book);
}

/**
 * Update book metadata in the database
 */
export async function updateBook(
  bookId: string,
  data: {
    title?: string;
    author?: string;
    isPublic?: boolean;
    coverUrl?: string;
    chapterCount?: number;
    status?: string;
    processedAt?: Date;
  },
): Promise<Book | null> {
  try {
    const book = await prisma.book.update({
      where: { id: bookId },
      data,
    });
    return prismaBookToBook(book);
  } catch {
    return null;
  }
}

/**
 * Toggle book visibility
 */
export async function toggleBookVisibility(
  bookId: string,
  userId: string,
): Promise<Book | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { ownerId: true, isPublic: true },
  });

  if (!book || book.ownerId !== userId) {
    return null;
  }

  const updated = await prisma.book.update({
    where: { id: bookId },
    data: { isPublic: !book.isPublic },
  });

  return prismaBookToBook(updated);
}

/**
 * Get processing status for a book
 */
export async function getProcessingStatus(
  bookId: string,
): Promise<ProcessingStatus | null> {
  const statusPath = path.join(DATA_DIR, bookId, "status.json");

  try {
    return await fs.readJson(statusPath);
  } catch {
    return null;
  }
}

/**
 * Get chapter markdown content
 */
export async function getChapterContent(
  bookId: string,
  markdownPath: string,
): Promise<string> {
  const fullPath = path.join(DATA_DIR, bookId, markdownPath);

  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Check if a book exists
 */
export async function bookExists(bookId: string): Promise<boolean> {
  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });
    return book !== null;
  } catch {
    const metadataPath = path.join(DATA_DIR, bookId, "metadata.json");
    return fs.pathExists(metadataPath);
  }
}

/**
 * Delete a book and all its data
 */
export async function deleteBook(bookId: string): Promise<boolean> {
  const bookDir = path.join(DATA_DIR, bookId);

  try {
    // Delete from database (cascades to bookmarks)
    await prisma.book.delete({
      where: { id: bookId },
    });

    // Delete filesystem data
    await fs.remove(bookDir);

    return true;
  } catch {
    return false;
  }
}

// ============ Bookmark Functions ============

/**
 * Create a bookmark
 */
export async function createBookmark(
  userId: string,
  bookId: string,
): Promise<boolean> {
  try {
    await prisma.bookmark.create({
      data: { userId, bookId },
    });
    return true;
  } catch {
    // Already bookmarked or book doesn't exist
    return false;
  }
}

/**
 * Remove a bookmark
 */
export async function removeBookmark(
  userId: string,
  bookId: string,
): Promise<boolean> {
  try {
    await prisma.bookmark.delete({
      where: {
        userId_bookId: { userId, bookId },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user has bookmarked a book
 */
export async function hasBookmarked(
  userId: string,
  bookId: string,
): Promise<boolean> {
  const bookmark = await prisma.bookmark.findUnique({
    where: {
      userId_bookId: { userId, bookId },
    },
  });
  return bookmark !== null;
}

/**
 * Get all bookmarks for a user
 */
export async function getUserBookmarks(userId: string): Promise<Book[]> {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: { book: true },
    orderBy: { createdAt: "desc" },
  });

  const books = await Promise.all(
    bookmarks.map(async (bookmark) => {
      const voiceProfile = await loadVoiceProfile(bookmark.book.id);
      return prismaBookToBook(bookmark.book, voiceProfile);
    }),
  );

  return books;
}

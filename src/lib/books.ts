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
 * Get all public books (for community library)
 */
export async function getPublicBooks(): Promise<Book[]> {
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
 */
export async function getBook(
  bookId: string,
  userId?: string,
): Promise<BookWithChapters | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
  });

  if (!book) return null;

  // Check access: public books or owned by user
  if (!book.isPublic && book.ownerId !== userId) {
    return null;
  }

  const bookDir = path.join(DATA_DIR, bookId);

  try {
    const [voiceProfile, chapters] = await Promise.all([
      loadVoiceProfile(bookId),
      fs.readJson(path.join(bookDir, "chapters.json")).catch(() => []),
    ]);

    return {
      ...prismaBookToBook(book, voiceProfile),
      chapters: chapters as Chapter[],
    };
  } catch {
    // Return book without chapters if filesystem data missing
    const voiceProfile = await loadVoiceProfile(bookId);
    return {
      ...prismaBookToBook(book, voiceProfile),
      chapters: [],
    };
  }
}

/**
 * Check if user can access a book
 */
export async function canAccessBook(
  bookId: string,
  userId?: string,
): Promise<boolean> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { isPublic: true, ownerId: true },
  });

  if (!book) return false;
  if (book.isPublic) return true;
  return book.ownerId === userId;
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
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true },
  });
  return book !== null;
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

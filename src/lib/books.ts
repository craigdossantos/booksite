/**
 * Book data utilities — reads from Prisma (DB) + Supabase Storage.
 * No local filesystem dependency.
 */

import { prisma } from "@/lib/prisma";
import { supabase, BUCKETS } from "@/lib/supabase";
import type {
  Book,
  BookWithChapters,
  Chapter,
  ProcessingStatus,
  VoiceProfile,
} from "@/types/book";

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
    progress: number;
    currentStep: string;
    errorMessage: string | null;
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
 * Load voice profile from Supabase Storage
 */
async function loadVoiceProfile(
  bookId: string,
): Promise<VoiceProfile | undefined> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKETS.BOOKS)
      .download(`${bookId}/metadata.json`);
    if (error || !data) return undefined;
    const text = await data.text();
    const metadata = JSON.parse(text);
    return metadata.voiceProfile;
  } catch {
    return undefined;
  }
}

/**
 * Get all public books
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
 * Get all books in the library
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
 */
export async function getBook(
  bookId: string,
  userId?: string,
): Promise<BookWithChapters | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
  });

  if (!book) return null;

  if (!book.isPublic && book.ownerId !== userId) {
    return null;
  }

  const [voiceProfile, chapters] = await Promise.all([
    loadVoiceProfile(bookId),
    loadChapters(bookId),
  ]);

  return {
    ...prismaBookToBook(book, voiceProfile),
    chapters,
  };
}

/**
 * Load chapters.json from Supabase Storage
 */
async function loadChapters(bookId: string): Promise<Chapter[]> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKETS.BOOKS)
      .download(`${bookId}/chapters.json`);
    if (error || !data) return [];
    const text = await data.text();
    return JSON.parse(text) as Chapter[];
  } catch {
    return [];
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
  const book = await prisma.book.upsert({
    where: { id: data.id },
    update: {
      title: data.title,
      author: data.author,
      ownerId: data.ownerId,
      isPublic: data.isPublic ?? false,
      status: data.status ?? "uploading",
      progress: 0,
      currentStep: "",
      errorMessage: null,
    },
    create: {
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
 * Get processing status for a book (from DB columns)
 */
export async function getProcessingStatus(
  bookId: string,
): Promise<ProcessingStatus | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      status: true,
      progress: true,
      currentStep: true,
      errorMessage: true,
      chapterCount: true,
      createdAt: true,
    },
  });

  if (!book) return null;

  return {
    bookId: book.id,
    status: book.status as ProcessingStatus["status"],
    progress: book.progress,
    currentStep: book.currentStep,
    chaptersProcessed: book.status === "ready" ? book.chapterCount : 0,
    totalChapters: book.chapterCount,
    error: book.errorMessage ?? undefined,
    startedAt: book.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get chapter markdown content from Supabase Storage
 */
export async function getChapterContent(
  bookId: string,
  markdownPath: string,
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKETS.BOOKS)
      .download(`${bookId}/${markdownPath}`);
    if (error || !data) return "";
    return await data.text();
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
 * Delete a book and all its data (DB + both Storage buckets)
 */
export async function deleteBook(bookId: string): Promise<boolean> {
  try {
    // Delete from database (cascades to bookmarks)
    await prisma.book.delete({
      where: { id: bookId },
    });

    // Delete from Supabase Storage — epubs bucket
    await supabase.storage.from(BUCKETS.EPUBS).remove([`${bookId}.epub`]);

    // Delete from Supabase Storage — books bucket (list then remove)
    const { data: files } = await supabase.storage
      .from(BUCKETS.BOOKS)
      .list(bookId);

    if (files && files.length > 0) {
      // Also list chapters/ subfolder
      const { data: chapterFiles } = await supabase.storage
        .from(BUCKETS.BOOKS)
        .list(`${bookId}/chapters`);

      const paths = files.map((f) => `${bookId}/${f.name}`);
      if (chapterFiles) {
        paths.push(...chapterFiles.map((f) => `${bookId}/chapters/${f.name}`));
      }

      await supabase.storage.from(BUCKETS.BOOKS).remove(paths);
    }

    return true;
  } catch {
    return false;
  }
}

// ============ Bookmark Functions ============

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
    return false;
  }
}

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

/**
 * Book data utilities for the clean slate rebuild
 * Simplified functions for loading book metadata and chapters
 */

import fs from "fs-extra";
import path from "path";
import type {
  Book,
  BookWithChapters,
  Chapter,
  ProcessingStatus,
} from "@/types/book";

const DATA_DIR = path.join(process.cwd(), "data", "books");

/**
 * Get all books in the library
 */
export async function getBooks(): Promise<Book[]> {
  try {
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const books: Book[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const metadataPath = path.join(DATA_DIR, entry.name, "metadata.json");
      if (await fs.pathExists(metadataPath)) {
        try {
          const metadata = await fs.readJson(metadataPath);
          books.push(metadata as Book);
        } catch {
          // Skip invalid books
        }
      }
    }

    // Sort by creation date, newest first
    return books.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

/**
 * Get a single book by ID with its chapters
 */
export async function getBook(
  bookId: string,
): Promise<BookWithChapters | null> {
  const bookDir = path.join(DATA_DIR, bookId);

  try {
    const [metadata, chapters] = await Promise.all([
      fs.readJson(path.join(bookDir, "metadata.json")),
      fs.readJson(path.join(bookDir, "chapters.json")).catch(() => []),
    ]);

    return {
      ...metadata,
      chapters: chapters as Chapter[],
    };
  } catch {
    return null;
  }
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
  const metadataPath = path.join(DATA_DIR, bookId, "metadata.json");
  return fs.pathExists(metadataPath);
}

/**
 * Delete a book and all its data
 */
export async function deleteBook(bookId: string): Promise<boolean> {
  const bookDir = path.join(DATA_DIR, bookId);

  try {
    await fs.remove(bookDir);
    return true;
  } catch {
    return false;
  }
}

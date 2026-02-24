import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import type { Book } from "@/types/book";

// ── Mocks ────────────────────────────────────────────────────────────

const mockDownload = vi.fn();
const mockRemove = vi.fn();
const mockList = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    book: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    bookmark: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        download: mockDownload,
        remove: mockRemove,
        list: mockList,
      })),
    },
  },
  BUCKETS: { BOOKS: "books", EPUBS: "epubs" },
}));

// Import after mocks are declared
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import {
  getPublicBooks,
  getBooks,
  getBook,
  canAccessBook,
  ownsBook,
  createBook,
  updateBook,
  toggleBookVisibility,
  getProcessingStatus,
  getChapterContent,
  bookExists,
  deleteBook,
  getUserLibrary,
  createBookmark,
  removeBookmark,
  hasBookmarked,
  getUserBookmarks,
} from "@/lib/books";

// ── Helpers ──────────────────────────────────────────────────────────

/** Build a fake Prisma book row (all DB columns present). */
function makePrismaBook(overrides: Record<string, unknown> = {}) {
  return {
    id: "book-1",
    title: "Test Book",
    author: "Author A",
    coverUrl: null as string | null,
    chapterCount: 5,
    status: "ready",
    progress: 100,
    currentStep: "",
    errorMessage: null as string | null,
    isPublic: true,
    ownerId: "user-1",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    processedAt: null as Date | null,
    ...overrides,
  };
}

/** Make a Blob-like object that Supabase download returns. */
function makeBlob(content: string) {
  return { text: () => Promise.resolve(content) };
}

// ── Setup ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // By default, loadVoiceProfile returns no profile (download fails)
  mockDownload.mockResolvedValue({
    data: null,
    error: { message: "not found" },
  });
});

// ── prismaBookToBook (tested indirectly) ─────────────────────────────

describe("prismaBookToBook (via getPublicBooks / createBook)", () => {
  it("maps all fields correctly, converting dates to ISO strings", async () => {
    const prismaRow = makePrismaBook({
      processedAt: new Date("2025-06-15T12:00:00Z"),
      coverUrl: "https://example.com/cover.jpg",
    });
    (prisma.book.findMany as Mock).mockResolvedValue([prismaRow]);

    const [book] = await getPublicBooks();

    expect(book).toMatchObject({
      id: "book-1",
      title: "Test Book",
      author: "Author A",
      coverUrl: "https://example.com/cover.jpg",
      chapterCount: 5,
      status: "ready",
      isPublic: true,
      ownerId: "user-1",
      createdAt: "2025-01-01T00:00:00.000Z",
      processedAt: "2025-06-15T12:00:00.000Z",
    });
  });

  it("maps null coverUrl to undefined", async () => {
    (prisma.book.findMany as Mock).mockResolvedValue([makePrismaBook()]);

    const [book] = await getPublicBooks();

    expect(book.coverUrl).toBeUndefined();
  });

  it("maps null processedAt to undefined", async () => {
    (prisma.book.findMany as Mock).mockResolvedValue([
      makePrismaBook({ processedAt: null }),
    ]);

    const [book] = await getPublicBooks();

    expect(book.processedAt).toBeUndefined();
  });

  it("attaches a voice profile when metadata.json is available", async () => {
    const voiceProfile = {
      tone: "conversational",
      style: "first-person",
      complexity: "moderate",
      characteristics: ["witty"],
    };
    mockDownload.mockResolvedValue({
      data: makeBlob(JSON.stringify({ voiceProfile })),
      error: null,
    });
    (prisma.book.findMany as Mock).mockResolvedValue([makePrismaBook()]);

    const [book] = await getPublicBooks();

    expect(book.voiceProfile).toEqual(voiceProfile);
  });
});

// ── getPublicBooks ───────────────────────────────────────────────────

describe("getPublicBooks", () => {
  it("queries prisma with isPublic: true, ordered desc", async () => {
    (prisma.book.findMany as Mock).mockResolvedValue([]);

    await getPublicBooks();

    expect(prisma.book.findMany).toHaveBeenCalledWith({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns all public books", async () => {
    (prisma.book.findMany as Mock).mockResolvedValue([
      makePrismaBook({ id: "a" }),
      makePrismaBook({ id: "b" }),
    ]);

    const books = await getPublicBooks();

    expect(books).toHaveLength(2);
    expect(books[0].id).toBe("a");
    expect(books[1].id).toBe("b");
  });
});

// ── getBooks ─────────────────────────────────────────────────────────

describe("getBooks", () => {
  it("queries only public books when no userId is given", async () => {
    (prisma.book.findMany as Mock).mockResolvedValue([]);

    await getBooks();

    expect(prisma.book.findMany).toHaveBeenCalledWith({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("queries public OR owned books when userId is given", async () => {
    (prisma.book.findMany as Mock).mockResolvedValue([]);

    await getBooks("user-1");

    expect(prisma.book.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ isPublic: true }, { ownerId: "user-1" }],
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

// ── getBook ──────────────────────────────────────────────────────────

describe("getBook", () => {
  it("returns null when book does not exist", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(null);

    const result = await getBook("nonexistent");

    expect(result).toBeNull();
  });

  it("returns null when book is private and userId doesn't match ownerId", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(
      makePrismaBook({ isPublic: false, ownerId: "user-1" }),
    );

    const result = await getBook("book-1", "user-other");

    expect(result).toBeNull();
  });

  it("returns null when book is private and no userId supplied", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(
      makePrismaBook({ isPublic: false, ownerId: "user-1" }),
    );

    const result = await getBook("book-1");

    expect(result).toBeNull();
  });

  it("returns book with chapters for public book", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(
      makePrismaBook({ isPublic: true }),
    );
    // First call: loadVoiceProfile download, second: loadChapters download
    const chapters = [
      {
        number: 1,
        title: "Intro",
        markdownPath: "chapters/01.md",
        wordCount: 500,
      },
    ];
    mockDownload
      .mockResolvedValueOnce({ data: null, error: { message: "no metadata" } }) // voice profile
      .mockResolvedValueOnce({
        data: makeBlob(JSON.stringify(chapters)),
        error: null,
      }); // chapters

    const result = await getBook("book-1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("book-1");
    expect(result!.chapters).toEqual(chapters);
  });

  it("returns book when private book matches userId", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(
      makePrismaBook({ isPublic: false, ownerId: "user-1" }),
    );
    mockDownload.mockResolvedValue({ data: null, error: { message: "err" } });

    const result = await getBook("book-1", "user-1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("book-1");
  });
});

// ── canAccessBook ────────────────────────────────────────────────────

describe("canAccessBook", () => {
  it("returns false for non-existent book", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(null);

    expect(await canAccessBook("missing")).toBe(false);
  });

  it("returns true for public book (no userId needed)", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({
      isPublic: true,
      ownerId: "user-1",
    });

    expect(await canAccessBook("book-1")).toBe(true);
  });

  it("returns true when userId matches ownerId of private book", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({
      isPublic: false,
      ownerId: "user-1",
    });

    expect(await canAccessBook("book-1", "user-1")).toBe(true);
  });

  it("returns false when userId does not match ownerId of private book", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({
      isPublic: false,
      ownerId: "user-1",
    });

    expect(await canAccessBook("book-1", "user-other")).toBe(false);
  });

  it("returns false for private book with no userId", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({
      isPublic: false,
      ownerId: "user-1",
    });

    expect(await canAccessBook("book-1")).toBe(false);
  });
});

// ── ownsBook ─────────────────────────────────────────────────────────

describe("ownsBook", () => {
  it("returns true when userId matches ownerId", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({ ownerId: "user-1" });

    expect(await ownsBook("book-1", "user-1")).toBe(true);
  });

  it("returns false when userId does not match ownerId", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({ ownerId: "user-1" });

    expect(await ownsBook("book-1", "user-other")).toBe(false);
  });

  it("returns false when book does not exist", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(null);

    expect(await ownsBook("missing", "user-1")).toBe(false);
  });
});

// ── createBook ───────────────────────────────────────────────────────

describe("createBook", () => {
  it("calls prisma upsert and returns mapped Book", async () => {
    const prismaRow = makePrismaBook({ status: "uploading", progress: 0 });
    (prisma.book.upsert as Mock).mockResolvedValue(prismaRow);

    const result = await createBook({
      id: "book-1",
      title: "Test Book",
      author: "Author A",
      ownerId: "user-1",
    });

    expect(prisma.book.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "book-1" },
        create: expect.objectContaining({
          id: "book-1",
          title: "Test Book",
          author: "Author A",
          ownerId: "user-1",
          isPublic: false,
          status: "uploading",
        }),
      }),
    );
    expect(result.id).toBe("book-1");
    expect(result.title).toBe("Test Book");
  });
});

// ── updateBook ───────────────────────────────────────────────────────

describe("updateBook", () => {
  it("returns mapped Book on success", async () => {
    const prismaRow = makePrismaBook({ title: "Updated Title" });
    (prisma.book.update as Mock).mockResolvedValue(prismaRow);

    const result = await updateBook("book-1", { title: "Updated Title" });

    expect(result).not.toBeNull();
    expect(result!.title).toBe("Updated Title");
  });

  it("returns null when update throws (e.g. book not found)", async () => {
    (prisma.book.update as Mock).mockRejectedValue(new Error("Not found"));

    const result = await updateBook("missing", { title: "X" });

    expect(result).toBeNull();
  });
});

// ── toggleBookVisibility ─────────────────────────────────────────────

describe("toggleBookVisibility", () => {
  it("returns null when user does not own the book", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({
      ownerId: "user-1",
      isPublic: false,
    });

    const result = await toggleBookVisibility("book-1", "user-other");

    expect(result).toBeNull();
  });

  it("returns null when book does not exist", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(null);

    const result = await toggleBookVisibility("missing", "user-1");

    expect(result).toBeNull();
  });

  it("toggles isPublic from false to true for the owner", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({
      ownerId: "user-1",
      isPublic: false,
    });
    (prisma.book.update as Mock).mockResolvedValue(
      makePrismaBook({ isPublic: true }),
    );

    const result = await toggleBookVisibility("book-1", "user-1");

    expect(prisma.book.update).toHaveBeenCalledWith({
      where: { id: "book-1" },
      data: { isPublic: true },
    });
    expect(result).not.toBeNull();
    expect(result!.isPublic).toBe(true);
  });
});

// ── getProcessingStatus ──────────────────────────────────────────────

describe("getProcessingStatus", () => {
  it("returns null when book does not exist", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(null);

    expect(await getProcessingStatus("missing")).toBeNull();
  });

  it("returns status with chaptersProcessed = chapterCount when ready", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({
      id: "book-1",
      status: "ready",
      progress: 100,
      currentStep: "",
      errorMessage: null,
      chapterCount: 5,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    });

    const status = await getProcessingStatus("book-1");

    expect(status).not.toBeNull();
    expect(status!.bookId).toBe("book-1");
    expect(status!.status).toBe("ready");
    expect(status!.chaptersProcessed).toBe(5);
    expect(status!.totalChapters).toBe(5);
    expect(status!.error).toBeUndefined();
    expect(status!.startedAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("returns chaptersProcessed = 0 when status is not ready", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({
      id: "book-1",
      status: "analyzing",
      progress: 50,
      currentStep: "Analyzing voice",
      errorMessage: null,
      chapterCount: 5,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    });

    const status = await getProcessingStatus("book-1");

    expect(status!.chaptersProcessed).toBe(0);
  });

  it("maps errorMessage to error field", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({
      id: "book-1",
      status: "error",
      progress: 30,
      currentStep: "Extracting",
      errorMessage: "Something went wrong",
      chapterCount: 5,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    });

    const status = await getProcessingStatus("book-1");

    expect(status!.error).toBe("Something went wrong");
  });
});

// ── getChapterContent ────────────────────────────────────────────────

describe("getChapterContent", () => {
  it("returns markdown content from storage", async () => {
    mockDownload.mockResolvedValue({
      data: makeBlob("# Chapter 1\n\nHello world"),
      error: null,
    });

    const content = await getChapterContent("book-1", "chapters/01.md");

    expect(content).toBe("# Chapter 1\n\nHello world");
    expect(supabase.storage.from).toHaveBeenCalledWith("books");
    expect(mockDownload).toHaveBeenCalledWith("book-1/chapters/01.md");
  });

  it("returns empty string on error", async () => {
    mockDownload.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const content = await getChapterContent("book-1", "chapters/99.md");

    expect(content).toBe("");
  });

  it("returns empty string on thrown exception", async () => {
    mockDownload.mockRejectedValue(new Error("Network error"));

    const content = await getChapterContent("book-1", "chapters/01.md");

    expect(content).toBe("");
  });
});

// ── bookExists ───────────────────────────────────────────────────────

describe("bookExists", () => {
  it("returns true when book exists", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue({ id: "book-1" });

    expect(await bookExists("book-1")).toBe(true);
  });

  it("returns false when book does not exist", async () => {
    (prisma.book.findUnique as Mock).mockResolvedValue(null);

    expect(await bookExists("missing")).toBe(false);
  });
});

// ── deleteBook ───────────────────────────────────────────────────────

describe("deleteBook", () => {
  it("deletes from DB, removes epub, lists and removes book files", async () => {
    (prisma.book.delete as Mock).mockResolvedValue({});
    mockRemove.mockResolvedValue({ data: [], error: null });
    mockList
      .mockResolvedValueOnce({
        data: [{ name: "metadata.json" }, { name: "chapters.json" }],
      })
      .mockResolvedValueOnce({
        data: [{ name: "01.md" }, { name: "02.md" }],
      });

    const result = await deleteBook("book-1");

    expect(result).toBe(true);
    expect(prisma.book.delete).toHaveBeenCalledWith({
      where: { id: "book-1" },
    });
    // Should remove epub
    expect(supabase.storage.from).toHaveBeenCalledWith("epubs");
    expect(mockRemove).toHaveBeenCalledWith(["book-1.epub"]);
    // Should list book files and chapter files
    expect(mockList).toHaveBeenCalledWith("book-1");
    expect(mockList).toHaveBeenCalledWith("book-1/chapters");
    // Should remove all listed files
    expect(mockRemove).toHaveBeenCalledWith([
      "book-1/metadata.json",
      "book-1/chapters.json",
      "book-1/chapters/01.md",
      "book-1/chapters/02.md",
    ]);
  });

  it("returns true even when no files exist in storage", async () => {
    (prisma.book.delete as Mock).mockResolvedValue({});
    mockRemove.mockResolvedValue({ data: [], error: null });
    mockList.mockResolvedValue({ data: [] });

    const result = await deleteBook("book-1");

    expect(result).toBe(true);
  });

  it("returns false when prisma delete throws", async () => {
    (prisma.book.delete as Mock).mockRejectedValue(new Error("DB error"));

    const result = await deleteBook("book-1");

    expect(result).toBe(false);
  });
});

// ── getUserLibrary ───────────────────────────────────────────────────

describe("getUserLibrary", () => {
  it("returns owned and bookmarked books", async () => {
    const ownedRow = makePrismaBook({ id: "owned-1", ownerId: "user-1" });
    const bookmarkedRow = makePrismaBook({
      id: "bookmarked-1",
      ownerId: "user-2",
    });

    (prisma.book.findMany as Mock).mockResolvedValue([ownedRow]);
    (prisma.bookmark.findMany as Mock).mockResolvedValue([
      {
        id: "bm-1",
        userId: "user-1",
        bookId: "bookmarked-1",
        createdAt: new Date(),
        book: bookmarkedRow,
      },
    ]);

    const result = await getUserLibrary("user-1");

    expect(result.owned).toHaveLength(1);
    expect(result.owned[0].id).toBe("owned-1");
    expect(result.bookmarked).toHaveLength(1);
    expect(result.bookmarked[0].id).toBe("bookmarked-1");
  });
});

// ── Bookmark Functions ───────────────────────────────────────────────

describe("createBookmark", () => {
  it("returns true on success", async () => {
    (prisma.bookmark.create as Mock).mockResolvedValue({});

    const result = await createBookmark("user-1", "book-1");

    expect(result).toBe(true);
    expect(prisma.bookmark.create).toHaveBeenCalledWith({
      data: { userId: "user-1", bookId: "book-1" },
    });
  });

  it("returns false on error (e.g. duplicate)", async () => {
    (prisma.bookmark.create as Mock).mockRejectedValue(
      new Error("Unique constraint"),
    );

    const result = await createBookmark("user-1", "book-1");

    expect(result).toBe(false);
  });
});

describe("removeBookmark", () => {
  it("returns true on success", async () => {
    (prisma.bookmark.delete as Mock).mockResolvedValue({});

    const result = await removeBookmark("user-1", "book-1");

    expect(result).toBe(true);
    expect(prisma.bookmark.delete).toHaveBeenCalledWith({
      where: { userId_bookId: { userId: "user-1", bookId: "book-1" } },
    });
  });

  it("returns false when bookmark does not exist", async () => {
    (prisma.bookmark.delete as Mock).mockRejectedValue(
      new Error("Record not found"),
    );

    const result = await removeBookmark("user-1", "book-1");

    expect(result).toBe(false);
  });
});

describe("hasBookmarked", () => {
  it("returns true when bookmark exists", async () => {
    (prisma.bookmark.findUnique as Mock).mockResolvedValue({
      id: "bm-1",
      userId: "user-1",
      bookId: "book-1",
    });

    expect(await hasBookmarked("user-1", "book-1")).toBe(true);
  });

  it("returns false when bookmark does not exist", async () => {
    (prisma.bookmark.findUnique as Mock).mockResolvedValue(null);

    expect(await hasBookmarked("user-1", "book-1")).toBe(false);
  });
});

describe("getUserBookmarks", () => {
  it("returns books from user's bookmarks", async () => {
    const bookRow = makePrismaBook({ id: "book-1" });
    (prisma.bookmark.findMany as Mock).mockResolvedValue([
      {
        id: "bm-1",
        userId: "user-1",
        bookId: "book-1",
        createdAt: new Date(),
        book: bookRow,
      },
    ]);

    const books = await getUserBookmarks("user-1");

    expect(books).toHaveLength(1);
    expect(books[0].id).toBe("book-1");
  });

  it("returns empty array when user has no bookmarks", async () => {
    (prisma.bookmark.findMany as Mock).mockResolvedValue([]);

    const books = await getUserBookmarks("user-1");

    expect(books).toEqual([]);
  });
});

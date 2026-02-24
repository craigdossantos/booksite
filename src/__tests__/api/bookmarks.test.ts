import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { GET, POST } from "@/app/api/bookmarks/route";
import { DELETE } from "@/app/api/bookmarks/[id]/route";
import { auth } from "@/auth";
import {
  createBookmark,
  canAccessBook,
  getUserBookmarks,
  removeBookmark,
} from "@/lib/books";
import type { Book } from "@/types/book";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/books", () => ({
  createBookmark: vi.fn(),
  canAccessBook: vi.fn(),
  getUserBookmarks: vi.fn(),
  removeBookmark: vi.fn(),
}));

const mockAuth = auth as unknown as ReturnType<
  typeof vi.fn<() => Promise<Session | null>>
>;
const mockCreateBookmark = vi.mocked(createBookmark);
const mockCanAccessBook = vi.mocked(canAccessBook);
const mockGetUserBookmarks = vi.mocked(getUserBookmarks);
const mockRemoveBookmark = vi.mocked(removeBookmark);

const SAMPLE_BOOKMARKS: Book[] = [
  {
    id: "book-1",
    title: "Book One",
    author: "Author One",
    chapterCount: 5,
    createdAt: "2025-01-01T00:00:00Z",
    status: "ready",
    isPublic: true,
  },
  {
    id: "book-2",
    title: "Book Two",
    author: "Author Two",
    chapterCount: 10,
    createdAt: "2025-02-01T00:00:00Z",
    status: "ready",
    isPublic: true,
  },
];

function authedSession(userId = "user-1") {
  return {
    user: { id: userId, name: "Test User", email: "test@example.com" },
    expires: "",
  };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/bookmarks", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("returns bookmarks for authenticated user", async () => {
    mockAuth.mockResolvedValue(authedSession());
    mockGetUserBookmarks.mockResolvedValue(SAMPLE_BOOKMARKS);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bookmarks).toEqual(SAMPLE_BOOKMARKS);
    expect(mockGetUserBookmarks).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/bookmarks", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ bookId: "book-1" }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("returns 400 when bookId is missing", async () => {
    mockAuth.mockResolvedValue(authedSession());

    const req = new NextRequest("http://localhost/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Book ID is required");
  });

  it("returns 404 when book isn't accessible", async () => {
    mockAuth.mockResolvedValue(authedSession());
    mockCanAccessBook.mockResolvedValue(false);

    const req = new NextRequest("http://localhost/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ bookId: "private-book" }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Book not found");
    expect(mockCanAccessBook).toHaveBeenCalledWith("private-book", "user-1");
  });

  it("returns 400 when already bookmarked", async () => {
    mockAuth.mockResolvedValue(authedSession());
    mockCanAccessBook.mockResolvedValue(true);
    mockCreateBookmark.mockResolvedValue(false);

    const req = new NextRequest("http://localhost/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ bookId: "book-1" }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Already bookmarked or book not found");
    expect(mockCreateBookmark).toHaveBeenCalledWith("user-1", "book-1");
  });

  it("returns 200 on successful bookmark", async () => {
    mockAuth.mockResolvedValue(authedSession());
    mockCanAccessBook.mockResolvedValue(true);
    mockCreateBookmark.mockResolvedValue(true);

    const req = new NextRequest("http://localhost/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ bookId: "book-1" }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Book bookmarked successfully");
  });
});

describe("DELETE /api/bookmarks/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/bookmarks/book-1", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("book-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("returns 404 when bookmark doesn't exist", async () => {
    mockAuth.mockResolvedValue(authedSession());
    mockRemoveBookmark.mockResolvedValue(false);

    const req = new NextRequest("http://localhost/api/bookmarks/book-99", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("book-99"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Bookmark not found");
    expect(mockRemoveBookmark).toHaveBeenCalledWith("user-1", "book-99");
  });

  it("returns 200 on successful removal", async () => {
    mockAuth.mockResolvedValue(authedSession());
    mockRemoveBookmark.mockResolvedValue(true);

    const req = new NextRequest("http://localhost/api/bookmarks/book-1", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("book-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Bookmark removed successfully");
  });
});

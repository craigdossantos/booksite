import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { GET, DELETE } from "@/app/api/books/[id]/route";
import { auth } from "@/auth";
import { getBook, deleteBook, ownsBook } from "@/lib/books";
import type { BookWithChapters } from "@/types/book";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/books", () => ({
  getBook: vi.fn(),
  deleteBook: vi.fn(),
  ownsBook: vi.fn(),
}));

const mockAuth = auth as unknown as ReturnType<
  typeof vi.fn<() => Promise<Session | null>>
>;
const mockGetBook = vi.mocked(getBook);
const mockDeleteBook = vi.mocked(deleteBook);
const mockOwnsBook = vi.mocked(ownsBook);

const TEST_BOOK: BookWithChapters = {
  id: "test-id",
  title: "Test Book",
  author: "Test Author",
  chapterCount: 3,
  createdAt: "2025-01-01T00:00:00Z",
  status: "ready",
  isPublic: true,
  chapters: [],
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/books/[id]", () => {
  it("returns 404 when book doesn't exist", async () => {
    mockAuth.mockResolvedValue(null);
    mockGetBook.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/books/nonexistent");
    const response = await GET(req, makeParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Book not found");
    expect(mockGetBook).toHaveBeenCalledWith("nonexistent", undefined);
  });

  it("returns book data when found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });
    mockGetBook.mockResolvedValue(TEST_BOOK);

    const req = new NextRequest("http://localhost/api/books/test-id");
    const response = await GET(req, makeParams("test-id"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.book).toEqual(TEST_BOOK);
    expect(mockGetBook).toHaveBeenCalledWith("test-id", "user-1");
  });
});

describe("DELETE /api/books/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/books/test-id", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("test-id"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("returns 403 when user doesn't own the book", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });
    mockOwnsBook.mockResolvedValue(false);

    const req = new NextRequest("http://localhost/api/books/test-id", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("test-id"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You can only delete your own books");
    expect(mockOwnsBook).toHaveBeenCalledWith("test-id", "user-1");
  });

  it("returns 200 and calls deleteBook when owner requests deletion", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });
    mockOwnsBook.mockResolvedValue(true);
    mockDeleteBook.mockResolvedValue(true);

    const req = new NextRequest("http://localhost/api/books/test-id", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("test-id"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteBook).toHaveBeenCalledWith("test-id");
  });

  it("returns 500 when deleteBook fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "t@t.com" },
      expires: "",
    });
    mockOwnsBook.mockResolvedValue(true);
    mockDeleteBook.mockResolvedValue(false);

    const req = new NextRequest("http://localhost/api/books/test-id", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("test-id"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete book");
  });
});

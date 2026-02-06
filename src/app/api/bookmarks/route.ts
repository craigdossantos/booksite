import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBookmark, canAccessBook, getUserBookmarks } from "@/lib/books";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const bookmarks = await getUserBookmarks(session.user.id);
  return NextResponse.json({ bookmarks });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const { bookId } = body;

  if (!bookId) {
    return NextResponse.json({ error: "Book ID is required" }, { status: 400 });
  }

  // Check if user can access the book (must be public)
  const canAccess = await canAccessBook(bookId, session.user.id);
  if (!canAccess) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const success = await createBookmark(session.user.id, bookId);

  if (!success) {
    return NextResponse.json(
      { error: "Already bookmarked or book not found" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Book bookmarked successfully",
  });
}

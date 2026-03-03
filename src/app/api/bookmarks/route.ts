import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/supabase/auth-helpers";
import { createBookmark, canAccessBook, getUserBookmarks } from "@/lib/books";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const bookmarks = await getUserBookmarks(userId);
  return NextResponse.json({ bookmarks });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
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
  const canAccess = await canAccessBook(bookId, userId);
  if (!canAccess) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const success = await createBookmark(userId, bookId);

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

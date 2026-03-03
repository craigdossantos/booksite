import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/supabase/auth-helpers";
import { toggleBookVisibility } from "@/lib/books";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Require authentication
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // Toggle visibility (function verifies ownership)
  const book = await toggleBookVisibility(id, userId);

  if (!book) {
    return NextResponse.json(
      { error: "Book not found or you don't have permission" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    book,
    message: book.isPublic ? "Book is now public" : "Book is now private",
  });
}

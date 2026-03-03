import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/supabase/auth-helpers";
import { removeBookmark } from "@/lib/books";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bookId } = await params;

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const success = await removeBookmark(userId, bookId);

  if (!success) {
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "Bookmark removed successfully",
  });
}

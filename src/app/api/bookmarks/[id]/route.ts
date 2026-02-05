import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { removeBookmark } from "@/lib/books";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bookId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const success = await removeBookmark(session.user.id, bookId);

  if (!success) {
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "Bookmark removed successfully",
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBook, deleteBook, ownsBook } from "@/lib/books";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();

  // getBook checks visibility - returns null if user doesn't have access
  const book = await getBook(id, session?.user?.id);

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json({ book });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Require authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // Verify ownership
  const isOwner = await ownsBook(id, session.user.id);
  if (!isOwner) {
    return NextResponse.json(
      { error: "You can only delete your own books" },
      { status: 403 },
    );
  }

  const deleted = await deleteBook(id);

  if (!deleted) {
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getBook, deleteBook, bookExists } from "@/lib/books";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const book = await getBook(id);

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

  if (!(await bookExists(id))) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
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

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBooks, getPublicBooks } from "@/lib/books";

export async function GET() {
  const session = await auth();

  // If authenticated, return public books + user's private books
  // If not authenticated, return only public books
  const books = session?.user?.id
    ? await getBooks(session.user.id)
    : await getPublicBooks();

  return NextResponse.json({ books });
}

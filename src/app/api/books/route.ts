import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/supabase/auth-helpers";
import { getBooks, getPublicBooks } from "@/lib/books";

export async function GET() {
  const userId = await getAuthUserId();

  // If authenticated, return public books + user's private books
  // If not authenticated, return only public books
  const books = userId ? await getBooks(userId) : await getPublicBooks();

  return NextResponse.json({ books });
}

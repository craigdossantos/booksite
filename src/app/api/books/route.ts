import { NextResponse } from "next/server";
import { getBooks } from "@/lib/books";

export async function GET() {
  const books = await getBooks();
  return NextResponse.json({ books });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicBookUrl } from "@/lib/supabase-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const book = await prisma.book.findUnique({
    where: { id },
    select: { coverUrl: true },
  });

  if (book?.coverUrl) {
    return NextResponse.redirect(book.coverUrl);
  }

  // Fallback: try the default Storage path
  const url = getPublicBookUrl(id, "cover.jpg");
  return NextResponse.redirect(url);
}

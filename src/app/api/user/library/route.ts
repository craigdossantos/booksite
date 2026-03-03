import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/supabase/auth-helpers";
import { getUserLibrary } from "@/lib/books";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const library = await getUserLibrary(userId);

  return NextResponse.json({
    owned: library.owned,
    bookmarked: library.bookmarked,
  });
}

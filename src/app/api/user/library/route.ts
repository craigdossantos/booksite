import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserLibrary } from "@/lib/books";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const library = await getUserLibrary(session.user.id);

  return NextResponse.json({
    owned: library.owned,
    bookmarked: library.bookmarked,
  });
}

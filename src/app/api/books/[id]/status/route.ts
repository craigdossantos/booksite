import { NextRequest, NextResponse } from "next/server";
import { getProcessingStatus } from "@/lib/books";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const status = await getProcessingStatus(id);

  if (!status) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json(status);
}

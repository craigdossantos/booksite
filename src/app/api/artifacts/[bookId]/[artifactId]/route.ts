import { getArtifact, getArtifactHtml } from "@/lib/artifacts";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; artifactId: string }> },
) {
  const { bookId, artifactId } = await params;
  const version = req.nextUrl.searchParams.get("version");

  const meta = await getArtifact(bookId, artifactId);
  if (!meta) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const html = await getArtifactHtml(
    bookId,
    artifactId,
    version ? parseInt(version, 10) : undefined,
  );

  return Response.json({ meta, html });
}

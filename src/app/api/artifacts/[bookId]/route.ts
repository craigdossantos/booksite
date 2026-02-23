import { listArtifacts } from "@/lib/artifacts";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const artifacts = await listArtifacts(bookId);
  return Response.json({ artifacts });
}

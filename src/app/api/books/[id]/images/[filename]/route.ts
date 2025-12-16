import { NextRequest, NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const { id, filename } = await params;
  const decodedFilename = decodeURIComponent(filename);
  const imagePath = path.join(
    process.cwd(),
    "data",
    "books",
    id,
    "images",
    decodedFilename
  );

  if (!await fs.pathExists(imagePath)) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  try {
    const imageBuffer = await fs.readFile(imagePath);
    const ext = path.extname(decodedFilename).toLowerCase();

    const contentType = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
    }[ext] || "application/octet-stream";

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";

interface GeneratedImage {
  concept_name: string;
  filename: string;
  path: string;
  style: string;
  prompt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataDir = path.join(process.cwd(), "data", "books", id);
  const manifestPath = path.join(dataDir, "generated_images.json");

  if (!await fs.pathExists(manifestPath)) {
    return NextResponse.json({ images: [], hasImages: false });
  }

  try {
    const images: GeneratedImage[] = await fs.readJson(manifestPath);

    // Convert paths to relative URLs
    const imageData = images.map((img) => ({
      concept_name: img.concept_name,
      filename: img.filename,
      url: `/api/books/${id}/images/${encodeURIComponent(img.filename)}`,
      style: img.style,
      prompt: img.prompt,
    }));

    return NextResponse.json({
      images: imageData,
      hasImages: imageData.length > 0,
      count: imageData.length,
    });
  } catch (error) {
    console.error("Error reading images manifest:", error);
    return NextResponse.json({ images: [], hasImages: false });
  }
}

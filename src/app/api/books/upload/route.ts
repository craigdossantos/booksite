import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { spawn } from "child_process";
import { createHash } from "crypto";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".epub")) {
      return NextResponse.json(
        { error: "Please upload a valid EPUB file" },
        { status: 400 },
      );
    }

    // Generate book ID from filename hash
    const bookId = createHash("md5")
      .update(file.name)
      .digest("hex")
      .slice(0, 12);

    const booksDir = path.join(process.cwd(), "public", "books");
    const dataDir = path.join(process.cwd(), "data", "books", bookId);

    // Create directories
    await mkdir(booksDir, { recursive: true });
    await mkdir(dataDir, { recursive: true });

    // Save EPUB file
    const buffer = Buffer.from(await file.arrayBuffer());
    const epubPath = path.join(booksDir, file.name);
    await writeFile(epubPath, buffer);

    // Initialize status.json
    const status = {
      bookId,
      status: "uploading",
      progress: 0,
      currentStep: "File uploaded, starting processing",
      chaptersProcessed: 0,
      totalChapters: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeFile(
      path.join(dataDir, "status.json"),
      JSON.stringify(status, null, 2),
    );

    // Start processing in background
    const pythonProcess = spawn(
      "python3",
      [
        path.join(process.cwd(), "execution", "process_book.py"),
        "--filename",
        file.name,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        detached: true,
        stdio: "ignore",
      },
    );
    pythonProcess.unref();

    return NextResponse.json({
      bookId,
      status: "uploading",
      message: "Book uploaded and processing started",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload book" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { spawn } from "child_process";
import { createHash } from "crypto";
import path from "path";
import { auth } from "@/auth";
import { createBook } from "@/lib/books";

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const isPublic = formData.get("isPublic") === "true";

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

    // Initialize metadata.json and status.json on filesystem
    const bookTitle = file.name.replace(/\.epub$/i, "");
    const now = new Date().toISOString();

    const metadata = {
      id: bookId,
      title: bookTitle,
      author: "Unknown",
      chapterCount: 0,
      status: "uploading",
      isPublic,
      ownerId: session.user.id,
      createdAt: now,
    };
    await writeFile(
      path.join(dataDir, "metadata.json"),
      JSON.stringify(metadata, null, 2),
    );

    const status = {
      bookId,
      status: "uploading",
      progress: 0,
      currentStep: "File uploaded, starting processing",
      chaptersProcessed: 0,
      totalChapters: 0,
      startedAt: now,
      updatedAt: now,
    };
    await writeFile(
      path.join(dataDir, "status.json"),
      JSON.stringify(status, null, 2),
    );

    // Create book in database with ownership (non-fatal if DB unavailable)
    try {
      await createBook({
        id: bookId,
        title: bookTitle,
        author: "Unknown",
        ownerId: session.user.id,
        isPublic,
        status: "uploading",
      });
    } catch (dbError) {
      console.warn(
        "Database unavailable, book saved to filesystem only:",
        dbError,
      );
    }

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
      isPublic,
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

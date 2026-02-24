import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac } from "crypto";
import { auth } from "@/auth";
import { createBook } from "@/lib/books";
import { supabase, BUCKETS } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
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

    const bookId = createHash("md5")
      .update(file.name)
      .digest("hex")
      .slice(0, 12);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload EPUB to Supabase Storage (private bucket)
    const { error: uploadError } = await supabase.storage
      .from(BUCKETS.EPUBS)
      .upload(`${bookId}.epub`, buffer, {
        contentType: "application/epub+zip",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 },
      );
    }

    const bookTitle = file.name.replace(/\.epub$/i, "");

    // Create book record in database
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
      console.warn("Database unavailable:", dbError);
      // Clean up uploaded file
      await supabase.storage.from(BUCKETS.EPUBS).remove([`${bookId}.epub`]);
      const errMsg =
        dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json(
        { error: "Database unavailable", detail: errMsg },
        { status: 503 },
      );
    }

    // Send webhook to Railway for processing
    const webhookUrl = process.env.RAILWAY_WEBHOOK_URL;
    const webhookSecret = process.env.RAILWAY_WEBHOOK_SECRET;

    if (webhookUrl && webhookSecret) {
      const payload = JSON.stringify({ book_id: bookId });
      const signature =
        "sha256=" +
        createHmac("sha256", webhookSecret).update(payload).digest("hex");

      try {
        const res = await fetch(`${webhookUrl}/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
          },
          body: payload,
        });

        if (!res.ok) {
          console.error(
            "Railway webhook failed:",
            res.status,
            await res.text(),
          );
        }
      } catch (webhookError) {
        console.error("Railway webhook error:", webhookError);
      }
    } else {
      console.warn(
        "Railway webhook not configured — book uploaded but processing skipped",
      );
    }

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

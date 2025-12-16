import { NextRequest, NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const dataDir = path.join(process.cwd(), "data", "books", id);
    const coverPath = path.join(dataDir, "cover.jpg");

    if (await fs.pathExists(coverPath)) {
        const imageBuffer = await fs.readFile(coverPath);
        return new NextResponse(imageBuffer, {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    }

    return new NextResponse("Cover not found", { status: 404 });
}

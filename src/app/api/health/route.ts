import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ db: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DB error";
    console.error("[health] DB connection failed:", message);
    return NextResponse.json({ db: "error", message }, { status: 500 });
  }
}

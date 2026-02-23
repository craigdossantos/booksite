import fs from "fs-extra";
import path from "path";
import type { SessionSummary } from "@/types/book";

const DATA_DIR = path.join(process.cwd(), "data", "books");

function sanitizeId(id: string): string {
  return id.replace(/[\/\\\.]+/g, "").slice(0, 64);
}

export async function getSessionSummary(
  bookId: string,
): Promise<SessionSummary | null> {
  const p = path.join(DATA_DIR, sanitizeId(bookId), "session-summary.json");
  if (!(await fs.pathExists(p))) return null;
  return fs.readJson(p);
}

export async function saveSessionSummary(
  bookId: string,
  summary: SessionSummary,
): Promise<void> {
  const p = path.join(DATA_DIR, sanitizeId(bookId), "session-summary.json");
  await fs.writeJson(
    p,
    { ...summary, lastUpdated: new Date().toISOString() },
    { spaces: 2 },
  );
}

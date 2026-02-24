import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import type {
  ArtifactMeta,
  ArtifactIndexEntry,
  ArtifactType,
} from "@/types/book";

const DATA_DIR = path.join(process.cwd(), "data", "books");

/** Strip path separators and traversal sequences from an ID. */
function sanitizeId(id: string): string {
  return id.replace(/[\/\\\.]+/g, "").slice(0, 64);
}

function artifactsDir(bookId: string): string {
  return path.join(DATA_DIR, sanitizeId(bookId), "artifacts");
}

function indexPath(bookId: string): string {
  return path.join(artifactsDir(bookId), "artifact-index.json");
}

function artifactDir(bookId: string, artifactId: string): string {
  return path.join(artifactsDir(bookId), sanitizeId(artifactId));
}

async function readIndex(bookId: string): Promise<ArtifactIndexEntry[]> {
  const p = indexPath(bookId);
  if (!(await fs.pathExists(p))) return [];
  return fs.readJson(p);
}

async function writeIndex(
  bookId: string,
  index: ArtifactIndexEntry[],
): Promise<void> {
  await fs.ensureDir(artifactsDir(bookId));
  await fs.writeJson(indexPath(bookId), index, { spaces: 2 });
}

export async function createArtifact(
  bookId: string,
  input: {
    title: string;
    description: string;
    htmlContent: string;
    chapters: number[];
    type?: ArtifactType;
  },
): Promise<ArtifactIndexEntry> {
  const id = crypto.randomBytes(6).toString("hex");
  const now = new Date().toISOString();
  const dir = artifactDir(bookId, id);

  await fs.ensureDir(dir);

  // Write v1.html
  await fs.writeFile(path.join(dir, "v1.html"), input.htmlContent, "utf-8");

  // Write meta.json
  const artifactType = input.type ?? "note";

  const meta: ArtifactMeta = {
    id,
    title: input.title,
    description: input.description,
    type: artifactType,
    versions: [{ version: 1, createdAt: now, changeNote: "Initial creation" }],
    currentVersion: 1,
    chapters: input.chapters,
  };
  await fs.writeJson(path.join(dir, "meta.json"), meta, { spaces: 2 });

  // Update index
  const index = await readIndex(bookId);
  const entry: ArtifactIndexEntry = {
    id,
    title: input.title,
    description: input.description,
    type: artifactType,
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
    chapters: input.chapters,
  };
  index.push(entry);
  await writeIndex(bookId, index);

  return entry;
}

export async function updateArtifact(
  bookId: string,
  artifactId: string,
  input: {
    htmlContent: string;
    changeNote: string;
    title?: string;
    description?: string;
    chapters?: number[];
  },
): Promise<ArtifactMeta> {
  const dir = artifactDir(bookId, artifactId);
  const metaPath = path.join(dir, "meta.json");
  const meta: ArtifactMeta = await fs.readJson(metaPath);
  const now = new Date().toISOString();

  const newVersion = meta.currentVersion + 1;

  // Write new version HTML
  await fs.writeFile(
    path.join(dir, `v${newVersion}.html`),
    input.htmlContent,
    "utf-8",
  );

  // Update meta
  meta.versions.push({
    version: newVersion,
    createdAt: now,
    changeNote: input.changeNote,
  });
  meta.currentVersion = newVersion;
  if (input.title) meta.title = input.title;
  if (input.description) meta.description = input.description;
  if (input.chapters) meta.chapters = input.chapters;
  await fs.writeJson(metaPath, meta, { spaces: 2 });

  // Update index
  const index = await readIndex(bookId);
  const indexEntry = index.find((e) => e.id === artifactId);
  if (indexEntry) {
    indexEntry.currentVersion = newVersion;
    indexEntry.updatedAt = now;
    if (input.title) indexEntry.title = input.title;
    if (input.description) indexEntry.description = input.description;
    if (input.chapters) indexEntry.chapters = input.chapters;
    await writeIndex(bookId, index);
  }

  return meta;
}

export async function getArtifact(
  bookId: string,
  artifactId: string,
): Promise<ArtifactMeta | null> {
  const metaPath = path.join(artifactDir(bookId, artifactId), "meta.json");
  if (!(await fs.pathExists(metaPath))) return null;
  return fs.readJson(metaPath);
}

export async function getArtifactHtml(
  bookId: string,
  artifactId: string,
  version?: number,
): Promise<string | null> {
  const dir = artifactDir(bookId, artifactId);
  const meta = await getArtifact(bookId, artifactId);
  if (!meta) return null;

  const v = version ?? meta.currentVersion;
  const htmlPath = path.join(dir, `v${v}.html`);
  if (!(await fs.pathExists(htmlPath))) return null;
  return fs.readFile(htmlPath, "utf-8");
}

export async function listArtifacts(
  bookId: string,
): Promise<ArtifactIndexEntry[]> {
  return readIndex(bookId);
}

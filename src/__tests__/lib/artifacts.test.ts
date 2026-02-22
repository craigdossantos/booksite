import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import {
  createArtifact,
  updateArtifact,
  getArtifact,
  getArtifactHtml,
  listArtifacts,
} from "@/lib/artifacts";

const TEST_BOOK_DIR = path.join(
  process.cwd(),
  "data",
  "books",
  "_test_artifacts",
);

beforeEach(async () => {
  await fs.ensureDir(TEST_BOOK_DIR);
});

afterEach(async () => {
  await fs.remove(TEST_BOOK_DIR);
});

describe("createArtifact", () => {
  it("creates artifact directory, meta.json, v1.html, and index entry", async () => {
    const result = await createArtifact("_test_artifacts", {
      title: "Concept Map",
      description: "A concept map for chapter 1",
      htmlContent: "<h1>Concepts</h1>",
      chapters: [1],
    });

    expect(result.id).toBeDefined();
    expect(result.title).toBe("Concept Map");

    // Check files exist
    const artifactDir = path.join(TEST_BOOK_DIR, "artifacts", result.id);
    expect(await fs.pathExists(path.join(artifactDir, "v1.html"))).toBe(true);
    expect(await fs.pathExists(path.join(artifactDir, "meta.json"))).toBe(true);

    // Check index
    const index = await fs.readJson(
      path.join(TEST_BOOK_DIR, "artifacts", "artifact-index.json"),
    );
    expect(index).toHaveLength(1);
    expect(index[0].title).toBe("Concept Map");
  });
});

describe("updateArtifact", () => {
  it("creates a new version and updates meta", async () => {
    const created = await createArtifact("_test_artifacts", {
      title: "Concept Map",
      description: "A concept map",
      htmlContent: "<h1>V1</h1>",
      chapters: [1],
    });

    const updated = await updateArtifact("_test_artifacts", created.id, {
      htmlContent: "<h1>V2</h1>",
      changeNote: "Updated colors",
    });

    expect(updated.currentVersion).toBe(2);

    const artifactDir = path.join(TEST_BOOK_DIR, "artifacts", created.id);
    expect(await fs.pathExists(path.join(artifactDir, "v2.html"))).toBe(true);

    const v1 = await fs.readFile(path.join(artifactDir, "v1.html"), "utf-8");
    expect(v1).toBe("<h1>V1</h1>");
  });
});

describe("getArtifactHtml", () => {
  it("returns current version HTML by default", async () => {
    const created = await createArtifact("_test_artifacts", {
      title: "Test",
      description: "Test",
      htmlContent: "<h1>V1</h1>",
      chapters: [],
    });

    await updateArtifact("_test_artifacts", created.id, {
      htmlContent: "<h1>V2</h1>",
      changeNote: "v2",
    });

    const html = await getArtifactHtml("_test_artifacts", created.id);
    expect(html).toBe("<h1>V2</h1>");
  });

  it("returns specific version when requested", async () => {
    const created = await createArtifact("_test_artifacts", {
      title: "Test",
      description: "Test",
      htmlContent: "<h1>V1</h1>",
      chapters: [],
    });

    await updateArtifact("_test_artifacts", created.id, {
      htmlContent: "<h1>V2</h1>",
      changeNote: "v2",
    });

    const html = await getArtifactHtml("_test_artifacts", created.id, 1);
    expect(html).toBe("<h1>V1</h1>");
  });
});

describe("getArtifact", () => {
  it("returns null for nonexistent artifact", async () => {
    const result = await getArtifact("_test_artifacts", "nonexistent");
    expect(result).toBeNull();
  });
});

describe("listArtifacts", () => {
  it("returns empty array when no artifacts exist", async () => {
    const list = await listArtifacts("_test_artifacts");
    expect(list).toEqual([]);
  });

  it("returns all artifacts in the index", async () => {
    await createArtifact("_test_artifacts", {
      title: "First",
      description: "First artifact",
      htmlContent: "<p>1</p>",
      chapters: [1],
    });
    await createArtifact("_test_artifacts", {
      title: "Second",
      description: "Second artifact",
      htmlContent: "<p>2</p>",
      chapters: [2],
    });

    const list = await listArtifacts("_test_artifacts");
    expect(list).toHaveLength(2);
  });
});

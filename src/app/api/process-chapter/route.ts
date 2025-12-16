import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

// Get python site-packages path dynamically at runtime
function getPythonSitePackages(): string {
  const cwd = process.cwd();
  const parts = [cwd, "venv", "lib", "python3.13", "site-packages"];
  return parts.join("/");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { bookId, chapterId, chapterTitle } = await req.json();

    if (!bookId || !chapterId) {
      return NextResponse.json(
        { error: "bookId and chapterId are required" },
        { status: 400 }
      );
    }

    const cwd = process.cwd();
    const bookDir = path.join(cwd, "data", "books", bookId);
    const contentPath = path.join(bookDir, "content.json");

    // Check if content.json exists
    let contentData: {
      title: string;
      author: string;
      chapters: Array<{
        id: string;
        title: string;
        summary?: string;
        stories?: Array<{ title: string; description: string; lesson: string }>;
      }>;
    };

    try {
      const content = await fs.readFile(contentPath, "utf-8");
      contentData = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Book content.json not found" },
        { status: 404 }
      );
    }

    // Find the chapter's markdown file
    const chaptersJsonPath = path.join(bookDir, "chapters.json");
    let chapterPath: string | null = null;
    let chapterTitleFromManifest = chapterTitle;

    try {
      const chaptersJson = await fs.readFile(chaptersJsonPath, "utf-8");
      const chapters = JSON.parse(chaptersJson) as Array<{
        title: string;
        path: string;
      }>;
      const chapter = chapters.find(
        (c) => path.basename(c.path) === chapterId || c.path.includes(chapterId)
      );
      if (chapter) {
        chapterPath = chapter.path;
        chapterTitleFromManifest = chapter.title;
      }
    } catch {
      // No chapters.json, try to construct path
      chapterPath = path.join(bookDir, "markdown", chapterId);
    }

    if (!chapterPath) {
      return NextResponse.json(
        { error: "Chapter not found in manifest" },
        { status: 404 }
      );
    }

    // Read the chapter content
    let chapterContent: string;
    try {
      chapterContent = await fs.readFile(chapterPath, "utf-8");
    } catch {
      return NextResponse.json(
        { error: `Could not read chapter file: ${chapterPath}` },
        { status: 404 }
      );
    }

    if (chapterContent.length < 50) {
      return NextResponse.json(
        { error: "Chapter content is too short to process" },
        { status: 400 }
      );
    }

    // Create a simple Python script to process just this chapter
    const scriptContent = `
import json
import os
import sys
import google.generativeai as genai

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print(json.dumps({"error": "GEMINI_API_KEY not set"}))
    sys.exit(1)

genai.configure(api_key=API_KEY)

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "stories": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "lesson": {"type": "string"},
                },
                "required": ["title", "description", "lesson"],
            },
        },
        "learningObjectives": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["summary", "stories", "learningObjectives"],
}

title = ${JSON.stringify(chapterTitleFromManifest)}
content = ${JSON.stringify(chapterContent.slice(0, 30000))}

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash-exp",
    generation_config={
        "response_mime_type": "application/json",
        "response_schema": RESPONSE_SCHEMA,
    }
)

prompt = f"""
Analyze the following chapter from a nonfiction book.
Chapter Title: {title}

Content:
{content}

Please provide:
1. A concise summary of the chapter.
2. Key stories or anecdotes used to illustrate points (title, description, and the lesson derived).
3. Main learning objectives or takeaways.
"""

try:
    response = model.generate_content(prompt)
    result = json.loads(response.text)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
`;

    // Execute the script
    return new Promise<NextResponse>((resolve) => {
      const sitePackages = getPythonSitePackages();
      const pythonProcess = spawn("python3", ["-c", scriptContent], {
        env: { ...process.env, PYTHONPATH: sitePackages },
        cwd,
      });

      let stdoutData = "";
      let stderrData = "";

      pythonProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
        console.error(`[Python stderr]: ${data.toString()}`);
      });

      pythonProcess.on("close", async (code) => {
        if (code !== 0) {
          resolve(
            NextResponse.json(
              { error: "Processing failed", details: stderrData },
              { status: 500 }
            )
          );
          return;
        }

        try {
          const result = JSON.parse(stdoutData);

          if (result.error) {
            resolve(
              NextResponse.json({ error: result.error }, { status: 500 })
            );
            return;
          }

          // Update content.json with the new chapter data
          const existingChapterIndex = contentData.chapters.findIndex(
            (c) => c.id === chapterId
          );

          const updatedChapter = {
            id: chapterId,
            title: chapterTitleFromManifest,
            ...result,
          };

          if (existingChapterIndex >= 0) {
            contentData.chapters[existingChapterIndex] = updatedChapter;
          } else {
            contentData.chapters.push(updatedChapter);
          }

          // Write updated content.json
          await fs.writeFile(
            contentPath,
            JSON.stringify(contentData, null, 2),
            "utf-8"
          );

          resolve(
            NextResponse.json({
              success: true,
              chapter: updatedChapter,
            })
          );
        } catch (e) {
          resolve(
            NextResponse.json(
              {
                error: "Failed to parse result",
                details: stdoutData,
                parseError: String(e),
              },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (error) {
    console.error("Error processing chapter:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

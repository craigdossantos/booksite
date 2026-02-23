"""Generate voice-matched chapter summaries."""

import json
import os
import re
from datetime import datetime
import google.generativeai as genai

API_KEY = os.environ.get("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string", "description": "Blog-post style summary in the author's voice"}
    },
    "required": ["summary"],
}


def get_target_word_count(chapter_word_count: int) -> int:
    if chapter_word_count < 1000:
        return 125
    elif chapter_word_count < 3000:
        return 250
    elif chapter_word_count < 8000:
        return 400
    else:
        return 600


def clean_title(raw_title: str) -> str:
    """Clean chapter title from filename."""
    title = re.sub(r"^\d+_", "", raw_title)
    match = re.match(r"Chapter \d+[:\s-]+(.+)", title, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    title = re.sub(r"xhtml\d+\s*", "", title, flags=re.IGNORECASE)
    title = title.replace(".xhtml", "")
    return title.replace("_", " ").strip()


def is_junk(title: str, content: str) -> bool:
    lower_title = title.lower()
    junk_keywords = [
        "table of contents", "contents", "copyright", "imprint",
        "dedication", "title page", "acknowledgments", "about the author",
        "also by", "notes", "index", "footnote",
    ]
    for keyword in junk_keywords:
        if keyword in lower_title:
            return True
    if len(content.strip()) < 50:
        return True
    return False


def generate_all_summaries(
    chapters_dir: str, voice_profile: dict, progress_callback=None
) -> list[dict]:
    """Generate summaries for all chapters. Returns chapters data list."""
    chapter_files = sorted(
        [f for f in os.listdir(chapters_dir) if f.endswith(".md")]
    )

    if not chapter_files:
        return []

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": SUMMARY_SCHEMA,
        },
    )

    chapters_data = []
    valid_index = 0
    total = len(chapter_files)

    for i, chapter_file in enumerate(chapter_files):
        chapter_path = os.path.join(chapters_dir, chapter_file)
        with open(chapter_path, "r") as f:
            content = f.read()

        raw_title = os.path.splitext(chapter_file)[0]

        # Extract heading from content
        heading_title = None
        for line in content.split("\n")[:20]:
            line = line.strip()
            if line.startswith("# ") or line.startswith("## "):
                candidate = line.lstrip("#").strip()
                if re.match(r"^\d+$", candidate):
                    continue
                if re.match(r"^Chapter \d+$", candidate, re.IGNORECASE):
                    if not heading_title:
                        heading_title = candidate
                    continue
                heading_title = candidate
                break

        title_to_check = heading_title if heading_title else raw_title
        if is_junk(title_to_check, content):
            continue

        title = clean_title(title_to_check)
        word_count = len(content.split())
        target_words = get_target_word_count(word_count)

        prompt = f"""You are writing a summary in the voice and style of this book's author.

VOICE PROFILE:
- Tone: {voice_profile['tone']}
- Style: {voice_profile['style']}
- Complexity: {voice_profile['complexity']}
- Characteristics: {', '.join(voice_profile['characteristics'])}

Write a blog-post style summary (~{target_words} words) that matches the author's voice EXACTLY.
Do NOT use generic phrases like "This chapter discusses..." or "In this chapter...".

CHAPTER TITLE: {title}

CHAPTER CONTENT:
{content[:25000]}

Write the summary now, in the author's voice:"""

        summary = None
        try:
            response = model.generate_content(prompt)
            result = json.loads(response.text)
            summary = {
                "content": result["summary"],
                "wordCount": len(result["summary"].split()),
                "generatedAt": datetime.now().isoformat(),
            }
        except Exception as e:
            print(f"Error generating summary for '{title}': {e}")

        valid_index += 1
        chapters_data.append({
            "number": valid_index,
            "title": title,
            "markdownPath": f"chapters/{chapter_file}",
            "wordCount": word_count,
            "summary": summary,
        })

        if progress_callback:
            progress_callback(i + 1, total, title)

    return chapters_data

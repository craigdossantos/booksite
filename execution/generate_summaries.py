"""
Generate voice-matched chapter summaries.
Uses the book's voice profile to create summaries that match the author's writing style.
Summary length adapts based on chapter word count.
"""

import argparse
import json
import os
import sys
from datetime import datetime
import google.generativeai as genai

# Configure Gemini
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": "The blog-post style summary in the author's voice"
        }
    },
    "required": ["summary"]
}


def get_target_word_count(chapter_word_count: int) -> int:
    """Determine target summary length based on chapter length."""
    if chapter_word_count < 1000:
        return 125  # 100-150 average
    elif chapter_word_count < 3000:
        return 250  # 200-300 average
    elif chapter_word_count < 8000:
        return 400  # 300-500 average
    else:
        return 600  # 500-700 average


def generate_summary(chapter_title: str, chapter_content: str, voice_profile: dict, target_words: int) -> dict:
    """Generate a voice-matched summary for a single chapter."""

    prompt = f"""You are writing a summary in the voice and style of this book's author.

VOICE PROFILE:
- Tone: {voice_profile['tone']}
- Style: {voice_profile['style']}
- Complexity: {voice_profile['complexity']}
- Characteristics: {', '.join(voice_profile['characteristics'])}

YOUR TASK:
Write a blog-post style summary of this chapter that:
1. Matches the author's voice EXACTLY - read the voice profile carefully
2. Captures the key ideas, insights, and narrative
3. Feels like it could have been written by the original author
4. Is approximately {target_words} words (adjust based on content density)
5. Engages the reader and makes them want to read the full chapter

DO NOT:
- Use generic summarization language like "This chapter discusses..."
- Start with "In this chapter..." or similar meta-phrases
- Be dry or academic unless that's the author's style
- Lose the author's personality

CHAPTER TITLE: {chapter_title}

CHAPTER CONTENT:
{chapter_content[:25000]}

Write the summary now, in the author's voice:"""

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": SUMMARY_SCHEMA,
        }
    )

    try:
        response = model.generate_content(prompt)
        result = json.loads(response.text)
        return {
            "content": result["summary"],
            "wordCount": len(result["summary"].split()),
            "generatedAt": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error generating summary for '{chapter_title}': {e}", file=sys.stderr)
        return None


def generate_all_summaries(book_id: str, update_status_callback=None):
    """Generate summaries for all chapters in a book."""

    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    chapters_dir = os.path.join(book_dir, "chapters")
    metadata_path = os.path.join(book_dir, "metadata.json")
    chapters_json_path = os.path.join(book_dir, "chapters.json")

    # Load metadata for voice profile
    if not os.path.exists(metadata_path):
        print(f"Error: Metadata not found at {metadata_path}", file=sys.stderr)
        sys.exit(1)

    with open(metadata_path, 'r') as f:
        metadata = json.load(f)

    voice_profile = metadata.get('voiceProfile')
    if not voice_profile:
        print("Error: Voice profile not found in metadata. Run analyze_voice.py first.", file=sys.stderr)
        sys.exit(1)

    # Get chapter files
    chapter_files = sorted([f for f in os.listdir(chapters_dir) if f.endswith('.md')])

    if not chapter_files:
        print(f"Error: No chapter files found in {chapters_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Generating summaries for {len(chapter_files)} chapters...")

    # Load existing chapters.json if it exists (may have filtered chapters)
    existing_chapters = []
    if os.path.exists(chapters_json_path):
        with open(chapters_json_path, 'r') as f:
            existing_chapters = json.load(f)

    chapters_data = []
    total_chapters = len(chapter_files)

    for i, chapter_file in enumerate(chapter_files):
        chapter_path = os.path.join(chapters_dir, chapter_file)

        # Read chapter content
        with open(chapter_path, 'r') as f:
            content = f.read()

        word_count = len(content.split())

        # Extract title from filename or first heading
        # Filename format: 00_Chapter_Name.md
        parts = chapter_file.replace('.md', '').split('_', 1)
        if len(parts) > 1:
            title = parts[1].replace('_', ' ')
        else:
            title = chapter_file.replace('.md', '').replace('_', ' ')

        # Check if we already have a summary for this chapter
        existing = next((ch for ch in existing_chapters if ch.get('markdownPath') == f"chapters/{chapter_file}"), None)
        if existing and existing.get('summary'):
            print(f"[{i+1}/{total_chapters}] Skipping '{title}' (already has summary)")
            chapters_data.append(existing)
            continue

        # Generate summary
        print(f"[{i+1}/{total_chapters}] Generating summary for '{title}' ({word_count} words)...")

        target_words = get_target_word_count(word_count)
        summary = generate_summary(title, content, voice_profile, target_words)

        chapter_data = {
            "number": i + 1,
            "title": title,
            "markdownPath": f"chapters/{chapter_file}",
            "wordCount": word_count,
            "summary": summary
        }
        chapters_data.append(chapter_data)

        # Update status if callback provided
        if update_status_callback:
            progress = int(((i + 1) / total_chapters) * 100)
            update_status_callback(
                status="summarizing",
                progress=progress,
                currentStep=f"Summarizing chapter {i+1} of {total_chapters}",
                chaptersProcessed=i + 1,
                totalChapters=total_chapters
            )

    # Save chapters.json
    with open(chapters_json_path, 'w') as f:
        json.dump(chapters_data, f, indent=2)

    print(f"Successfully generated summaries. Saved to {chapters_json_path}")
    return chapters_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate voice-matched chapter summaries.")
    parser.add_argument("--book-id", required=True, help="Book ID (directory name in data/books/)")
    args = parser.parse_args()

    generate_all_summaries(args.book_id)

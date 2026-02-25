"""
Generate voice-matched chapter summaries.
Uses the book's voice profile to create summaries that match the author's writing style.
Summary length adapts based on chapter word count.
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime

import anthropic

# Configure Anthropic client
API_KEY = os.environ.get("ANTHROPIC_API_KEY")
if not API_KEY:
    print("Error: ANTHROPIC_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

client = anthropic.Anthropic()


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


def clean_chapter_title(raw_title: str, chapter_content: str) -> str:
    """Clean up raw chapter title extracted from filename.

    Strips file extensions and prefixes, and falls back to extracting
    the first heading from the markdown content if the title is generic.
    """
    title = raw_title.strip()

    # Strip common file extensions
    title = re.sub(r'\.(x?html?|xml)$', '', title, flags=re.IGNORECASE)

    # Strip leading 'xhtml' prefix (e.g., "xhtmlChapter01" -> "Chapter01")
    title = re.sub(r'^xhtml', '', title, flags=re.IGNORECASE)

    # Strip leading zeros-padded numbers with separators (e.g., "00_Chapter Name")
    title = re.sub(r'^\d+[_\-\s]+', '', title)

    # Replace underscores and hyphens with spaces
    title = title.replace('_', ' ').replace('-', ' ')

    # Collapse multiple spaces
    title = re.sub(r'\s+', ' ', title).strip()

    # Check if the title is still generic / unhelpful
    is_generic = (
        not title
        or re.match(r'^(chapter\s*)?\d+$', title, re.IGNORECASE)
        or re.match(r'^(part|section)\s*\d*$', title, re.IGNORECASE)
        or len(title) <= 2
    )

    if is_generic:
        # Try to extract a real title from the first heading in the markdown
        heading_match = re.search(r'^#{1,3}\s+(.+)$', chapter_content, re.MULTILINE)
        if heading_match:
            extracted = heading_match.group(1).strip()
            # Only use it if it's substantive
            if len(extracted) > 2 and not re.match(r'^(chapter\s*)?\d+$', extracted, re.IGNORECASE):
                return extracted

    return title if title else raw_title


def generate_summary(chapter_title: str, chapter_content: str, voice_profile: dict, target_words: int) -> dict:
    """Generate a voice-matched summary for a single chapter."""

    prompt = f"""You are writing a blog-post style summary of a book chapter. You must write in the voice and style of the book's author, as if the author themselves were recapping the chapter for a reader.

VOICE PROFILE:
- Tone: {voice_profile['tone']}
- Style: {voice_profile['style']}
- Complexity: {voice_profile['complexity']}
- Characteristics: {', '.join(voice_profile['characteristics'])}

INSTRUCTIONS:
Write a compelling, blog-post style summary of the chapter below. The summary should:
1. Be written AS the author — use "I" if the original is first-person, match their sentence patterns, vocabulary, and rhythm
2. Capture the key ideas, arguments, stories, and insights from the chapter
3. Use markdown formatting: separate paragraphs with blank lines, use **bold** for emphasis on key terms or ideas, and use ### subheadings if the summary is longer than 300 words
4. Feel like a polished blog post that draws the reader in and makes them want to read the full chapter
5. Be approximately {target_words} words (vary based on content density — some chapters need more, some less)

RULES — do NOT violate these:
- NEVER start with "This chapter discusses...", "In this chapter...", "The author explains...", or any similar meta-framing
- NEVER refer to "the author" in third person — you ARE the author
- NEVER use generic summarization language — write with personality and specificity
- DO open with a hook: a provocative claim, a vivid scene, a question, or a surprising fact from the chapter

CHAPTER TITLE: {chapter_title}

CHAPTER CONTENT:
{chapter_content[:25000]}

Write the summary now, in the author's voice. Return ONLY the summary text with markdown formatting — no preamble, no meta-commentary."""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        summary_text = message.content[0].text.strip()
        return {
            "content": summary_text,
            "wordCount": len(summary_text.split()),
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

        # Extract raw title from filename
        # Filename format: 00_Chapter_Name.md
        parts = chapter_file.replace('.md', '').split('_', 1)
        if len(parts) > 1:
            raw_title = parts[1].replace('_', ' ')
        else:
            raw_title = chapter_file.replace('.md', '').replace('_', ' ')

        # Clean up the title
        title = clean_chapter_title(raw_title, content)

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

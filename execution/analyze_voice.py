"""
Analyze book's writing style to create a voice profile.
Examines first 2-3 chapters to determine tone, style, complexity, and characteristics.
"""

import argparse
import json
import os
import sys
import google.generativeai as genai

# Configure Gemini
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

VOICE_PROFILE_SCHEMA = {
    "type": "object",
    "properties": {
        "tone": {
            "type": "string",
            "description": "The emotional tone (conversational, academic, inspirational, humorous, etc.)"
        },
        "style": {
            "type": "string",
            "description": "The narrative style (first-person narrative, third-person objective, instructional, etc.)"
        },
        "complexity": {
            "type": "string",
            "enum": ["simple", "moderate", "complex"],
            "description": "Vocabulary and sentence complexity level"
        },
        "characteristics": {
            "type": "array",
            "items": {"type": "string"},
            "description": "3-5 distinctive stylistic traits of this author"
        }
    },
    "required": ["tone", "style", "complexity", "characteristics"]
}

VOICE_ANALYSIS_PROMPT = """
Analyze the writing style of this book excerpt. You are analyzing to create a "voice profile"
that will be used to generate summaries that match the author's unique voice.

Read the following text carefully and identify:

1. **Tone**: The emotional quality of the writing. Examples:
   - conversational (casual, like talking to a friend)
   - academic (formal, scholarly)
   - inspirational (uplifting, motivational)
   - humorous (witty, uses jokes)
   - storytelling (narrative-driven, uses anecdotes)
   - journalistic (factual, reportorial)
   - philosophical (contemplative, questioning)

2. **Style**: The narrative perspective and approach. Examples:
   - first-person narrative (uses "I", shares personal experiences)
   - third-person objective (observational, neutral)
   - instructional (teaches directly, uses "you should")
   - case-study based (uses examples and analysis)
   - socratic (uses questions to guide thinking)

3. **Complexity**: How sophisticated is the vocabulary and sentence structure?
   - simple: Short sentences, common words, accessible to all
   - moderate: Mix of sentence lengths, some domain terms, college reading level
   - complex: Long sentences, advanced vocabulary, academic reading level

4. **Characteristics**: 3-5 specific traits that make THIS author's voice unique.
   Be specific! Examples:
   - "Uses vivid metaphors from nature"
   - "Frequently references historical figures"
   - "Breaks complex ideas into numbered steps"
   - "Incorporates personal anecdotes from entrepreneurship"
   - "Uses rhetorical questions to engage reader"

Text to analyze:
{content}

Return ONLY a JSON object matching the schema. Be specific to THIS book's unique voice.
"""


def analyze_voice(book_id: str) -> dict:
    """Analyze the voice profile of a book by examining its first chapters."""

    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    chapters_dir = os.path.join(book_dir, "chapters")

    if not os.path.exists(chapters_dir):
        print(f"Error: Chapters directory not found at {chapters_dir}", file=sys.stderr)
        sys.exit(1)

    # Get first 3 chapter files
    chapter_files = sorted([f for f in os.listdir(chapters_dir) if f.endswith('.md')])[:3]

    if not chapter_files:
        print(f"Error: No chapter files found in {chapters_dir}", file=sys.stderr)
        sys.exit(1)

    # Read and combine content from first chapters
    combined_content = []
    total_chars = 0
    max_chars = 15000  # Limit to ~15k chars for API

    for chapter_file in chapter_files:
        chapter_path = os.path.join(chapters_dir, chapter_file)
        with open(chapter_path, 'r') as f:
            content = f.read()
            if total_chars + len(content) > max_chars:
                # Take partial content from this chapter
                remaining = max_chars - total_chars
                combined_content.append(content[:remaining])
                break
            combined_content.append(content)
            total_chars += len(content)

    text_sample = "\n\n---\n\n".join(combined_content)

    print(f"Analyzing voice profile from {len(chapter_files)} chapters ({total_chars} chars)...")

    # Call Gemini API
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": VOICE_PROFILE_SCHEMA,
        }
    )

    try:
        response = model.generate_content(
            VOICE_ANALYSIS_PROMPT.format(content=text_sample)
        )
        voice_profile = json.loads(response.text)

        print(f"Voice profile created:")
        print(f"  Tone: {voice_profile['tone']}")
        print(f"  Style: {voice_profile['style']}")
        print(f"  Complexity: {voice_profile['complexity']}")
        print(f"  Characteristics: {', '.join(voice_profile['characteristics'])}")

        return voice_profile

    except Exception as e:
        print(f"Error analyzing voice: {e}", file=sys.stderr)
        # Return a default profile
        return {
            "tone": "conversational",
            "style": "third-person objective",
            "complexity": "moderate",
            "characteristics": ["clear explanations", "uses examples"]
        }


def update_metadata_with_voice(book_id: str, voice_profile: dict):
    """Update the book's metadata.json with the voice profile."""

    base_dir = os.getcwd()
    metadata_path = os.path.join(base_dir, "data", "books", book_id, "metadata.json")

    if not os.path.exists(metadata_path):
        print(f"Error: Metadata not found at {metadata_path}", file=sys.stderr)
        sys.exit(1)

    with open(metadata_path, 'r') as f:
        metadata = json.load(f)

    metadata['voiceProfile'] = voice_profile

    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"Updated metadata with voice profile.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze book's writing voice.")
    parser.add_argument("--book-id", required=True, help="Book ID (directory name in data/books/)")
    args = parser.parse_args()

    voice_profile = analyze_voice(args.book_id)
    update_metadata_with_voice(args.book_id, voice_profile)

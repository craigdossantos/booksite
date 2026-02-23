"""Analyze book's writing style to create a voice profile."""

import json
import os
import google.generativeai as genai

API_KEY = os.environ.get("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

VOICE_PROFILE_SCHEMA = {
    "type": "object",
    "properties": {
        "tone": {"type": "string", "description": "The emotional tone"},
        "style": {"type": "string", "description": "The narrative style"},
        "complexity": {
            "type": "string",
            "enum": ["simple", "moderate", "complex"],
        },
        "characteristics": {
            "type": "array",
            "items": {"type": "string"},
            "description": "3-5 distinctive stylistic traits",
        },
    },
    "required": ["tone", "style", "complexity", "characteristics"],
}

VOICE_ANALYSIS_PROMPT = """Analyze the writing style of this book excerpt. Create a "voice profile" for generating summaries that match the author's unique voice.

Identify:
1. **Tone**: conversational, academic, inspirational, humorous, storytelling, journalistic, philosophical
2. **Style**: first-person narrative, third-person objective, instructional, case-study based, socratic
3. **Complexity**: simple, moderate, or complex
4. **Characteristics**: 3-5 specific traits (e.g. "Uses vivid metaphors from nature")

Text to analyze:
{content}

Return ONLY a JSON object matching the schema."""


def analyze_voice(chapters_dir: str) -> dict:
    """Analyze voice profile from chapter markdown files."""
    chapter_files = sorted(
        [f for f in os.listdir(chapters_dir) if f.endswith(".md")]
    )[:3]

    if not chapter_files:
        return _default_profile()

    combined_content = []
    total_chars = 0
    max_chars = 15000

    for chapter_file in chapter_files:
        with open(os.path.join(chapters_dir, chapter_file), "r") as f:
            content = f.read()
            if total_chars + len(content) > max_chars:
                remaining = max_chars - total_chars
                combined_content.append(content[:remaining])
                break
            combined_content.append(content)
            total_chars += len(content)

    text_sample = "\n\n---\n\n".join(combined_content)

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": VOICE_PROFILE_SCHEMA,
        },
    )

    try:
        response = model.generate_content(
            VOICE_ANALYSIS_PROMPT.format(content=text_sample)
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Voice analysis failed: {e}")
        return _default_profile()


def _default_profile() -> dict:
    return {
        "tone": "conversational",
        "style": "third-person objective",
        "complexity": "moderate",
        "characteristics": ["clear explanations", "uses examples"],
    }

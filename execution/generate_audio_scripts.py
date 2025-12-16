import argparse
import json
import os
import sys
import google.generativeai as genai
import time

# Configure Gemini
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "duration_minutes": {"type": "integer"},
        "dialogue": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "speaker": {"type": "string", "enum": ["Alex", "Jamie"]},
                    "text": {"type": "string"}
                },
                "required": ["speaker", "text"]
            }
        }
    },
    "required": ["title", "duration_minutes", "dialogue"]
}

def generate_script_for_chapter(chapter_text, chapter_title):
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    prompt = f"""
    Convert the following chapter into an engaging "NPR-style" podcast script.
    
    Characters:
    - **Alex (Host)**: Curious, energetic, asks the "dumb" questions that clarify things.
    - **Jamie (Expert)**: Knowledgeable, calm, uses great analogies.
    
    Goal: Explain the core concepts of this chapter in a conversational way.
    
    Chapter Title: {chapter_title}
    
    Text:
    {chapter_text[:20000]} 

    Task:
    Create a script with:
    1. **Title**: Catchy episode title.
    2. **Dialogue**: 10-15 exchanges.
    3. **Tone**: Smart, fun, educational. Like "Planet Money" or "Hidden Brain".
    """

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating audio script for '{chapter_title}': {e}", file=sys.stderr)
        return None

def process_book(book_id, specific_chapter=None):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    chapters_dir = os.path.join(book_dir, "chapters")

    if not os.path.exists(chapters_dir):
        print(f"Error: Chapters directory not found at {chapters_dir}", file=sys.stderr)
        sys.exit(1)

    all_scripts = []
    
    # Get all markdown files
    files = sorted([f for f in os.listdir(chapters_dir) if f.endswith(".md")])
    
    # Filter if specific chapter is requested
    if specific_chapter:
        if specific_chapter in files:
            files = [specific_chapter]
            print(f"Processing single chapter: {specific_chapter}")
        else:
            print(f"Error: Chapter '{specific_chapter}' not found.", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"Found {len(files)} chapters. Generating audio scripts...")

    for filename in files:
        file_path = os.path.join(chapters_dir, filename)
        with open(file_path, "r") as f:
            text = f.read()
            
        # Extract title from filename
        title = filename.replace(".md", "").replace("_", " ")
        
        if len(text) < 500: # Skip very short chapters
            continue

        print(f"Processing: {title}")
        script = generate_script_for_chapter(text, title)
        
        if script:
            script["source_chapter"] = title
            all_scripts.append(script)
            
        # Save incrementally
        output_path = os.path.join(book_dir, "audio_scripts.json")
        
        if specific_chapter and os.path.exists(output_path):
            with open(output_path, "r") as f:
                existing_data = json.load(f)
            existing_data = [x for x in existing_data if x.get("source_chapter") != title]
            existing_data.extend(all_scripts)
            final_data = existing_data
        elif specific_chapter:
             final_data = all_scripts
        else:
             final_data = all_scripts

        with open(output_path, "w") as f:
            json.dump(final_data, f, indent=2)
            
        # Rate limiting pause
        time.sleep(2)

    print(f"Successfully generated audio scripts.")
    print(f"Output saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Audio Scripts from a book.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    parser.add_argument("--chapter", help="Specific chapter filename to process (e.g. '01_Intro.md')")
    args = parser.parse_args()

    process_book(args.book_id, args.chapter)

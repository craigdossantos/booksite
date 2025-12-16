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
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "protagonist": {"type": "string"},
            "struggle": {"type": "string"},
            "epiphany": {"type": "string"},
            "victory": {"type": "string"},
            "linked_concept": {"type": "string"}
        },
        "required": ["title", "protagonist", "struggle", "epiphany", "victory", "linked_concept"]
    },
}

def extract_stories_from_chapter(chapter_text, chapter_title):
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    prompt = f"""
    Analyze the following chapter text and extract the key "Stories" or "Narratives".
    
    Pedagogy: Narrative Encoding. We remember stories 22x better than facts.
    
    Chapter Title: {chapter_title}
    
    Text:
    {chapter_text[:30000]} 

    Task:
    Find the most compelling stories/anecdotes.
    Structure each story as a "Struggle -> Epiphany -> Victory" arc.
    
    Format:
    1. Title: Catchy name.
    2. Protagonist: Who is it about?
    3. Struggle: The challenge/conflict.
    4. Epiphany: The realization/turning point.
    5. Victory: The resolution/outcome.
    6. Linked Concept: What lesson does this story teach?
    """

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Error extracting stories from '{chapter_title}': {e}", file=sys.stderr)
        return []

def process_book(book_id, specific_chapter=None):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    chapters_dir = os.path.join(book_dir, "chapters")

    if not os.path.exists(chapters_dir):
        print(f"Error: Chapters directory not found at {chapters_dir}", file=sys.stderr)
        sys.exit(1)

    all_stories = []
    
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
        print(f"Found {len(files)} chapters. Extracting stories...")

    for filename in files:
        file_path = os.path.join(chapters_dir, filename)
        with open(file_path, "r") as f:
            text = f.read()
            
        # Extract title from filename
        title = filename.replace(".md", "").replace("_", " ")
        
        if len(text) < 500: # Skip very short chapters
            continue

        print(f"Processing: {title}")
        stories = extract_stories_from_chapter(text, title)
        
        if stories:
            for s in stories:
                s["source_chapter"] = title
            all_stories.extend(stories)
            
        # Save incrementally
        output_path = os.path.join(book_dir, "stories.json")
        
        if specific_chapter and os.path.exists(output_path):
            with open(output_path, "r") as f:
                existing_data = json.load(f)
            existing_data = [x for x in existing_data if x.get("source_chapter") != title]
            existing_data.extend(all_stories)
            final_data = existing_data
        elif specific_chapter:
             final_data = all_stories
        else:
             final_data = all_stories

        with open(output_path, "w") as f:
            json.dump(final_data, f, indent=2)
            
        # Rate limiting pause
        time.sleep(2)

    print(f"Successfully extracted stories.")
    print(f"Output saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Stories from a book.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    parser.add_argument("--chapter", help="Specific chapter filename to process (e.g. '01_Intro.md')")
    args = parser.parse_args()

    process_book(args.book_id, args.chapter)

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
        "hook": {"type": "string"},
        "jargon": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "term": {"type": "string"},
                    "definition": {"type": "string"}
                },
                "required": ["term", "definition"]
            }
        },
        "knowledge_gaps": {
            "type": "array",
            "items": {"type": "string"}
        },
        "map": {"type": "string"}
    },
    "required": ["hook", "jargon", "knowledge_gaps", "map"]
}

def generate_priming_for_chapter(chapter_text, chapter_title):
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    prompt = f"""
    Create a "Priming Scaffold" (Pre-Flight Briefing) for the following chapter.
    
    Pedagogy: Sung Priming / Cognitive Load Theory. 
    Goal: Build a mental container *before* the user reads the details.
    
    Chapter Title: {chapter_title}
    
    Text:
    {chapter_text[:20000]} 

    Task:
    1. **Hook**: One high-stakes sentence. Why does this matter?
    2. **Jargon**: Identify 3 complex/novel terms the user MUST know to understand the chapter. Define them simply.
    3. **Knowledge Gaps**: List 3 specific questions this chapter answers. (Open a curiosity loop).
    4. **Map**: A 1-sentence summary of the logical argument flow (Argument -> Proof -> Conclusion).
    """

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating priming for '{chapter_title}': {e}", file=sys.stderr)
        return None

def process_book(book_id, specific_chapter=None):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    chapters_dir = os.path.join(book_dir, "chapters")

    if not os.path.exists(chapters_dir):
        print(f"Error: Chapters directory not found at {chapters_dir}", file=sys.stderr)
        sys.exit(1)

    all_priming = []
    
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
        print(f"Found {len(files)} chapters. Generating priming scaffolds...")

    for filename in files:
        file_path = os.path.join(chapters_dir, filename)
        with open(file_path, "r") as f:
            text = f.read()
            
        # Extract title from filename
        title = filename.replace(".md", "").replace("_", " ")
        
        if len(text) < 500: # Skip very short chapters
            continue

        print(f"Processing: {title}")
        priming = generate_priming_for_chapter(text, title)
        
        if priming:
            priming["source_chapter"] = title
            all_priming.append(priming)
            
        # Save incrementally
        output_path = os.path.join(book_dir, "priming.json")
        
        if specific_chapter and os.path.exists(output_path):
            with open(output_path, "r") as f:
                existing_data = json.load(f)
            existing_data = [x for x in existing_data if x.get("source_chapter") != title]
            existing_data.extend(all_priming)
            final_data = existing_data
        elif specific_chapter:
             final_data = all_priming
        else:
             final_data = all_priming

        with open(output_path, "w") as f:
            json.dump(final_data, f, indent=2)
            
        # Rate limiting pause
        time.sleep(2)

    print(f"Successfully generated priming scaffolds.")
    print(f"Output saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Priming Scaffolds from a book.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    parser.add_argument("--chapter", help="Specific chapter filename to process (e.g. '01_Intro.md')")
    args = parser.parse_args()

    process_book(args.book_id, args.chapter)

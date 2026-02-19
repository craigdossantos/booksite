import argparse
import json
import os
import sys
import re
from datetime import datetime
import google.generativeai as genai
from bs4 import BeautifulSoup
import ebooklib
from ebooklib import epub
import hashlib

def get_book_id(filename):
    # Create a stable ID based on the filename (or could use ISBN if available)
    # For simplicity, let's use a hash of the filename to avoid special char issues in paths
    return hashlib.md5(filename.encode()).hexdigest()[:12]

# Configure Gemini
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

# JSON Schema for Gemini response
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
        "visualPrompts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string"},
                    "description": {"type": "string"},
                    "prompt": {"type": "string"},
                    "svgPlaceholder": {"type": "string"},
                },
                "required": ["type", "description", "prompt", "svgPlaceholder"],
            },
        },
    },
    "required": ["summary", "stories", "learningObjectives", "visualPrompts"],
}

def clean_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    return soup.get_text(separator=' ', strip=True)

def analyze_chapter(title, content):
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    prompt = f"""
    Analyze the following chapter from a nonfiction book.
    Chapter Title: {title}
    
    Content:
    {content[:30000]} 

    Please provide:
    1. A concise summary of the chapter.
    2. Key stories or anecdotes used to illustrate points (title, description, and the lesson derived).
    3. Main learning objectives or takeaways.
    4. Visual prompts for creating multimedia content (images or infographics) to help learn this material. 
       For each visual prompt, provide:
       - Type: "image" or "infographic"
       - Description: What the visual should depict.
       - Prompt: A detailed prompt for an AI image generator.
       - svgPlaceholder: A simple, valid SVG code string (starting with <svg and ending with </svg>) that represents a rough mock-up of this visual. Keep it simple and abstract.
    """

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Error analyzing chapter '{title}': {e}", file=sys.stderr)
        return {"error": str(e)}

def process_book(filename, limit=None):
    base_dir = os.getcwd()
    books_dir = os.path.join(base_dir, "public", "books")
    file_path = os.path.join(books_dir, filename)

    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Parsing EPUB: {filename}")
    try:
        book = epub.read_epub(file_path)
    except Exception as e:
        print(f"Error reading EPUB: {e}", file=sys.stderr)
        sys.exit(1)

    book_title = book.get_metadata('DC', 'title')[0][0] if book.get_metadata('DC', 'title') else "Unknown Title"
    book_author = book.get_metadata('DC', 'creator')[0][0] if book.get_metadata('DC', 'creator') else "Unknown Author"

    # Load existing content.json if it exists to avoid re-processing
    output_dir = os.path.join(base_dir, "data", "books", get_book_id(filename))
    output_path = os.path.join(output_dir, "content.json")
    
    existing_chapters = {}
    if os.path.exists(output_path):
        try:
            with open(output_path, "r") as f:
                existing_data = json.load(f)
                for ch in existing_data.get("chapters", []):
                    existing_chapters[ch["id"]] = ch
            print(f"Loaded {len(existing_chapters)} existing chapters from content.json")
        except Exception as e:
            print(f"Error loading existing content.json: {e}")

    processed_chapters = []
    
    # Check for chapters.json manifest
    chapters_manifest_path = os.path.join(base_dir, "data", "books", get_book_id(filename), "chapters.json")
    
    if os.path.exists(chapters_manifest_path):
        print(f"Using filtered chapters from {chapters_manifest_path}")
        with open(chapters_manifest_path, "r") as f:
            manifest = json.load(f)
            
        items_to_process = manifest
        print(f"Found {len(items_to_process)} chapters in manifest.")
        
        count = 0
        for item in items_to_process:
            if limit and count >= limit:
                break
                
            chapter_title = item['title']
            file_path = item['path']
            chapter_id = os.path.basename(file_path)
            
            # Check if already processed
            if chapter_id in existing_chapters:
                print(f"Skipping already processed chapter: {chapter_title}")
                processed_chapters.append(existing_chapters[chapter_id])
                count += 1
                continue

            # Read content from Markdown file
            try:
                with open(file_path, "r") as f:
                    content = f.read()
            except Exception as e:
                print(f"Error reading chapter file {file_path}: {e}")
                continue
            
            if len(content) < 50: # Lowered threshold to match filter_chapters
                continue

            print(f"Analyzing chapter: {chapter_title}")
            analysis = analyze_chapter(chapter_title, content)
            
            processed_chapters.append({
                "id": chapter_id, # Use filename as ID
                "title": chapter_title,
                **analysis
            })
            count += 1
            
    else:
        # Fallback to EPUB parsing (original logic)
        print("No chapters.json found. Falling back to EPUB parsing.")
        # Filter for actual chapters (documents)
        items = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))
        print(f"Found {len(items)} items. Analyzing chapters...")
    
        count = 0
        for item in items:
            if limit and count >= limit:
                break
            
            chapter_id = item.get_id()
            chapter_title = item.get_name()

            if chapter_id in existing_chapters:
                 print(f"Skipping already processed chapter: {chapter_title}")
                 processed_chapters.append(existing_chapters[chapter_id])
                 count += 1
                 continue
            
            # Get content
            content = clean_html(item.get_content())
            
            if len(content) < 50: # Skip very short chapters/pages
                continue
    
            print(f"Analyzing chapter: {chapter_title}")
            analysis = analyze_chapter(chapter_title, content)
            
            processed_chapters.append({
                "id": chapter_id,
                "title": chapter_title,
                **analysis
            })
            count += 1

    # Save Data
    # book_id = get_book_id(filename) # Already calculated above
    os.makedirs(output_dir, exist_ok=True)
    
    # output_path defined above

    final_data = {
        "title": book_title,
        "author": book_author,
        "processedAt": datetime.now().isoformat(),
        "chapters": processed_chapters
    }

    with open(output_path, "w") as f:
        json.dump(final_data, f, indent=2)

    print(f"Successfully processed book. Output saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process an EPUB book.")
    parser.add_argument("--filename", required=True, help="Filename of the EPUB in public/books/")
    parser.add_argument("--limit", type=int, help="Limit the number of chapters to process")
    args = parser.parse_args()

    process_book(args.filename, args.limit)

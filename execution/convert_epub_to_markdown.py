import argparse
import json
import os
import sys
import re
from ebooklib import epub
import ebooklib
from bs4 import BeautifulSoup
import hashlib

def get_book_id(filename):
    # Create a stable ID based on the filename (or could use ISBN if available)
    # For simplicity, let's use a hash of the filename to avoid special char issues in paths
    return hashlib.md5(filename.encode()).hexdigest()[:12]

def clean_filename(title):
    # Remove invalid chars for filenames
    return re.sub(r'[\\/*?:"<>|]', "", title).replace(" ", "_")

def html_to_markdown(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Simple converter - can be improved or replaced with markdownify library if needed
    # For now, let's do a basic custom conversion to ensure control
    
    # Headings
    for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        level = int(h.name[1])
        h.string = f"{'#' * level} {h.get_text().strip()}\n\n"
        h.unwrap()

    # Paragraphs
    for p in soup.find_all('p'):
        p.insert_after('\n\n')
        p.unwrap()

    # Lists
    # Process nested lists bottom-up
    for ul in reversed(list(soup.find_all('ul'))):
        for li in ul.find_all('li'):
            li.string = f"- {li.get_text().strip()}"
            li.unwrap()
        ul.unwrap()
        
    for ol in reversed(list(soup.find_all('ol'))):
        for i, li in enumerate(ol.find_all('li')):
            li.string = f"{i+1}. {li.get_text().strip()}"
            li.unwrap()
        ol.unwrap()

    # Bold/Italic
    for b in soup.find_all(['b', 'strong']):
        b.string = f"**{b.get_text().strip()}**"
        b.unwrap()
        
    for i in soup.find_all(['i', 'em']):
        i.string = f"*{i.get_text().strip()}*"
        i.unwrap()

    # Tables (keep as HTML for now as they are complex to convert perfectly)
    # Images (keep as HTML or placeholder)
    
    return soup.get_text()

def convert_epub(filename):
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
    
    book_id = get_book_id(filename)
    output_base = os.path.join(base_dir, "data", "books", book_id)
    chapters_dir = os.path.join(output_base, "chapters")
    
    os.makedirs(chapters_dir, exist_ok=True)

    # Save Metadata
    metadata = {
        "id": book_id,
        "original_filename": filename,
        "title": book_title,
        "author": book_author,
    }
    with open(os.path.join(output_base, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    # Process Chapters
    items = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))
    print(f"Found {len(items)} items. Converting to Markdown...")

    count = 0
    for i, item in enumerate(items):
        # Try to find title
        chapter_title = item.get_name() # Fallback
        
        # Content
        content = item.get_content().decode('utf-8')
        markdown = html_to_markdown(content)
        
        if len(markdown.strip()) < 50: # Skip empty/tiny files
            continue
            
        # Filename: 01_Chapter_Name.md
        safe_title = clean_filename(chapter_title)
        out_filename = f"{count:02d}_{safe_title}.md"
        out_path = os.path.join(chapters_dir, out_filename)
        
        with open(out_path, "w") as f:
            f.write(markdown)
            
        count += 1

    print(f"Successfully converted {count} chapters.")
    print(f"Output directory: {output_base}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert EPUB to Markdown.")
    parser.add_argument("--filename", required=True, help="Filename of the EPUB in public/books/")
    args = parser.parse_args()

    convert_epub(args.filename)

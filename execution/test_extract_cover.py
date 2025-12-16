import argparse
import os
import sys
from ebooklib import epub
import ebooklib

def extract_cover(filename):
    base_dir = os.getcwd()
    books_dir = os.path.join(base_dir, "public", "books")
    file_path = os.path.join(books_dir, filename)

    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Reading EPUB: {filename}")
    try:
        book = epub.read_epub(file_path)
    except Exception as e:
        print(f"Error reading EPUB: {e}", file=sys.stderr)
        sys.exit(1)

    # Try to find the cover image
    cover_item = None
    
    # Method 1: Check metadata
    # (ebooklib doesn't always make this easy via metadata, but let's check standard items)
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_IMAGE:
            print(f"Found image: {item.get_name()}")
            # Heuristic: often named 'cover.jpg' or similar, or is the first image
            if 'cover' in item.get_name().lower():
                cover_item = item
                break
    
    # Method 2: If not found by name, try get_item_with_id('cover')
    if not cover_item:
        cover_item = book.get_item_with_id('cover')
        
    if cover_item:
        print(f"Found cover image: {cover_item.get_name()}")
        output_dir = os.path.join(base_dir, "data", "books", "test_cover")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, "cover.jpg") # specific ext might vary
        
        with open(output_path, "wb") as f:
            f.write(cover_item.get_content())
        print(f"Saved cover to {output_path}")
    else:
        print("No cover image found.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract cover from EPUB.")
    parser.add_argument("--filename", required=True, help="Filename of the EPUB")
    args = parser.parse_args()
    extract_cover(args.filename)

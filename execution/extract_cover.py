import argparse
import os
import sys
import json
from ebooklib import epub
import ebooklib

def extract_cover(book_id):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    metadata_path = os.path.join(book_dir, "metadata.json")

    if not os.path.exists(metadata_path):
        print(f"Error: metadata.json not found at {metadata_path}", file=sys.stderr)
        sys.exit(1)

    with open(metadata_path, "r") as f:
        metadata = json.load(f)

    filename = metadata.get("original_filename")
    if not filename:
        print("Error: original_filename not found in metadata.", file=sys.stderr)
        sys.exit(1)

    epub_path = os.path.join(base_dir, "public", "books", filename)
    if not os.path.exists(epub_path):
        print(f"Error: EPUB file not found at {epub_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Reading EPUB: {filename}")
    try:
        book = epub.read_epub(epub_path)
    except Exception as e:
        print(f"Error reading EPUB: {e}", file=sys.stderr)
        sys.exit(1)

    # Try to find the cover image
    cover_item = None
    cover_image_item = None
    
    # Method 1: Check metadata/manifest for 'cover' ID
    try:
        cover_item = book.get_item_with_id('cover')
        if not cover_item:
            cover_item = book.get_item_with_id('cover-image')
    except:
        pass

    # If cover_item is found but it's HTML, we need to find the image inside it
    if cover_item and cover_item.get_type() == ebooklib.ITEM_DOCUMENT:
        print(f"Cover item is a document: {cover_item.get_name()}. Parsing for image...")
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(cover_item.get_content(), 'html.parser')
            img_tag = soup.find('img') or soup.find('image') # SVG image tag
            if img_tag:
                src = img_tag.get('src') or img_tag.get('xlink:href')
                if src:
                    # The src is relative to the cover document. We need to resolve it.
                    # This is tricky in ebooklib without full path resolution logic.
                    # But usually it's just the filename or a simple relative path.
                    # Let's try to find an item with that href.
                    print(f"Found image src: {src}")
                    # Clean path
                    src_clean = os.path.basename(src)
                    
                    # Search for item with this filename
                    for item in book.get_items():
                        if item.get_type() == ebooklib.ITEM_IMAGE:
                            # print(f"Checking item: {item.get_name()}") # Debug
                            if src_clean in item.get_name():
                                cover_image_item = item
                                break
        except Exception as e:
            print(f"Error parsing cover document: {e}")

    elif cover_item and cover_item.get_type() == ebooklib.ITEM_IMAGE:
        cover_image_item = cover_item

    # Method 2: Search all images for 'cover' in name if we still don't have an image
    if not cover_image_item:
        print("Searching all images for 'cover'...")
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_IMAGE:
                print(f"Image item: {item.get_name()}")
                if 'cover' in item.get_name().lower():
                    cover_image_item = item
                    break
    
    if cover_image_item:
        print(f"Found cover image: {cover_image_item.get_name()}")
        output_path = os.path.join(book_dir, "cover.jpg")
        
        with open(output_path, "wb") as f:
            f.write(cover_image_item.get_content())
        print(f"Saved cover to {output_path}")
        return

    # Method 3: Fallback to direct zip extraction
    print("Falling back to direct zip extraction...")
    import zipfile
    try:
        with zipfile.ZipFile(epub_path, 'r') as z:
            # Find best candidate
            candidates = [n for n in z.namelist() if 'cover' in n.lower() and ('jpg' in n.lower() or 'jpeg' in n.lower() or 'png' in n.lower())]
            
            # Prioritize 'cover.jpg'
            best_candidate = None
            for c in candidates:
                if os.path.basename(c).lower() in ['cover.jpg', 'cover.jpeg', 'cover.png']:
                    best_candidate = c
                    break
            
            if not best_candidate and candidates:
                best_candidate = candidates[0]
            
            if best_candidate:
                print(f"Found cover in zip: {best_candidate}")
                output_path = os.path.join(book_dir, "cover.jpg")
                with open(output_path, "wb") as f:
                    f.write(z.read(best_candidate))
                print(f"Saved cover to {output_path}")
                return
    except Exception as e:
        print(f"Error reading zip: {e}")

    print("No cover image found.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract cover from EPUB.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    args = parser.parse_args()
    extract_cover(args.book_id)

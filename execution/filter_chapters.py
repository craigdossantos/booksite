import argparse
import os
import sys
import json
import re

def clean_title(title):
    # Remove common prefixes like "01_", "Chapter 1 - ", etc.
    # This is heuristic-based.
    
    # Remove numeric sort prefix from filename (e.g., "01_")
    title = re.sub(r'^\d+_', '', title)
    
    # Remove "Chapter N" if it's followed by a real title
    # e.g. "Chapter 1: The Beginning" -> "The Beginning"
    # But keep "Chapter 1" if that's all there is.
    match = re.match(r'Chapter \d+[:\s-]+(.+)', title, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Remove xhtml prefixes often found in these filenames
    # e.g. "xhtml08 1 The Surprising Powe.xhtml" -> "1 The Surprising Powe"
    title = re.sub(r'xhtml\d+\s*', '', title, flags=re.IGNORECASE)
    title = title.replace('.xhtml', '')
        
    return title.replace('_', ' ').strip()

def is_junk(filename, content, title):
    # Heuristics for junk chapters
    lower_title = title.lower()
    lower_content = content.lower()[:500] # Check start of content
    
    junk_keywords = [
        "table of contents",
        "contents",
        "copyright",
        "imprint",
        "dedication",
        "title page",
        "acknowledgments",
        "about the author",
        "also by",
        "notes",
        "index",
        "footnote"
    ]
    
    for keyword in junk_keywords:
        if keyword in lower_title:
            return True
            
    # Check for very short content
    if len(content.strip()) < 50:
        return True
        
    return False

def filter_chapters(book_id):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    chapters_dir = os.path.join(book_dir, "chapters")
    
    if not os.path.exists(chapters_dir):
        print(f"Error: Chapters directory not found at {chapters_dir}", file=sys.stderr)
        sys.exit(1)

    files = sorted([f for f in os.listdir(chapters_dir) if f.endswith(".md")])
    
    valid_chapters = []
    
    print(f"Scanning {len(files)} files in {chapters_dir}...")
    
    for filename in files:
        path = os.path.join(chapters_dir, filename)
        with open(path, "r") as f:
            content = f.read()
            
        # Infer title from filename first
        raw_title = os.path.splitext(filename)[0]
        
        # Try to find a Markdown heading
        lines = content.split('\n')
        heading_title = None
        
        # Scan first 20 lines for headings
        for line in lines[:20]:
            line = line.strip()
            if line.startswith('# ') or line.startswith('## '):
                # Remove markdown chars
                candidate = line.lstrip('#').strip()
                
                # If it's just a number, keep looking (e.g. "1")
                if re.match(r'^\d+$', candidate):
                    continue
                    
                # If it's "Chapter N", keep looking for a better title, but save this as fallback
                if re.match(r'^Chapter \d+$', candidate, re.IGNORECASE):
                    if not heading_title:
                        heading_title = candidate
                    continue
                
                # Found a good title
                heading_title = candidate
                break
        
        title_to_check = heading_title if heading_title else raw_title
        
        if is_junk(filename, content, title_to_check):
            print(f"Skipping junk: {filename} ({title_to_check})")
            continue
            
        clean_name = clean_title(title_to_check)
        
        valid_chapters.append({
            "filename": filename,
            "title": clean_name,
            "path": path
        })
        print(f"Kept: {filename} -> {clean_name}")

    output_path = os.path.join(book_dir, "chapters.json")
    with open(output_path, "w") as f:
        json.dump(valid_chapters, f, indent=2)
        
    print(f"Saved {len(valid_chapters)} valid chapters to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Filter and clean chapters.")
    parser.add_argument("--book_id", required=True, help="ID of the book")
    args = parser.parse_args()
    filter_chapters(args.book_id)

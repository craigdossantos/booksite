"""
Main book processing orchestrator.
Coordinates the full pipeline: extract → analyze voice → generate summaries.
Updates status.json at each step for frontend polling.
"""

import argparse
import json
import os
import sys
import hashlib
import subprocess
from datetime import datetime
from ebooklib import epub


def get_book_id(filename: str) -> str:
    """Create a stable ID based on the filename."""
    return hashlib.md5(filename.encode()).hexdigest()[:12]


def update_status(book_dir: str, **kwargs):
    """Update the status.json file with current processing state."""
    status_path = os.path.join(book_dir, "status.json")

    # Load existing status or create new
    if os.path.exists(status_path):
        with open(status_path, 'r') as f:
            status = json.load(f)
    else:
        status = {
            "bookId": os.path.basename(book_dir),
            "startedAt": datetime.now().isoformat()
        }

    # Update with provided values
    status.update(kwargs)
    status["updatedAt"] = datetime.now().isoformat()

    with open(status_path, 'w') as f:
        json.dump(status, f, indent=2)


def update_metadata(book_dir: str, **kwargs):
    """Update metadata.json with additional fields."""
    metadata_path = os.path.join(book_dir, "metadata.json")

    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    else:
        metadata = {}

    metadata.update(kwargs)

    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)


def run_script(script_name: str, args: list) -> bool:
    """Run a Python script and return success status."""
    base_dir = os.getcwd()
    script_path = os.path.join(base_dir, "execution", script_name)

    cmd = [sys.executable, script_path] + args
    print(f"Running: {' '.join(cmd)}")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)

    return result.returncode == 0


def process_book(filename: str):
    """
    Process a book through the full pipeline:
    1. Extract EPUB to markdown
    2. Extract cover image
    3. Analyze writing voice
    4. Generate chapter summaries
    """
    base_dir = os.getcwd()
    books_dir = os.path.join(base_dir, "public", "books")
    file_path = os.path.join(books_dir, filename)

    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)

    book_id = get_book_id(filename)
    book_dir = os.path.join(base_dir, "data", "books", book_id)

    os.makedirs(book_dir, exist_ok=True)

    print(f"Processing book: {filename}")
    print(f"Book ID: {book_id}")

    # Initialize status
    update_status(
        book_dir,
        bookId=book_id,
        status="extracting",
        progress=0,
        currentStep="Extracting chapters from EPUB",
        chaptersProcessed=0,
        totalChapters=0
    )

    # Step 1: Extract EPUB to markdown
    print("\n=== Step 1: Extracting EPUB to Markdown ===")
    if not run_script("convert_epub_to_markdown.py", ["--filename", filename]):
        update_status(book_dir, status="error", error="Failed to extract EPUB")
        sys.exit(1)

    update_status(book_dir, progress=20, currentStep="Extracting cover image")

    # Step 2: Extract cover
    print("\n=== Step 2: Extracting Cover Image ===")
    run_script("extract_cover.py", ["--book_id", book_id])
    # Cover extraction is optional, don't fail if it doesn't work

    # Count chapters and update metadata
    chapters_dir = os.path.join(book_dir, "chapters")
    chapter_files = [f for f in os.listdir(chapters_dir) if f.endswith('.md')]
    total_chapters = len(chapter_files)

    # Read book metadata from EPUB
    try:
        book = epub.read_epub(file_path)
        book_title = book.get_metadata('DC', 'title')[0][0] if book.get_metadata('DC', 'title') else "Unknown Title"
        book_author = book.get_metadata('DC', 'creator')[0][0] if book.get_metadata('DC', 'creator') else "Unknown Author"
    except Exception:
        book_title = "Unknown Title"
        book_author = "Unknown Author"

    # Update metadata with book info
    update_metadata(
        book_dir,
        id=book_id,
        title=book_title,
        author=book_author,
        chapterCount=total_chapters,
        createdAt=datetime.now().isoformat(),
        status="analyzing",
        coverUrl=f"/api/books/{book_id}/cover" if os.path.exists(os.path.join(book_dir, "cover.jpg")) else None
    )

    update_status(
        book_dir,
        status="analyzing",
        progress=30,
        currentStep="Analyzing writing style",
        totalChapters=total_chapters
    )

    # Step 3: Analyze voice
    print("\n=== Step 3: Analyzing Writing Voice ===")
    if not run_script("analyze_voice.py", ["--book-id", book_id]):
        print("Warning: Voice analysis failed, using default profile")
        # Continue with default voice profile

    update_status(
        book_dir,
        status="summarizing",
        progress=40,
        currentStep="Generating chapter summaries"
    )

    # Step 4: Generate summaries
    print("\n=== Step 4: Generating Chapter Summaries ===")
    if not run_script("generate_summaries.py", ["--book-id", book_id]):
        update_status(book_dir, status="error", error="Failed to generate summaries")
        sys.exit(1)

    # Final status update
    update_status(
        book_dir,
        status="ready",
        progress=100,
        currentStep="Processing complete",
        chaptersProcessed=total_chapters,
        totalChapters=total_chapters
    )

    update_metadata(
        book_dir,
        status="ready",
        processedAt=datetime.now().isoformat()
    )

    print(f"\n=== Processing Complete ===")
    print(f"Book ID: {book_id}")
    print(f"Chapters: {total_chapters}")
    print(f"Output: {book_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process an EPUB book through the full pipeline.")
    parser.add_argument("--filename", required=True, help="Filename of the EPUB in public/books/")
    args = parser.parse_args()

    process_book(args.filename)

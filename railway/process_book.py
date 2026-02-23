"""Main book processing orchestrator for Railway.

Downloads EPUB from Supabase Storage, runs the full pipeline in a temp dir,
uploads processed files back to Supabase Storage, and updates DB status.
"""

import json
import os
import tempfile
from datetime import datetime, timezone

from storage import download_epub, upload_file, upload_bytes
from db import update_book_status
from convert_epub import convert_epub
from extract_cover import extract_cover
from analyze_voice import analyze_voice
from generate_summaries import generate_all_summaries


def process_book(book_id: str) -> None:
    """Process a book through the full pipeline."""
    with tempfile.TemporaryDirectory() as work_dir:
        try:
            _run_pipeline(book_id, work_dir)
        except Exception as e:
            print(f"Processing failed for {book_id}: {e}")
            update_book_status(
                book_id,
                status="error",
                error_message=str(e)[:500],
                current_step="Processing failed",
            )
            raise


def _run_pipeline(book_id: str, work_dir: str) -> None:
    epub_path = os.path.join(work_dir, "book.epub")

    # Step 1: Download EPUB
    update_book_status(
        book_id,
        status="extracting",
        progress=5,
        current_step="Downloading EPUB file",
    )
    download_epub(book_id, epub_path)

    # Step 2: Extract chapters
    update_book_status(
        book_id, progress=10, current_step="Extracting chapters from EPUB"
    )
    metadata = convert_epub(epub_path, work_dir)

    update_book_status(
        book_id,
        title=metadata["title"],
        author=metadata["author"],
        chapter_count=metadata["chapterCount"],
        progress=20,
        current_step="Extracting cover image",
    )

    # Step 3: Extract cover
    cover_path = extract_cover(epub_path, work_dir)
    cover_url = None
    if cover_path:
        cover_url = upload_file(
            book_id, "cover.jpg", cover_path, content_type="image/jpeg"
        )
        update_book_status(book_id, cover_url=cover_url)

    # Step 4: Analyze voice
    update_book_status(
        book_id,
        status="analyzing",
        progress=30,
        current_step="Analyzing writing style",
    )
    chapters_dir = os.path.join(work_dir, "chapters")
    voice_profile = analyze_voice(chapters_dir)

    # Step 5: Generate summaries
    update_book_status(
        book_id,
        status="summarizing",
        progress=40,
        current_step="Generating chapter summaries",
    )

    def on_progress(done: int, total: int, title: str):
        pct = 40 + int((done / total) * 55)
        update_book_status(
            book_id,
            progress=pct,
            current_step=f"Summarizing chapter {done} of {total}: {title}",
        )

    chapters_data = generate_all_summaries(chapters_dir, voice_profile, on_progress)

    # Step 6: Upload processed files to Supabase Storage
    update_book_status(
        book_id, progress=95, current_step="Uploading processed files"
    )

    # Upload chapters.json
    chapters_json = json.dumps(chapters_data, indent=2)
    upload_bytes(
        book_id, "chapters.json", chapters_json.encode(), content_type="application/json"
    )

    # Upload metadata.json (with voice profile)
    metadata_obj = {
        "id": book_id,
        "title": metadata["title"],
        "author": metadata["author"],
        "chapterCount": metadata["chapterCount"],
        "voiceProfile": voice_profile,
        "coverUrl": cover_url,
        "processedAt": datetime.now(timezone.utc).isoformat(),
    }
    metadata_json = json.dumps(metadata_obj, indent=2)
    upload_bytes(
        book_id, "metadata.json", metadata_json.encode(), content_type="application/json"
    )

    # Upload chapter markdown files
    for chapter_file in sorted(os.listdir(chapters_dir)):
        if chapter_file.endswith(".md"):
            upload_file(
                book_id,
                f"chapters/{chapter_file}",
                os.path.join(chapters_dir, chapter_file),
                content_type="text/markdown",
            )

    # Step 7: Mark complete
    update_book_status(
        book_id,
        status="ready",
        progress=100,
        current_step="Processing complete",
        chapter_count=len(chapters_data),
        processed_at=datetime.now(timezone.utc).isoformat(),
    )

    print(f"Processing complete for {book_id}: {len(chapters_data)} chapters")

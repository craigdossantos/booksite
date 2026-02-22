"""Database status updates via Supabase PostgREST."""

import os
from datetime import datetime, timezone
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def update_book_status(
    book_id: str,
    *,
    status: str | None = None,
    progress: int | None = None,
    current_step: str | None = None,
    error_message: str | None = None,
    title: str | None = None,
    author: str | None = None,
    chapter_count: int | None = None,
    cover_url: str | None = None,
    processed_at: str | None = None,
) -> None:
    """Update book record in the database."""
    data: dict = {"updatedAt": datetime.now(timezone.utc).isoformat()}

    if status is not None:
        data["status"] = status
    if progress is not None:
        data["progress"] = progress
    if current_step is not None:
        data["currentStep"] = current_step
    if error_message is not None:
        data["errorMessage"] = error_message
    if title is not None:
        data["title"] = title
    if author is not None:
        data["author"] = author
    if chapter_count is not None:
        data["chapterCount"] = chapter_count
    if cover_url is not None:
        data["coverUrl"] = cover_url
    if processed_at is not None:
        data["processedAt"] = processed_at

    supabase.table("Book").update(data).eq("id", book_id).execute()

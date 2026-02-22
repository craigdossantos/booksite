"""Supabase Storage helpers for downloading and uploading book files."""

import os
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

EPUB_BUCKET = "epubs"
BOOKS_BUCKET = "books"


def download_epub(book_id: str, dest_path: str) -> None:
    """Download an EPUB file from the epubs bucket to a local path."""
    data = supabase.storage.from_(EPUB_BUCKET).download(f"{book_id}.epub")
    with open(dest_path, "wb") as f:
        f.write(data)


def upload_file(book_id: str, remote_path: str, local_path: str, content_type: str = "application/octet-stream") -> str:
    """Upload a file to the books bucket. Returns the public URL."""
    storage_path = f"{book_id}/{remote_path}"
    with open(local_path, "rb") as f:
        supabase.storage.from_(BOOKS_BUCKET).upload(
            storage_path,
            f.read(),
            file_options={"content-type": content_type, "upsert": "true"},
        )
    return f"{SUPABASE_URL}/storage/v1/object/public/{BOOKS_BUCKET}/{storage_path}"


def upload_bytes(book_id: str, remote_path: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """Upload bytes to the books bucket. Returns the public URL."""
    storage_path = f"{book_id}/{remote_path}"
    supabase.storage.from_(BOOKS_BUCKET).upload(
        storage_path,
        data,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return f"{SUPABASE_URL}/storage/v1/object/public/{BOOKS_BUCKET}/{storage_path}"

# Extract Cover Image

## Goal
Extract the high-resolution cover image from an EPUB file and save it to the book's data directory.

## Inputs
-   `book_id`: The ID of the book (folder name in `data/books`).

## Tools
-   `execution/extract_cover.py`

## Process
1.  Read `metadata.json` in `data/books/[book_id]` to get the `original_filename`.
2.  Locate the EPUB file in `public/books`.
3.  Open the EPUB using `ebooklib`.
4.  Identify the cover image:
    -   Check for items with ID 'cover'.
    -   Check for images with 'cover' in the filename.
    -   Check for the first image in the book (fallback).
5.  Save the image to `data/books/[book_id]/cover.jpg`.

## Output
-   `data/books/[book_id]/cover.jpg`

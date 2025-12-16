# Filter Chapters and Clean Titles

## Goal
Filter out non-content chapters (TOC, Copyright, etc.) and clean up chapter titles after EPUB to Markdown conversion.

## Inputs
-   `book_id`: The ID of the book.

## Tools
-   `execution/filter_chapters.py`

## Process
1.  Scan the `data/books/[book_id]/chapters` directory.
2.  Read the first few lines of each Markdown file to infer the title (if not clear from filename).
3.  Apply filtering heuristics to exclude:
    -   Table of Contents
    -   Copyright / Imprint
    -   Dedication
    -   Title Page
    -   Very short files (< 100 chars)
4.  Apply cleaning heuristics to titles:
    -   Remove "Chapter N" prefixes if redundant.
    -   Remove numeric prefixes from filenames (e.g., "01_").
5.  Generate a `chapters.json` manifest listing the valid chapters in order.

## Output Schema (`chapters.json`)
```json
[
  {
    "filename": "01_Chapter_1.md",
    "title": "The Fundamentals",
    "path": "absolute/path/to/file.md"
  },
  ...
]
```

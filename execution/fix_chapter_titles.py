#!/usr/bin/env python3
"""
Fix chapter titles for books with poor EPUB metadata.
Reads chapter markdown files and extracts better titles.
"""

import json
import os
import re
import argparse


def extract_title_from_markdown(md_path: str) -> str | None:
    """Extract the first meaningful heading from a markdown file."""
    try:
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read(2000)  # Read first 2000 chars only

        # Look for chapter headings like "##### Chapter 1. Title" or "# Title"
        patterns = [
            r'#+\s*Chapter\s*\d+\.?\s*(.+)',  # Chapter N. Title
            r'^#+\s+(.+?)(?:\n|$)',  # Any heading
            r'^\*{2}(.+?)\*{2}',  # Bold text on its own line
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.MULTILINE | re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                # Clean up the title
                title = re.sub(r'^#+\s*', '', title)  # Remove leading #
                title = re.sub(r'\s+', ' ', title)  # Normalize whitespace
                if len(title) > 3 and len(title) < 100:  # Reasonable title length
                    return title

        return None
    except Exception as e:
        print(f"Error reading {md_path}: {e}")
        return None


def is_poor_title(title: str) -> bool:
    """Check if a title looks like auto-generated EPUB metadata."""
    poor_patterns = [
        r'^chapter\s*\d+$',  # Just "chapter 0001"
        r'Chris-Voss',
        r'Steve-Shull',
        r'_EBOOK',
        r'xhtml',
        r'^C\d+\s+EBOOK',
        r'^FM\s+EBOOK',
        r'^BM\s+EBOOK',
    ]

    for pattern in poor_patterns:
        if re.search(pattern, title, re.IGNORECASE):
            return True
    return False


def fix_chapters_json(book_path: str) -> int:
    """Fix chapter titles in chapters.json."""
    chapters_path = os.path.join(book_path, 'chapters.json')
    if not os.path.exists(chapters_path):
        print(f"No chapters.json found at {chapters_path}")
        return 0

    with open(chapters_path, 'r', encoding='utf-8') as f:
        chapters = json.load(f)

    updated = 0
    for chapter in chapters:
        if is_poor_title(chapter.get('title', '')):
            md_path = chapter.get('path', '')
            if not md_path:
                md_path = os.path.join(book_path, 'chapters', chapter.get('filename', ''))

            if os.path.exists(md_path):
                new_title = extract_title_from_markdown(md_path)
                if new_title:
                    print(f"  Updating: '{chapter['title']}' -> '{new_title}'")
                    chapter['title'] = new_title
                    updated += 1

    if updated > 0:
        with open(chapters_path, 'w', encoding='utf-8') as f:
            json.dump(chapters, f, indent=2, ensure_ascii=False)
        print(f"Updated {updated} titles in chapters.json")

    return updated


def fix_content_json(book_path: str) -> int:
    """Fix chapter titles in content.json."""
    content_path = os.path.join(book_path, 'content.json')
    if not os.path.exists(content_path):
        print(f"No content.json found at {content_path}")
        return 0

    with open(content_path, 'r', encoding='utf-8') as f:
        content = json.load(f)

    if 'chapters' not in content:
        print("No chapters found in content.json")
        return 0

    updated = 0
    for chapter in content['chapters']:
        if is_poor_title(chapter.get('title', '')):
            # Try to find the markdown file
            chapter_id = chapter.get('id', '')
            # The id looks like "00_Chris-Voss_Steve-Shull_FM_EBOOK.xhtml.md"
            md_path = os.path.join(book_path, 'chapters', chapter_id)

            if os.path.exists(md_path):
                new_title = extract_title_from_markdown(md_path)
                if new_title:
                    print(f"  Updating: '{chapter['title']}' -> '{new_title}'")
                    chapter['title'] = new_title
                    updated += 1

    if updated > 0:
        with open(content_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
        print(f"Updated {updated} titles in content.json")

    return updated


def fix_book(book_path: str):
    """Fix chapter titles for a single book."""
    print(f"\nProcessing: {book_path}")

    chapters_updated = fix_chapters_json(book_path)
    content_updated = fix_content_json(book_path)

    return chapters_updated + content_updated


def main():
    parser = argparse.ArgumentParser(description='Fix chapter titles in book data')
    parser.add_argument('--book_id', type=str, help='Specific book ID to fix')
    parser.add_argument('--all', action='store_true', help='Fix all books')
    args = parser.parse_args()

    base_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'books')
    base_path = os.path.abspath(base_path)

    if args.book_id:
        book_path = os.path.join(base_path, args.book_id)
        if os.path.exists(book_path):
            fix_book(book_path)
        else:
            print(f"Book not found: {book_path}")
    elif args.all:
        for book_id in os.listdir(base_path):
            book_path = os.path.join(base_path, book_id)
            if os.path.isdir(book_path):
                fix_book(book_path)
    else:
        print("Usage: fix_chapter_titles.py --book_id <id> or --all")


if __name__ == '__main__':
    main()

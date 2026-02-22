"""Extract EPUB chapters to markdown files in a working directory."""

import json
import os
import re
import hashlib

from ebooklib import epub
import ebooklib
from bs4 import BeautifulSoup


def clean_filename(title: str) -> str:
    return re.sub(r'[\\/*?:"<>|]', "", title).replace(" ", "_")


def html_to_markdown(html_content: str) -> str:
    soup = BeautifulSoup(html_content, "html.parser")

    for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        level = int(h.name[1])
        h.string = f"{'#' * level} {h.get_text().strip()}\n\n"
        h.unwrap()

    for p in soup.find_all("p"):
        p.insert_after("\n\n")
        p.unwrap()

    for ul in reversed(list(soup.find_all("ul"))):
        for li in ul.find_all("li"):
            li.string = f"- {li.get_text().strip()}"
            li.unwrap()
        ul.unwrap()

    for ol in reversed(list(soup.find_all("ol"))):
        for i, li in enumerate(ol.find_all("li")):
            li.string = f"{i+1}. {li.get_text().strip()}"
            li.unwrap()
        ol.unwrap()

    for b in soup.find_all(["b", "strong"]):
        b.string = f"**{b.get_text().strip()}**"
        b.unwrap()

    for i in soup.find_all(["i", "em"]):
        i.string = f"*{i.get_text().strip()}*"
        i.unwrap()

    return soup.get_text()


def convert_epub(epub_path: str, work_dir: str) -> dict:
    """Convert EPUB to markdown chapters. Returns metadata dict."""
    chapters_dir = os.path.join(work_dir, "chapters")
    os.makedirs(chapters_dir, exist_ok=True)

    book = epub.read_epub(epub_path)

    title = "Unknown Title"
    author = "Unknown Author"
    try:
        dc_title = book.get_metadata("DC", "title")
        if dc_title:
            title = dc_title[0][0]
        dc_creator = book.get_metadata("DC", "creator")
        if dc_creator:
            author = dc_creator[0][0]
    except Exception:
        pass

    items = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))
    count = 0

    for item in items:
        chapter_title = item.get_name()
        content = item.get_content().decode("utf-8")
        markdown = html_to_markdown(content)

        if len(markdown.strip()) < 50:
            continue

        safe_title = clean_filename(chapter_title)
        out_filename = f"{count:02d}_{safe_title}.md"
        out_path = os.path.join(chapters_dir, out_filename)

        with open(out_path, "w") as f:
            f.write(markdown)

        count += 1

    return {"title": title, "author": author, "chapterCount": count}

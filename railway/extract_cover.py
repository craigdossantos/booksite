"""Extract cover image from an EPUB file."""

import os
from ebooklib import epub
import ebooklib
from bs4 import BeautifulSoup


def extract_cover(epub_path: str, work_dir: str) -> str | None:
    """Extract cover image from EPUB. Returns local path to cover or None."""
    book = epub.read_epub(epub_path)
    cover_image_item = None

    # Method 1: Check metadata/manifest for 'cover' ID
    cover_item = None
    try:
        cover_item = book.get_item_with_id("cover")
        if not cover_item:
            cover_item = book.get_item_with_id("cover-image")
    except Exception:
        pass

    if cover_item and cover_item.get_type() == ebooklib.ITEM_DOCUMENT:
        try:
            soup = BeautifulSoup(cover_item.get_content(), "html.parser")
            img_tag = soup.find("img") or soup.find("image")
            if img_tag:
                src = img_tag.get("src") or img_tag.get("xlink:href")
                if src:
                    src_clean = os.path.basename(src)
                    for item in book.get_items():
                        if item.get_type() == ebooklib.ITEM_IMAGE:
                            if src_clean in item.get_name():
                                cover_image_item = item
                                break
        except Exception:
            pass
    elif cover_item and cover_item.get_type() == ebooklib.ITEM_IMAGE:
        cover_image_item = cover_item

    # Method 2: Search all images for 'cover' in name
    if not cover_image_item:
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_IMAGE:
                if "cover" in item.get_name().lower():
                    cover_image_item = item
                    break

    if cover_image_item:
        output_path = os.path.join(work_dir, "cover.jpg")
        with open(output_path, "wb") as f:
            f.write(cover_image_item.get_content())
        return output_path

    # Method 3: Direct zip extraction
    import zipfile
    try:
        with zipfile.ZipFile(epub_path, "r") as z:
            candidates = [
                n for n in z.namelist()
                if "cover" in n.lower()
                and any(ext in n.lower() for ext in [".jpg", ".jpeg", ".png"])
            ]
            best = None
            for c in candidates:
                if os.path.basename(c).lower() in ["cover.jpg", "cover.jpeg", "cover.png"]:
                    best = c
                    break
            if not best and candidates:
                best = candidates[0]
            if best:
                output_path = os.path.join(work_dir, "cover.jpg")
                with open(output_path, "wb") as f:
                    f.write(z.read(best))
                return output_path
    except Exception:
        pass

    return None

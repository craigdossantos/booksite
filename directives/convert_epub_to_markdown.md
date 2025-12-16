# Convert EPUB to Markdown Directive (Stage 1)

## Goal
Convert an EPUB file into clean, structured Markdown files, one per chapter. This is a deterministic process (no AI).

## Inputs
- `filename`: The name of the EPUB file located in `public/books/`. Example: `my_book.epub`.

## Tools
- `execution/convert_epub_to_markdown.py`: Python script using `ebooklib` and `BeautifulSoup`.

## Execution Steps
1.  **Validate Input**: Ensure the file exists in `public/books/`.
2.  **Create Output Directory**: Create `data/books/{book_id}/chapters/` if it doesn't exist.
3.  **Run Script**:
    ```bash
    python3 execution/convert_epub_to_markdown.py --filename "my_book.epub"
    ```
4.  **Output**:
    - `data/books/{book_id}/metadata.json`: Book title, author, etc.
    - `data/books/{book_id}/chapters/01_chapter_title.md`: Markdown content for each chapter.

## Requirements
- Preserve headings (H1, H2, H3).
- Convert lists (ul, ol) to Markdown lists.
- Preserve bold/italic formatting.
- Convert tables to Markdown tables (if possible, or keep as HTML).
- Handle images: For now, keep `<img>` tags or strip them. (Future: extract images).
- **Naming Convention**: Chapter files should be numbered sequentially (e.g., `01_Intro.md`, `02_Chapter_1.md`) to preserve order.

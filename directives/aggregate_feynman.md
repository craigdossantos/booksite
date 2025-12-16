# Aggregate Feynman Explanation

## Goal
Generate a comprehensive "Feynman Explanation" for the entire book, synthesizing the main concepts into a simple, intuitive explanation.

## Inputs
-   `book_id`: The ID of the book.
-   `master_concepts.json` (preferred) or `concepts.json`.
-   `metadata.json` (for title/author).

## Tools
-   `execution/aggregate_feynman.py` (uses Gemini).

## Process
1.  Load book metadata and concepts.
2.  Construct a prompt for Gemini:
    -   "You are Richard Feynman. Explain the core thesis of this book [Title] by [Author] based on these key concepts."
    -   "Provide: 1. A one-sentence Thesis. 2. A powerful Analogy that explains the whole system. 3. An ELI12 explanation (simple language, no jargon). 4. Why it matters (implications)."
3.  Save the result to `data/books/[book_id]/feynman_book.json`.

## Output Schema (`feynman_book.json`)
```json
{
  "thesis": "string",
  "analogy": "string",
  "eli12": "string",
  "why_it_matters": "string"
}
```

# Extract Stories Directive (Stage 2b)

## Goal
Extract the emotional story that carries the lesson. This aligns with **Narrative Encoding** pedagogy ("We remember stories 22x better than facts").

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).

## Tools
- `execution/extract_stories.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/chapters/` exists.
2.  **Run Script**:
    ```bash
    python3 execution/extract_stories.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/stories.json`

## Story Definition
A "Story" is a specific narrative arc found in the text.
Format:
- **Title**: A catchy name for the story.
- **Protagonist**: Who is the story about?
- **Struggle**: The challenge or conflict faced.
- **Epiphany**: The moment of realization or turning point.
- **Victory**: The outcome or resolution.
- **Linked Concept**: The mental model this story illustrates.

## AI Prompt Strategy
"Find the best story in this chapter. Structure it as a 'Struggle -> Epiphany -> Victory' arc.
Bad: 'The author talks about cycling.'
Good: 'Dave Brailsford faced a mediocre British cycling team (Struggle), realized that 1% improvements add up (Epiphany), and led them to 60% of the gold medals in Beijing (Victory).'"

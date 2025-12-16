# Extract Atomic Concepts Directive (Stage 2a)

## Goal
Identify core mental models independent of the text. This aligns with **Sung Layer 2 (Concepts)** pedagogy.

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).

## Tools
- `execution/extract_concepts.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/chapters/` exists.
2.  **Run Script**:
    ```bash
    python3 execution/extract_concepts.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/concepts.json`

## Concept Definition
A "Concept" is a distinct mental model or principle. It is NOT just a summary of the text.
Format:
- **Name**: The term or phrase (e.g., "Habit Stacking").
- **Definition**: What it is in one sentence.
- **Mechanism**: How it works (the logic/process).
- **Context**: When to use it (application).

## AI Prompt Strategy
"Analyze this text and identify distinct mental models. Ignore anecdotes and filler. For each concept, provide the Name, Definition, Mechanism, and Context."

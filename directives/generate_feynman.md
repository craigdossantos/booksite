# Generate Feynman Explanation Directive (Stage 3c)

## Goal
Radical simplification. If you can't explain it simply, you don't understand it. This aligns with the **Feynman Technique**.

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).

## Tools
- `execution/generate_feynman.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/chapters/` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_feynman.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/feynman.json`

## Feynman Definition
A "Feynman Explanation" consists of:
- **The Core Thesis**: The main idea in 1 sentence.
- **The Analogy**: A simple, real-world comparison (no jargon).
- **The "ELI12"**: A paragraph explaining it to a smart 12-year-old.
- **Why It Matters**: Why should I care?

## AI Prompt Strategy
"Explain this chapter to a 12-year-old.
1. **Thesis**: One simple sentence.
2. **Analogy**: 'It's like brushing your teeth...'
3. **Explanation**: Simple words. No jargon. If you use a big word, define it immediately.
4. **Why**: Why is this cool/important?"

# Generate Micro-Projects Directive (Stage 3b)

## Goal
Create actionable, real-world experiments ("Labs") that force the user to apply the concepts. This aligns with **McMullen Building** pedagogy ("Don't learn the syntax; build a calculator").

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).
- `concepts.json`: The concepts extracted in Stage 2a.

## Tools
- `execution/generate_projects.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/concepts.json` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_projects.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/projects.json`

## Project Definition
A "Micro-Project" is a specific, time-bound task.
Format:
- **Title**: Action-oriented name (e.g., "The 2-Minute Morning Protocol").
- **Goal**: What specific outcome will be achieved.
- **Steps**: 3-5 concrete, physical steps (no "think about" steps).
- **Duration**: Estimated time (e.g., "3 days" or "15 mins").
- **Success Criteria**: How to know if you did it right.

## AI Prompt Strategy
"Create a 'Micro-Project' for this concept. It must be a physical action, not a thought experiment.
Bad: 'Reflect on your habits.'
Good: 'Write down your morning routine on a notecard and place it on your pillow.'"

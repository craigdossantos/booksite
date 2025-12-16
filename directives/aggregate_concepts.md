# Aggregate Concepts Directive (Stage 4a)

## Goal
Deduplicate and refine concepts. If "Habit Stacking" appears in Chapter 1, 3, and 10, merge them into one master entry with a comprehensive definition.

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).
- `concepts.json`: The raw concepts extracted in Stage 2a.

## Tools
- `execution/aggregate_concepts.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/concepts.json` exists.
2.  **Run Script**:
    ```bash
    python3 execution/aggregate_concepts.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/master_concepts.json`

## Master Concept Definition
A "Master Concept" is a consolidated mental model.
Format:
- **Name**: The canonical name.
- **Definition**: A refined definition combining insights from all occurrences.
- **Mechanism**: How it works (synthesized).
- **Context**: When to use it (synthesized).
- **Occurrences**: List of chapters where it appeared.

## AI Prompt Strategy
"Here is a list of 100+ concepts extracted from a book. Many are duplicates or variations (e.g., 'Habit Stacking' vs 'Stacking Habits').
Task:
1. Group semantically identical concepts.
2. Merge them into a single 'Master Concept'.
3. Refine the Definition/Mechanism to be more comprehensive.
4. Keep track of which chapters they came from."

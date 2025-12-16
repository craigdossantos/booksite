# Generate Schemas Directive (Stage 3a)

## Goal
Visualize the logic flow. Understanding is about connecting nodes (Hierarchy vs. Process vs. Contrast). This aligns with **Sung Layer 3** pedagogy.

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).

## Tools
- `execution/generate_schemas.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/chapters/` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_schemas.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/schemas.json`

## Schema Definition
A "Schema" is a visual representation of the chapter's logic.
Format:
- **Title**: Name of the diagram.
- **Type**: `flowchart`, `mindmap`, or `table`.
- **Mermaid Code**: Valid Mermaid.js syntax.
- **Description**: Brief explanation of what this visualizes.

## AI Prompt Strategy
"Create a Mermaid.js diagram for the core logic of this chapter.
- If it's a process (Step 1 -> Step 2), use a **Flowchart**.
- If it's a hierarchy (Concept -> Sub-concept), use a **Mindmap**.
- If it's a comparison (Old Way vs. New Way), use a **Table** (Markdown table, not Mermaid).
Ensure the code is valid and syntax-error free."

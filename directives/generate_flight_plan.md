# Generate Flight Plan Directive (Stage 4b)

## Goal
Sequence the learning. Don't dump 150 concepts on the user. Create a logical path from "Novice" to "Expert". This aligns with **Scaffolding / Zone of Proximal Development**.

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).
- `master_concepts.json`: The aggregated concepts from Stage 4a.

## Tools
- `execution/generate_flight_plan.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/master_concepts.json` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_flight_plan.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/flight_plan.json`

## Flight Plan Definition
A "Flight Plan" is a sequenced curriculum.
Format:
- **Phase 1: The Foundation** (Core concepts everyone must know).
- **Phase 2: The Mechanics** (How to apply it).
- **Phase 3: The Mastery** (Advanced nuance and edge cases).

Each Phase contains:
- **Goal**: What the user will be able to do.
- **Concepts**: List of concept names from `master_concepts.json`.
- **Rationale**: Why this order?

## AI Prompt Strategy
"Here are 150 concepts. Create a 3-Phase Learning Path.
1. **Foundation**: The 20% of concepts that give 80% of the value.
2. **Mechanics**: The 'How-To' concepts.
3. **Mastery**: The philosophical/advanced concepts.
Return a JSON list of Phases."

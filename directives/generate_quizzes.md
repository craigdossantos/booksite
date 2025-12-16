# Generate Quizzes Directive (Stage 5d)

## Goal
Create active recall assessments to test understanding. Move beyond passive reading to active retrieval. This aligns with **Active Recall** pedagogy.

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).

## Tools
- `execution/generate_quizzes.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/chapters/` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_quizzes.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/quizzes.json`

## Quiz Definition
A "Quiz" is a set of questions for a chapter:
- **Question**: Clear, unambiguous.
- **Type**: Multiple Choice, True/False, or Scenario.
- **Options**: 4 plausible options.
- **Correct Answer**: The right one.
- **Explanation**: Why it's right (immediate feedback).

## AI Prompt Strategy
"Generate a 5-question quiz for this chapter.
Focus on *applying* the concepts, not just memorizing terms.
Format: JSON list of questions with options and explanations."

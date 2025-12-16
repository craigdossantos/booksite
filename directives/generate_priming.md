# Generate Priming Scaffold Directive (Stage 2c)

## Goal
Create a "Pre-Flight" briefing that builds a mental container for the user *before* they read. This aligns with **Sung Priming** pedagogy (Cognitive Load Theory).

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).

## Tools
- `execution/generate_priming.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/chapters/` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_priming.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/priming.json`

## Priming Definition
A "Priming Scaffold" consists of:
- **The Hook**: Why should I care? (WIIFM - What's In It For Me).
- **Key Jargon**: 3 terms I need to know *before* I start so I don't get stuck.
- **Knowledge Gaps**: 3 specific questions this chapter answers (opens a loop).
- **The Map**: A 1-sentence summary of the logical flow.

## AI Prompt Strategy
"Analyze this chapter. Create a 'Pre-Flight Briefing'.
1. **Hook**: One sentence. High stakes.
2. **Jargon**: Define 'Habit Stacking', 'Implementation Intention', 'Diderot Effect'.
3. **Gaps**: 'Why do goals fail?' 'How do I stop procrastinating?'
4. **Map**: 'The author argues X, then proves it with Y, and concludes Z.'"

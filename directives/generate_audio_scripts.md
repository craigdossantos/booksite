# Generate Audio Scripts Directive (Stage 5b)

## Goal
Create engaging "NPR-style" podcast scripts. Turn dry text into dynamic dialogue. This aligns with **Dual Coding** pedagogy (Audio).

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).

## Tools
- `execution/generate_audio_scripts.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/chapters/` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_audio_scripts.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/audio_scripts.json`

## Script Definition
A "Deep Dive Script" is a dialogue between two hosts:
- **Host (Alex)**: The curious learner. Asks the questions the user is thinking.
- **Expert (Jamie)**: The knowledgeable guide. Explains concepts with analogies and depth.
- **Tone**: Conversational, smart, slightly witty. Think "Freakonomics" or "Planet Money".

## AI Prompt Strategy
"Convert this chapter into a 3-minute podcast script.
Characters: Alex (Host) and Jamie (Expert).
Style: NPR / Planet Money.
1. **Hook**: Start with a story or surprising fact.
2. **Body**: Discuss the 3 main concepts. Use analogies.
3. **Conclusion**: One takeaway action item.
Format: JSON list of dialogue lines."

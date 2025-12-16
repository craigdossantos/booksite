# Generate Video Scripts Directive (Stage 5c)

## Goal
Create visual scripts for "Kurzgesagt-style" explainer videos. Focus on visual metaphors and clear narration. This aligns with **Dual Coding** pedagogy (Visual).

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).

## Tools
- `execution/generate_video_scripts.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/chapters/` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_video_scripts.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/video_scripts.json`

## Script Definition
A "Video Script" is a sequence of scenes:
- **Scene Number**: 1, 2, 3...
- **Visual**: Detailed description of the animation/illustration (e.g., "A stick figure pushing a square wheel").
- **Narration**: The voiceover text (concise, timed to visuals).
- **Style**: Minimalist, flat design, cute but educational (Kurzgesagt).

## AI Prompt Strategy
"Convert this chapter into a 3-minute explainer video script.
Style: Kurzgesagt / Vox.
Format:
- **Scene 1**:
  - **Visual**: [Description of visual metaphor]
  - **Narration**: [Voiceover]
Focus on *showing* not just telling."

# Generate Image Prompts Directive (Stage 5a)

## Goal
Create "Sticky" visual analogies for concepts using **Dual Coding Theory**. We want visual metaphors, not literal depictions.

## Inputs
- `book_id`: The ID of the book (folder name in `data/books/`).
- `concepts.json`: The concepts extracted in Stage 2a.

## Tools
- `execution/generate_image_prompts.py`: Python script using Gemini API.

## Execution Steps
1.  **Validate Input**: Ensure `data/books/{book_id}/concepts.json` exists.
2.  **Run Script**:
    ```bash
    python3 execution/generate_image_prompts.py --book_id "{book_id}"
    ```
3.  **Output**: `data/books/{book_id}/image_prompts.json`

## Prompt Definition
A "Visual Prompt" is a description for an AI image generator (like Midjourney/DALL-E).
Format:
- **Concept**: Name of the concept.
- **Visual Metaphor**: The core idea (e.g., "Compound Interest -> Snowball rolling down hill").
- **Prompt**: Detailed description for the AI.
- **Style**: The artistic style (e.g., "Minimalist vector art", "Surrealist oil painting").

## AI Prompt Strategy
"Create a visual metaphor for this concept. Do NOT describe people in an office.
Bad: 'A man thinking about habits.'
Good: 'A tiny domino knocking over a slightly larger domino, creating a chain reaction leading to a massive monolith falling over. Minimalist 3D render, orange and white color palette.'"

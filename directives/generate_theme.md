# Generate Theme from Cover

## Goal
Analyze the book's cover image to generate a cohesive CSS theme (colors, fonts, vibes) that matches the book's aesthetic.

## Inputs
-   `book_id`: The ID of the book.

## Tools
-   `execution/generate_theme.py` (uses Gemini Vision).

## Process
1.  Load `data/books/[book_id]/cover.jpg`.
2.  Send the image to Gemini 1.5 Pro (Vision).
3.  Prompt: "Analyze this book cover. Extract a color palette (primary, secondary, accent, background, text) and suggest a CSS font stack that matches the mood. Return a JSON object with CSS variables."
4.  Save the result to `data/books/[book_id]/theme.json`.

## Output Schema (`theme.json`)
```json
{
  "colors": {
    "primary": "#...",
    "secondary": "#...",
    "accent": "#...",
    "background": "#...",
    "text": "#...",
    "surface": "#..."
  },
  "fonts": {
    "heading": "font-family string",
    "body": "font-family string"
  },
  "cssVariables": {
    "--color-primary": "#...",
    "--color-secondary": "#...",
    ...
  }
}
```

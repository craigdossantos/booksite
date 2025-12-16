import argparse
import os
import sys
import json
import google.generativeai as genai
from PIL import Image

# Configure Gemini
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "colors": {
            "type": "object",
            "properties": {
                "primary": {"type": "string"},
                "secondary": {"type": "string"},
                "accent": {"type": "string"},
                "background": {"type": "string"},
                "text": {"type": "string"},
                "surface": {"type": "string"}
            },
            "required": ["primary", "secondary", "accent", "background", "text", "surface"]
        },
        "fonts": {
            "type": "object",
            "properties": {
                "heading": {"type": "string"},
                "body": {"type": "string"}
            },
            "required": ["heading", "body"]
        },
        "cssVariables": {
            "type": "object",
            "properties": {
                "--color-primary": {"type": "string"},
                "--color-secondary": {"type": "string"},
                "--color-accent": {"type": "string"},
                "--color-background": {"type": "string"},
                "--color-text": {"type": "string"},
                "--color-surface": {"type": "string"},
                "--font-heading": {"type": "string"},
                "--font-body": {"type": "string"}
            },
            "required": ["--color-primary", "--color-secondary", "--color-accent", "--color-background", "--color-text", "--color-surface"]
        }
    },
    "required": ["colors", "fonts", "cssVariables"]
}

def generate_theme(book_id):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    cover_path = os.path.join(book_dir, "cover.jpg")

    if not os.path.exists(cover_path):
        print(f"Error: cover.jpg not found at {cover_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Analyzing cover for theme: {book_id}")
    
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    img = Image.open(cover_path)

    prompt = """
    Analyze this book cover and create a design theme (CSS variables) that matches its aesthetic.
    
    1. **Colors**: Extract a harmonious palette.
       - Primary: Dominant brand color.
       - Secondary: Supporting color.
       - Accent: For buttons/highlights (should contrast well).
       - Background: A very light or very dark shade derived from the cover (for page bg).
       - Surface: For cards/panels (slightly different from bg).
       - Text: High contrast against background.
       
    2. **Fonts**: Suggest generic font families (e.g., 'Inter, sans-serif', 'Merriweather, serif') that match the book's typography mood.
    
    3. **CSS Variables**: Map these to standard CSS variable names.
    """

    try:
        response = model.generate_content([prompt, img])
        theme_data = json.loads(response.text)
        
        output_path = os.path.join(book_dir, "theme.json")
        with open(output_path, "w") as f:
            json.dump(theme_data, f, indent=2)
            
        print(f"Theme generated and saved to {output_path}")
        
    except Exception as e:
        print(f"Error generating theme: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Theme from Cover.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    args = parser.parse_args()
    generate_theme(args.book_id)

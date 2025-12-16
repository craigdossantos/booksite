import argparse
import os
import sys
import json
import google.generativeai as genai

# Configure Gemini
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "thesis": {"type": "string"},
        "analogy": {"type": "string"},
        "eli12": {"type": "string"},
        "why_it_matters": {"type": "string"}
    },
    "required": ["thesis", "analogy", "eli12", "why_it_matters"]
}

def aggregate_feynman(book_id):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    
    # Load Metadata
    metadata_path = os.path.join(book_dir, "metadata.json")
    if not os.path.exists(metadata_path):
        print(f"Error: metadata.json not found at {metadata_path}", file=sys.stderr)
        sys.exit(1)
    
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
        
    title = metadata.get("title", "Unknown Title")
    author = metadata.get("author", "Unknown Author")

    # Load Concepts
    concepts_path = os.path.join(book_dir, "master_concepts.json")
    if not os.path.exists(concepts_path):
        print(f"master_concepts.json not found, falling back to concepts.json")
        concepts_path = os.path.join(book_dir, "concepts.json")
        
    if not os.path.exists(concepts_path):
        print(f"Error: No concepts file found for {book_id}", file=sys.stderr)
        sys.exit(1)

    with open(concepts_path, "r") as f:
        concepts = json.load(f)
        
    # Limit concepts size if too large
    concepts_str = json.dumps(concepts[:50], indent=2) # Take top 50 if too many

    print(f"Generating Feynman explanation for '{title}'...")
    
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    prompt = f"""
    You are Richard Feynman. Explain the core ideas of the book "{title}" by {author}.
    
    Base your explanation on the following key concepts extracted from the book:
    {concepts_str}
    
    Your goal is to synthesize these into a cohesive understanding of the book's main argument.
    
    Provide:
    1. **Thesis**: A single, punchy sentence that captures the main argument.
    2. **Analogy**: A vivid, real-world analogy that explains how the system/idea works (Feynman style).
    3. **ELI12**: A simple explanation (Explain Like I'm 12) of the core logic, avoiding jargon.
    4. **Why It Matters**: The practical implication or "so what?" of understanding this.
    """

    try:
        response = model.generate_content(prompt)
        feynman_data = json.loads(response.text)
        
        output_path = os.path.join(book_dir, "feynman_book.json")
        with open(output_path, "w") as f:
            json.dump(feynman_data, f, indent=2)
            
        print(f"Feynman explanation generated and saved to {output_path}")
        
    except Exception as e:
        print(f"Error generating Feynman explanation: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Book-Level Feynman Explanation.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    args = parser.parse_args()
    aggregate_feynman(args.book_id)

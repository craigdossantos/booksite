import argparse
import json
import os
import sys
import google.generativeai as genai
import time

# Configure Gemini
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "visual_metaphor": {"type": "string"},
        "prompt": {"type": "string"},
        "style": {"type": "string"}
    },
    "required": ["visual_metaphor", "prompt", "style"]
}

def generate_image_prompt_for_concept(concept):
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    prompt = f"""
    Create a "Visual Metaphor" image prompt for the following concept.
    
    Pedagogy: Dual Coding Theory. Visuals should be metaphorical, not literal.
    
    Concept: {concept['name']}
    Definition: {concept['definition']}
    Mechanism: {concept['mechanism']}
    
    Task:
    1. Visual Metaphor: Describe a physical analogy that represents the abstract concept. (e.g., Compound Interest -> Snowball).
    2. Prompt: Write a detailed prompt for an AI image generator (Midjourney/DALL-E).
       - NO text in the image.
       - NO generic "business people".
       - Focus on objects, nature, or abstract geometry.
    3. Style: Suggest a consistent artistic style (e.g., "Isometric 3D", " Bauhaus", "Synthwave").
    """

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating image prompt for '{concept['name']}': {e}", file=sys.stderr)
        return None

def process_book(book_id):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    concepts_path = os.path.join(book_dir, "concepts.json")

    if not os.path.exists(concepts_path):
        print(f"Error: concepts.json not found at {concepts_path}", file=sys.stderr)
        sys.exit(1)

    with open(concepts_path, "r") as f:
        concepts = json.load(f)
    
    print(f"Found {len(concepts)} concepts. Generating image prompts...")
    
    image_prompts = []
    
    # Limit to top 10 concepts for MVP
    processed_names = set()
    
    for concept in concepts:
        if concept['name'] in processed_names:
            continue
            
        print(f"Generating prompt for: {concept['name']}")
        result = generate_image_prompt_for_concept(concept)
        
        if result:
            result['concept_name'] = concept['name']
            image_prompts.append(result)
            processed_names.add(concept['name'])
            
        # Save incrementally
        output_path = os.path.join(book_dir, "image_prompts.json")
        with open(output_path, "w") as f:
            json.dump(image_prompts, f, indent=2)
            
        # Rate limiting pause
        time.sleep(2)
        
        if len(image_prompts) >= 10: # MVP Limit
            print("Reached MVP limit of 10 prompts.")
            break

    print(f"Successfully generated {len(image_prompts)} image prompts.")
    print(f"Output saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Image Prompts from concepts.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    args = parser.parse_args()

    process_book(args.book_id)

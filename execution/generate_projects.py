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
        "title": {"type": "string"},
        "goal": {"type": "string"},
        "steps": {
            "type": "array",
            "items": {"type": "string"}
        },
        "duration": {"type": "string"},
        "success_criteria": {"type": "string"}
    },
    "required": ["title", "goal", "steps", "duration", "success_criteria"]
}

def generate_project_for_concept(concept):
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    prompt = f"""
    Create a "Micro-Project" (a real-world experiment) for the following concept.
    
    Pedagogy: McMullen Building. "Don't just learn the theory; build something."
    
    Concept: {concept['name']}
    Definition: {concept['definition']}
    Mechanism: {concept['mechanism']}
    
    Task:
    Create a specific, actionable task the user must DO. 
    - It must be physical/observable (writing, speaking, moving), not just "thinking".
    - It must be short and testable.
    
    Format:
    1. Title: Action-oriented name.
    2. Goal: Specific outcome.
    3. Steps: 3-5 concrete instructions.
    4. Duration: Time to complete (e.g., "10 mins" or "3 days").
    5. Success Criteria: Binary check (Did I do it?).
    """

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating project for '{concept['name']}': {e}", file=sys.stderr)
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
    
    print(f"Found {len(concepts)} concepts. Generating projects...")
    
    projects = []
    
    # Limit to top 10 concepts for MVP to save time/quota, or process all if needed.
    # For now, let's process the first 10 distinct concepts to demonstrate.
    processed_names = set()
    
    for concept in concepts:
        if concept['name'] in processed_names:
            continue
            
        print(f"Generating project for: {concept['name']}")
        project = generate_project_for_concept(concept)
        
        if project:
            project['related_concept'] = concept['name']
            projects.append(project)
            processed_names.add(concept['name'])
            
        # Save incrementally
        output_path = os.path.join(book_dir, "projects.json")
        with open(output_path, "w") as f:
            json.dump(projects, f, indent=2)
            
        # Rate limiting pause
        time.sleep(2)
        
        if len(projects) >= 10: # MVP Limit
            print("Reached MVP limit of 10 projects.")
            break

    print(f"Successfully generated {len(projects)} projects.")
    print(f"Output saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Micro-Projects from concepts.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    args = parser.parse_args()

    process_book(args.book_id)

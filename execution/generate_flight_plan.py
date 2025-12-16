import argparse
import json
import os
import sys
import google.generativeai as genai

# Configure Gemini
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

RESPONSE_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "phase_name": {"type": "string"},
            "phase_goal": {"type": "string"},
            "rationale": {"type": "string"},
            "concepts": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["phase_name", "phase_goal", "rationale", "concepts"]
    }
}

def generate_flight_plan(concepts):
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    # Extract just the names and definitions to save context window
    simplified_concepts = [{"name": c["name"], "definition": c["definition"]} for c in concepts]
    concepts_str = json.dumps(simplified_concepts, indent=2)

    prompt = f"""
    Create a "Flight Plan" (Learning Curriculum) from these concepts.
    
    Pedagogy: Scaffolding / Zone of Proximal Development.
    Goal: Sequence the learning from Novice to Expert.
    
    Task:
    Create exactly 3 Phases:
    1. **Phase 1: The Foundation**. The absolute core mental models. The "80/20" rule.
    2. **Phase 2: The Mechanics**. The actionable "How-To" concepts and techniques.
    3. **Phase 3: The Mastery**. Advanced nuances, philosophy, and edge cases.
    
    For each phase, select the relevant Concept Names from the list.
    
    Input Concepts:
    {concepts_str}
    """

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating flight plan: {e}", file=sys.stderr)
        return []

def process_book(book_id):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    master_concepts_path = os.path.join(book_dir, "master_concepts.json")

    if not os.path.exists(master_concepts_path):
        print(f"Error: master_concepts.json not found at {master_concepts_path}", file=sys.stderr)
        sys.exit(1)

    with open(master_concepts_path, "r") as f:
        concepts = json.load(f)
    
    print(f"Found {len(concepts)} master concepts. Generating Flight Plan...")
    
    flight_plan = generate_flight_plan(concepts)
    
    if flight_plan:
        output_path = os.path.join(book_dir, "flight_plan.json")
        with open(output_path, "w") as f:
            json.dump(flight_plan, f, indent=2)
        print(f"Successfully generated Flight Plan with {len(flight_plan)} phases.")
        print(f"Output saved to {output_path}")
    else:
        print("Failed to generate flight plan.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Flight Plan from master concepts.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    args = parser.parse_args()

    process_book(args.book_id)

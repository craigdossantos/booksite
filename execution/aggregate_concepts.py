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
            "name": {"type": "string"},
            "definition": {"type": "string"},
            "mechanism": {"type": "string"},
            "context": {"type": "string"},
            "occurrences": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["name", "definition", "mechanism", "context", "occurrences"]
    }
}

def aggregate_concepts(concepts):
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        }
    )

    # Convert concepts list to a string for the prompt
    concepts_str = json.dumps(concepts, indent=2)

    prompt = f"""
    Analyze the following list of concepts extracted from a book.
    
    Task:
    1. **Deduplicate**: Identify concepts that are semantically identical or very similar (e.g., "Habit Stacking" and "Stacking Habits").
    2. **Merge**: Combine them into a single "Master Concept".
    3. **Refine**: Create a comprehensive Definition, Mechanism, and Context that incorporates insights from all variations.
    4. **Track**: List all "source_chapter" values where this concept appeared in the "occurrences" field.
    
    Input Concepts:
    {concepts_str}
    """

    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Error aggregating concepts: {e}", file=sys.stderr)
        return []

def process_book(book_id):
    base_dir = os.getcwd()
    book_dir = os.path.join(base_dir, "data", "books", book_id)
    concepts_path = os.path.join(book_dir, "concepts.json")

    if not os.path.exists(concepts_path):
        print(f"Error: concepts.json not found at {concepts_path}", file=sys.stderr)
        sys.exit(1)

    with open(concepts_path, "r") as f:
        concepts = json.load(f)
    
    print(f"Found {len(concepts)} raw concepts. Aggregating in batches...")
    
    # Batch processing
    BATCH_SIZE = 50
    all_aggregated = []
    
    for i in range(0, len(concepts), BATCH_SIZE):
        batch = concepts[i:i + BATCH_SIZE]
        print(f"Processing batch {i//BATCH_SIZE + 1} ({len(batch)} items)...")
        aggregated_batch = aggregate_concepts(batch)
        if aggregated_batch:
            all_aggregated.extend(aggregated_batch)
        else:
            print(f"Warning: Batch {i//BATCH_SIZE + 1} failed or returned empty.")
            
    # Final pass: Aggregate the aggregated batches to merge across boundaries
    print(f"Running final aggregation pass on {len(all_aggregated)} concepts...")
    final_master_concepts = aggregate_concepts(all_aggregated)
    
    if final_master_concepts:
        output_path = os.path.join(book_dir, "master_concepts.json")
        with open(output_path, "w") as f:
            json.dump(final_master_concepts, f, indent=2)
        print(f"Successfully aggregated into {len(final_master_concepts)} master concepts.")
        print(f"Output saved to {output_path}")
    else:
        # Fallback: if final pass fails, save the intermediate result
        print("Warning: Final aggregation pass failed. Saving intermediate results.")
        output_path = os.path.join(book_dir, "master_concepts.json")
        with open(output_path, "w") as f:
            json.dump(all_aggregated, f, indent=2)
        print(f"Output saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Aggregate Concepts from a book.")
    parser.add_argument("--book_id", required=True, help="ID of the book (folder name in data/books/)")
    args = parser.parse_args()

    process_book(args.book_id)

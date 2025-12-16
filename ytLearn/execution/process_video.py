import os
import sys
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not found in .env", file=sys.stderr)
    # We won't exit here to allow import, but main will fail
    
def process_video_with_ai(json_path, output_path):
    """
    Reads the transcript JSON, sends it to Gemini, and saves the insights.
    """
    if not GEMINI_API_KEY:
        print("Skipping AI processing: No API Key", file=sys.stderr)
        return

    if os.path.exists(output_path):
        print(f"  Skipping AI (already exists): {output_path}")
        return

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
    except Exception as e:
        print(f"Error reading transcript JSON: {e}", file=sys.stderr)
        return

    # Prepare transcript for prompt (simplify to text with timestamps)
    # We'll chunk it if it's too huge, but Gemini 1.5 Flash has a huge context window (1M tokens), 
    # so we can likely dump the whole thing.
    
    transcript_text = ""
    for entry in transcript_data:
        start = int(entry['start'])
        text = entry['text']
        transcript_text += f"[{start}s] {text}\n"

    prompt = """
    You are an expert video analyst. Analyze the following video transcript.
    
    Output a JSON object with the following structure:
    {
        "summary": "A concise 2-3 sentence summary of the video.",
        "actionable_advice": [
            {
                "timestamp": 123, // The start time in seconds where this advice is mentioned
                "advice": "The specific actionable advice given."
            },
            ...
        ]
    }
    
    Rules:
    1. Extract at least 3-5 actionable pieces of advice.
    2. The timestamp MUST be the closest start time (in seconds) from the transcript where the advice is discussed.
    3. Keep the advice actionable and direct (imperative mood).
    4. Return ONLY the JSON object, no markdown formatting.
    
    Transcript:
    """ + transcript_text

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # Use a model available to the user
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        
        insights = json.loads(response.text)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(insights, f, indent=2)
            
        print(f"  Saved AI insights to {output_path}")
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}", file=sys.stderr)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--json_path", required=True)
    parser.add_argument("--output_path", required=True)
    args = parser.parse_args()
    
    process_video_with_ai(args.json_path, args.output_path)

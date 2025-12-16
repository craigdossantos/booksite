import os
import sys
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not found in .env", file=sys.stderr)

def analyze_transcript(json_path, output_prefix):
    """
    Analyzes the transcript for actionable advice, suggestions, and practices.
    Generates both JSON and Markdown outputs.
    """
    if not GEMINI_API_KEY:
        print("Skipping AI analysis: No API Key", file=sys.stderr)
        return

    json_output_path = f"{output_prefix}_analysis.json"
    md_output_path = f"{output_prefix}_analysis.md"

    if os.path.exists(json_output_path) and os.path.exists(md_output_path):
        print(f"  Skipping Analysis (already exists): {json_output_path}")
        return

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
    except Exception as e:
        print(f"Error reading transcript JSON: {e}", file=sys.stderr)
        return

    # Prepare transcript
    transcript_text = ""
    for entry in transcript_data:
        start = int(entry['start'])
        text = entry['text']
        transcript_text += f"[{start}s] {text}\n"

    prompt = """
    You are a senior knowledge engineer. Your task is to analyze the following video transcript and extract high-value, actionable knowledge.
    
    Target Audience: Someone who has NOT watched the video but needs to apply the learnings immediately.
    Goal: Create a machine-readable list of actionable items that another AI agent could use to execute tasks or provide specific advice.

    Extract items into three categories:
    1. **Suggestion**: A recommendation for a specific course of action.
    2. **Advice**: General wisdom or guiding principles.
    3. **Practice**: A specific routine, habit, or method described.

    For each item, provide:
    - **Type**: (Suggestion, Advice, or Practice)
    - **Context**: The specific situation or problem this addresses. (Crucial for understanding without watching).
    - **Action**: The direct instruction (Imperative mood, e.g., "Do X", "Avoid Y").
    - **Reasoning**: Why this is recommended (The "Because...").
    - **Timestamp**: The start time in seconds.

    Output Format: JSON ONLY.
    {
        "items": [
            {
                "type": "Suggestion",
                "context": "When optimizing database queries for high traffic...",
                "action": "Use composite indexes on frequently filtered columns.",
                "reasoning": "Reduces lookup time by avoiding full table scans.",
                "timestamp": 145
            },
            ...
        ]
    }

    Transcript:
    """ + transcript_text

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        analysis_data = json.loads(response_text.strip())
        
        # Save JSON
        with open(json_output_path, 'w', encoding='utf-8') as f:
            json.dump(analysis_data, f, indent=2)
        print(f"  Saved Analysis JSON to {json_output_path}")

        # Generate and Save Markdown Report
        md_content = "# Deep Analysis & Actionable Items\n\n"
        for item in analysis_data.get('items', []):
            timestamp = item.get('timestamp', 0)
            minutes = int(timestamp // 60)
            seconds = int(timestamp % 60)
            time_str = f"{minutes}:{seconds:02d}"
            
            md_content += f"## {item.get('type')} ({time_str})\n"
            md_content += f"**Context:** {item.get('context')}\n\n"
            md_content += f"**Action:** {item.get('action')}\n\n"
            md_content += f"**Reasoning:** {item.get('reasoning')}\n\n"
            md_content += "---\n\n"

        with open(md_output_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        print(f"  Saved Analysis Report to {md_output_path}")
        
    except Exception as e:
        print(f"Error calling Gemini API for analysis: {e}", file=sys.stderr)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--json_path", required=True)
    parser.add_argument("--output_prefix", required=True)
    args = parser.parse_args()
    
    analyze_transcript(args.json_path, args.output_prefix)

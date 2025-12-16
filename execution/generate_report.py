import json
import os
import argparse
import sys

def generate_html(json_path, output_path):
    with open(json_path, 'r') as f:
        data = json.load(f)

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Study Guide: {data['title']}</title>
        <style>
            body {{ font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }}
            h1 {{ color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }}
            h2 {{ color: #1f2937; margin-top: 2rem; }}
            .chapter {{ background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 2rem; }}
            .chapter h3 {{ margin-top: 0; color: #4b5563; }}
            .section {{ margin-bottom: 1.5rem; }}
            .section-title {{ font-weight: bold; color: #374151; display: block; margin-bottom: 0.5rem; }}
            .story {{ background: #fff; border-left: 4px solid #3b82f6; padding: 1rem; margin-bottom: 1rem; }}
            .visual {{ background: #fff; border: 1px dashed #9ca3af; padding: 1rem; margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; }}
            .visual svg {{ width: 64px; height: 64px; flex-shrink: 0; }}
            ul {{ padding-left: 1.5rem; }}
            li {{ margin-bottom: 0.5rem; }}
        </style>
    </head>
    <body>
        <h1>Study Guide: {data['title']}</h1>
        <p><strong>Author:</strong> {data['author']}</p>
        <p><strong>Processed At:</strong> {data['processedAt']}</p>

        <div id="chapters">
    """

    for chapter in data['chapters']:
        if 'error' in chapter:
            html += f"""
            <div class="chapter">
                <h3>{chapter['title']}</h3>
                <p style="color: red;">Error: {chapter['error']}</p>
            </div>
            """
            continue

        stories_html = ""
        for story in chapter.get('stories', []):
            stories_html += f"""
            <div class="story">
                <strong>{story['title']}</strong>
                <p>{story['description']}</p>
                <p><em>Lesson: {story['lesson']}</em></p>
            </div>
            """

        objectives_html = "<ul>" + "".join([f"<li>{obj}</li>" for obj in chapter.get('learningObjectives', [])]) + "</ul>"

        visuals_html = ""
        for visual in chapter.get('visualPrompts', []):
            visuals_html += f"""
            <div class="visual">
                {visual['svgPlaceholder']}
                <div>
                    <strong>{visual['type'].title()}: {visual['description']}</strong>
                    <p style="font-size: 0.875rem; color: #6b7280;">Prompt: {visual['prompt']}</p>
                </div>
            </div>
            """

        html += f"""
        <div class="chapter">
            <h3>{chapter['title']}</h3>
            
            <div class="section">
                <span class="section-title">Summary</span>
                <p>{chapter.get('summary', 'No summary available.')}</p>
            </div>

            <div class="section">
                <span class="section-title">Key Stories</span>
                {stories_html}
            </div>

            <div class="section">
                <span class="section-title">Learning Objectives</span>
                {objectives_html}
            </div>

            <div class="section">
                <span class="section-title">Visual Prompts</span>
                {visuals_html}
            </div>
        </div>
        """

    html += """
        </div>
    </body>
    </html>
    """

    with open(output_path, 'w') as f:
        f.write(html)
    
    print(f"Report generated at {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate HTML report from processed book JSON.")
    parser.add_argument("--json", required=True, help="Path to the JSON file")
    parser.add_argument("--output", required=True, help="Path to the output HTML file")
    args = parser.parse_args()

    generate_html(args.json, args.output)

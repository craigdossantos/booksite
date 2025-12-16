import argparse
import os
import sys
import json
from fetch_videos import fetch_videos
from get_transcript import get_transcript

def main():
    parser = argparse.ArgumentParser(description="YouTube Transcription Tool")
    parser.add_argument("--url", required=True, help="YouTube URL (Video, Playlist, or Channel)")
    parser.add_argument("--days", type=int, help="Number of days to look back")
    parser.add_argument("--limit", type=int, help="Maximum number of videos to process")
    parser.add_argument("--deep-analyze", action="store_true", help="Perform deep analysis for actionable items")
    args = parser.parse_args()

    # Import here to avoid circular imports or early failures
    from analyze_transcript import analyze_transcript
    from process_video import process_video_with_ai

    print(f"Fetching videos from {args.url}...")
    videos, playlist_info = fetch_videos(args.url, args.days, args.limit)
    
    if not videos:
        print("No videos found.")
        return

    print(f"Found {len(videos)} videos. Starting transcription...")
    
    output_dir = "transcripts"
    os.makedirs(output_dir, exist_ok=True)

    # Handle Playlist Manifest
    if playlist_info:
        playlist_id = playlist_info['id']
        playlist_title = playlist_info['title']
        safe_playlist_title = "".join([c for c in playlist_title if c.isalpha() or c.isdigit() or c==' ']).rstrip().replace(" ", "_")
        
        manifest_path = os.path.join(output_dir, f"playlist_{playlist_id}.json")
        
        manifest = {
            'id': playlist_id,
            'title': playlist_title,
            'videos': []
        }
        
        # We'll populate the video list as we process them to ensure we have the filenames
        for video in videos:
            v_title = video['title']
            v_safe_title = "".join([c for c in v_title if c.isalpha() or c.isdigit() or c==' ']).rstrip().replace(" ", "_")
            manifest['videos'].append({
                'id': video['id'],
                'title': v_title,
                'filename': f"{v_safe_title}.md"
            })
            
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)
        print(f"Created playlist manifest: {manifest_path}")

    for video in videos:
        video_id = video['id']
        title = video['title']
        # The original safe_title logic is more robust for filenames
        safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip().replace(" ", "_")
        
        print(f"Processing: {title} ({video_id})")
        
        # Define filenames early
        md_filename = os.path.join(output_dir, f"{safe_title}.md")
        json_filename = os.path.join(output_dir, f"{safe_title}.json")
        insights_filename = os.path.join(output_dir, f"{safe_title}_insights.json")

        # Check if markdown file already exists (implies full processing might have happened)
        if os.path.exists(md_filename) and os.path.exists(json_filename) and os.path.exists(insights_filename):
            print(f"  Skipping (already processed): {md_filename}")
            # If deep analysis is requested, we might still want to run it
            if args.deep_analyze:
                print("  Running Deep Analysis on existing files...")
                analyze_transcript(json_filename, os.path.join(output_dir, f"{safe_title}"))
            continue

        # 1. Get Transcript
        transcript_text, transcript_list = get_transcript(video_id)
        
        if not transcript_text:
            print(f"  Failed to get transcript for {video_id}")
            continue
            
        # Save Markdown
        with open(md_filename, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n\n")
            f.write(f"**Video ID:** [{video_id}]({video['url']})\n")
            f.write(f"**Upload Date:** {video.get('upload_date')}\n\n")
            f.write("## Transcript\n\n")
            f.write(transcript_text)
        print(f"  Saved to {md_filename}")
        
        # Save JSON (Required for AI)
        with open(json_filename, "w", encoding="utf-8") as f:
            json.dump(transcript_list, f, indent=2)
        print(f"  Saved JSON to {json_filename}")
            
        # 2. Process with AI (Standard Summary)
        process_video_with_ai(json_filename, insights_filename)
        print(f"  Saved insights to {insights_filename}")

        # 3. Deep Analysis (Optional)
        if args.deep_analyze:
            print("  Running Deep Analysis...")
            analyze_transcript(json_filename, os.path.join(output_dir, f"{safe_title}"))

if __name__ == "__main__":
    main()

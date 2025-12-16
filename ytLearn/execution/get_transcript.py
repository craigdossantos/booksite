import sys
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

def get_transcript(video_id):
    """
    Fetches the transcript for a video ID and returns it as a string.
    """
    try:
        # Instantiate the API
        ytt_api = YouTubeTranscriptApi()
        
        # Fetch the transcript (defaults to English)
        transcript_obj = ytt_api.fetch(video_id)
        
        # Convert to standard list of dicts for JSON serialization
        transcript_dicts = []
        for i in transcript_obj:
            # Handle both object (attr) and dict (key) access
            try:
                text = i.text
                start = i.start
                duration = i.duration
            except AttributeError:
                text = i['text']
                start = i['start']
                duration = i['duration']
            
            transcript_dicts.append({
                'text': text,
                'start': start,
                'duration': duration
            })
        
        formatter = TextFormatter()
        # Pass the original objects to the formatter
        text_formatted = formatter.format_transcript(transcript_obj)
        return text_formatted, transcript_dicts
    except Exception as e:
        print(f"Error getting transcript for {video_id}: {e}", file=sys.stderr)
        return None, None

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--video_id", required=True)
    args = parser.parse_args()
    
    transcript, _ = get_transcript(args.video_id)
    if transcript:
        print(transcript)

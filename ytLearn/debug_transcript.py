from youtube_transcript_api import YouTubeTranscriptApi
import sys

video_id = "jNQXAC9IVRw"

try:
    ytt_api = YouTubeTranscriptApi()
    transcript_obj = ytt_api.fetch(video_id)
    
    print(f"Type of transcript_obj: {type(transcript_obj)}")
    
    # Iterate and check first item
    for i, item in enumerate(transcript_obj):
        print(f"Item {i} type: {type(item)}")
        print(f"Item {i} dir: {dir(item)}")
        print(f"Item {i} repr: {item}")
        break

except Exception as e:
    print(f"Error: {e}")

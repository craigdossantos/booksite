# Transcribe Videos Directive

## Goal
Extract transcriptions from YouTube videos, playlists, or channels and save them as Markdown files.

## Inputs
- `url`: YouTube URL (Video, Playlist, or Channel)
- `days`: (Optional) Number of days to look back (for channels/playlists)
- `limit`: (Optional) Maximum number of videos to process

## Tools
- `execution/orchestrate.py`: Main entry point script.

## Output
- Markdown files in `transcripts/` directory.
- Format: `transcripts/{video_title}.md`

## Procedure
1.  Run the orchestrator script using the virtual environment:
    ```bash
    source venv/bin/activate
    python execution/orchestrate.py --url "{url}" --days {days} --limit {limit}
    ```
2.  Verify the output files in `transcripts/`.

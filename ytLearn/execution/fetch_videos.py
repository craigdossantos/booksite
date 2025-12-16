import sys
import json
import datetime
import yt_dlp

def fetch_videos(url, days=None, limit=None):
    """
    Fetches video metadata from a URL (Channel/Playlist/Video).
    Filters by date (last N days) and limits the number of results.
    """
    
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,  # Don't download, just get metadata
        'ignoreerrors': True,
        'yes_playlist': True, # Prefer playlist if available
    }

    # If date filter is applied, we need to be careful. 
    # yt-dlp's dateafter filter works, but for channels it might still fetch everything if not careful.
    # We'll fetch and filter manually for precision if needed, but let's try yt-dlp's native filtering first for efficiency.
    
    # Auto-append /videos for channel URLs to avoid getting tabs (Home, Videos, Shorts, Live) as entries
    if '/@' in url and not any(sub in url for sub in ['/videos', '/shorts', '/live', '/playlists', '/featured']):
        url += '/videos'

    original_url = url
    # Handle watch URLs with list parameter (convert to playlist URL)
    if 'list=' in url and 'watch' in url:
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        if 'list' in qs:
            url = f"https://www.youtube.com/playlist?list={qs['list'][0]}"
            print(f"Converted to playlist URL: {url}", file=sys.stderr)
    
    if days:
        date_cutoff = (datetime.datetime.now() - datetime.timedelta(days=int(days))).strftime('%Y%m%d')
        ydl_opts['dateafter'] = date_cutoff

    if limit:
        ydl_opts['playlistend'] = int(limit)

    videos = []
    
    def extract(target_url):
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(target_url, download=False)

    try:
        info = extract(url)
    except Exception as e:
        print(f"Error fetching videos from {url}: {e}", file=sys.stderr)
        info = None

    if info is None and url != original_url:
        print(f"Falling back to original URL: {original_url}", file=sys.stderr)
        try:
            # Create new opts for fallback without forcing playlist
            fallback_opts = ydl_opts.copy()
            if 'yes_playlist' in fallback_opts:
                del fallback_opts['yes_playlist']
            
            # Strip list parameter to avoid confusion
            if 'list=' in original_url:
                from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
                parsed = urlparse(original_url)
                qs = parse_qs(parsed.query)
                if 'list' in qs:
                    del qs['list']
                new_query = urlencode(qs, doseq=True)
                clean_url = urlunparse(parsed._replace(query=new_query))
                print(f"Falling back to clean video URL: {clean_url}", file=sys.stderr)
            else:
                clean_url = original_url
                print(f"Falling back to original URL: {clean_url}", file=sys.stderr)

            with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                info = ydl.extract_info(clean_url, download=False)
        except Exception as e2:
            print(f"Error fetching videos from {original_url}: {e2}", file=sys.stderr)
            return []
            
    if not info:
        return []
            
    playlist_info = None
    if 'entries' in info:
        # It's a playlist or channel
        playlist_info = {
            'id': info.get('id'),
            'title': info.get('title')
        }
        for entry in info['entries']:
            if entry:
                videos.append({
                    'id': entry.get('id'),
                    'title': entry.get('title') or f"Video_{entry.get('id')}",
                    'url': entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}",
                    'upload_date': entry.get('upload_date')
                })
    else:
        # It's a single video
        videos.append({
            'id': info.get('id'),
            'title': info.get('title') or f"Video_{info.get('id')}",
            'url': info.get('webpage_url'),
            'upload_date': info.get('upload_date')
        })

    return videos, playlist_info

if __name__ == "__main__":
    # Simple CLI for testing
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--days", type=int)
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    
    results = fetch_videos(args.url, args.days, args.limit)
    print(json.dumps(results, indent=2))

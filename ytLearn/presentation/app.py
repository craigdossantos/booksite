import os
import re
import json
import markdown
import subprocess
import threading
import sys
from flask import Flask, render_template, jsonify, send_from_directory, request
template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

print(f"DEBUG: Template dir: {template_dir}")
print(f"DEBUG: Static dir: {static_dir}")
if os.path.exists(template_dir):
    print(f"DEBUG: Templates content: {os.listdir(template_dir)}")
else:
    print("DEBUG: Template dir does not exist!")

app = Flask(__name__, 
            template_folder=template_dir,
            static_folder=static_dir)
TRANSCRIPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'transcripts')

def parse_transcript_file(filename):
    filepath = os.path.join(TRANSCRIPTS_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract metadata using Regex
    title_match = re.search(r'^# (.*)', content, re.MULTILINE)
    video_id_match = re.search(r'\*\*Video ID:\*\* \[(.*?)\]', content)
    date_match = re.search(r'\*\*Upload Date:\*\* (.*)', content)
    
    # Extract transcript text (everything after ## Transcript)
    transcript_match = re.split(r'## Transcript', content)
    transcript_text = transcript_match[1].strip() if len(transcript_match) > 1 else ""
    
    # Convert transcript markdown to HTML
    transcript_html = markdown.markdown(transcript_text)
    
    # Load Insights if available
    insights = None
    insights_path = filepath.replace('.md', '_insights.json')
    if os.path.exists(insights_path):
        try:
            with open(insights_path, 'r', encoding='utf-8') as f:
                insights = json.load(f)
        except Exception as e:
            print(f"Error reading insights for {filename}: {e}")

    # Load Deep Analysis if available
    deep_analysis = None
    analysis_path = filepath.replace('.md', '_analysis.json')
    if os.path.exists(analysis_path):
        try:
            print(f"DEBUG: Found analysis file at {analysis_path}")
            with open(analysis_path, 'r', encoding='utf-8') as f:
                deep_analysis = json.load(f)
            print(f"DEBUG: Loaded analysis with {len(deep_analysis.get('items', []))} items")
        except Exception as e:
            print(f"Error reading analysis for {filename}: {e}")
    else:
        print(f"DEBUG: Analysis file NOT found at {analysis_path}")

    return {
        'filename': filename,
        'title': title_match.group(1) if title_match else 'Unknown Title',
        'video_id': video_id_match.group(1) if video_id_match else None,
        'upload_date': date_match.group(1) if date_match else 'Unknown Date',
        'transcript_html': transcript_html,
        'raw_content': content,
        'insights': insights,
        'deep_analysis': deep_analysis
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/videos')
def get_videos():
    if not os.path.exists(TRANSCRIPTS_DIR):
        return jsonify([])
    
    files = [f for f in os.listdir(TRANSCRIPTS_DIR) if f.endswith('.md') and not f.endswith('_analysis.md') and not f.endswith('_insights.md')]
    videos = []
    for f in files:
        try:
            data = parse_transcript_file(f)
            # Don't send full transcript in list view to save bandwidth
            del data['transcript_html']
            del data['raw_content']
            videos.append(data)
        except Exception as e:
            print(f"Error parsing {f}: {e}")
            
    return jsonify(videos)

@app.route('/api/video/<filename>')
def get_video_details(filename):
    try:
        data = parse_transcript_file(filename)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

import subprocess
import threading
from flask import Flask, render_template, jsonify, send_from_directory, request

# ... (existing code) ...

@app.route('/api/process', methods=['POST'])
def process_video():
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
        
    def run_orchestrator(video_url):
        # Use the current Python interpreter
        python_exe = sys.executable
        orchestrator_script = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'execution', 'orchestrate.py')
        
        cmd = [python_exe, orchestrator_script, '--url', video_url, '--deep-analyze']
        
        try:
            print(f"Starting processing for {video_url}...")
            # Run blocking for simplicity in this thread, but the request returns immediately
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            print(f"Finished processing for {video_url}")
        except subprocess.CalledProcessError as e:
            print(f"Error processing {video_url}: {e.stderr}")
        except Exception as e:
            print(f"Unexpected error for {video_url}: {e}")

    # Run in a separate thread so we don't block the response
    thread = threading.Thread(target=run_orchestrator, args=(url,))
    thread.start()
    
    # Check if it looks like a playlist URL
    is_playlist = 'list=' in url
    
    return jsonify({
        'status': 'started', 
        'message': 'Processing started. This may take a few minutes.',
        'is_playlist': is_playlist
    })

@app.route('/playlist/<playlist_id>')
def playlist_view(playlist_id):
    return render_template('playlist.html', playlist_id=playlist_id)

@app.route('/api/playlist/<playlist_id>')
def get_playlist(playlist_id):
    manifest_path = os.path.join(TRANSCRIPTS_DIR, f"playlist_{playlist_id}.json")
    if not os.path.exists(manifest_path):
        return jsonify({'error': 'Playlist not found'}), 404
        
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
            
        # Enrich manifest with video details (insights only)
        videos = []
        for v in manifest.get('videos', []):
            filename = v['filename']
            # Reuse parse_transcript_file but we only need insights/analysis
            try:
                details = parse_transcript_file(filename)
                videos.append({
                    'id': v['id'],
                    'title': v['title'],
                    'insights': details.get('insights'),
                    'deep_analysis': details.get('deep_analysis')
                })
            except Exception as e:
                print(f"Error parsing video {filename} for playlist: {e}")
                
        return jsonify({
            'id': manifest['id'],
            'title': manifest['title'],
            'videos': videos
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/playlists')
def get_playlists():
    playlists = []
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'transcripts') # Changed 'output' to 'transcripts'
    if os.path.exists(output_dir):
        for f in os.listdir(output_dir):
            if f.startswith('playlist_') and f.endswith('.json'):
                try:
                    with open(os.path.join(output_dir, f), 'r') as json_file:
                        data = json.load(json_file)
                        playlists.append({
                            'id': data.get('id'),
                            'title': data.get('title'),
                            'count': len(data.get('videos', []))
                        })
                except Exception as e:
                    print(f"Error reading playlist {f}: {e}")
    return jsonify(playlists)

@app.route('/api/video/<filename>', methods=['DELETE'])
def delete_video(filename):
    try:
        # Delete markdown file
        md_path = os.path.join(TRANSCRIPTS_DIR, filename)
        if os.path.exists(md_path):
            os.remove(md_path)
            
        # Delete insights file
        insights_path = os.path.join(TRANSCRIPTS_DIR, filename.replace('.md', '_insights.json'))
        if os.path.exists(insights_path):
            os.remove(insights_path)
            
        # Delete analysis file
        analysis_path = os.path.join(TRANSCRIPTS_DIR, filename.replace('.md', '_analysis.json'))
        if os.path.exists(analysis_path):
            os.remove(analysis_path)
            
        return jsonify({'status': 'success', 'message': f'Deleted {filename}'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/playlist/<playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    try:
        manifest_path = os.path.join(TRANSCRIPTS_DIR, f"playlist_{playlist_id}.json")
        if os.path.exists(manifest_path):
            os.remove(manifest_path)
            return jsonify({'status': 'success', 'message': f'Deleted playlist {playlist_id}'})
        else:
            return jsonify({'error': 'Playlist not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Disable debug reloader to prevent double-execution in background
    app.run(host='127.0.0.1', port=5002, debug=True, use_reloader=False, threaded=True)

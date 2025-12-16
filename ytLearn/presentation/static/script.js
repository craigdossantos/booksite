document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('video-grid');
    const modal = document.getElementById('reader-modal');
    const closeBtn = document.getElementById('close-modal');
    const refreshBtn = document.getElementById('refresh-btn');

    // Input Elements
    const videoUrlInput = document.getElementById('video-url');
    const analyzeBtn = document.getElementById('analyze-btn');
    const btnText = analyzeBtn.querySelector('.btn-text');
    const btnLoader = analyzeBtn.querySelector('.btn-loader');
    const statusMessage = document.getElementById('status-message');

    // Modal Elements
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalLink = document.getElementById('modal-link');
    const modalBody = document.getElementById('modal-body');
    const modalInsights = document.getElementById('modal-insights');
    const modalSummary = document.getElementById('modal-summary');
    const modalAdvice = document.getElementById('modal-advice');
    const deepAnalysisBox = document.getElementById('deep-analysis-box');
    const modalDeepAnalysis = document.getElementById('modal-deep-analysis');

    // Initial Load
    fetchVideos();
    fetchPlaylists();

    // Event Listeners
    refreshBtn.addEventListener('click', () => {
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => refreshBtn.style.transform = 'none', 500);
        fetchVideos();
        fetchPlaylists();
    });

    // ... (inside handleAnalyze) ...
    // Poll for updates every 5 seconds for 2 minutes
    let attempts = 0;
    const interval = setInterval(() => {
        fetchVideos();
        fetchPlaylists();
        attempts++;
        if (attempts > 24) clearInterval(interval);
    }, 5000);

    analyzeBtn.addEventListener('click', handleAnalyze);
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAnalyze();
    });

    function handleAnalyze() {
        const url = videoUrlInput.value.trim();
        if (!url) return;

        setLoading(true);
        showStatus('Starting analysis... This may take a few minutes.', 'info');

        fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        })
            .then(res => {
                if (!res.ok) {
                    return res.text().then(text => { throw new Error(text || res.statusText) });
                }
                return res.json();
            })
            .then(data => {
                if (data.error) {
                    showStatus(data.error, 'error');
                    setLoading(false);
                } else {
                    showStatus('Processing started! The video will appear below when ready.', 'success');
                    videoUrlInput.value = '';
                    setLoading(false);

                    if (data.is_playlist) {
                        // Redirect to playlist page if we can get the ID, but we don't have it yet.
                        // For now, just poll. The backend will create the manifest.
                        // Actually, we can't easily redirect without the ID. 
                        // Let's just let the user see the videos appear in the grid or show a message.
                        showStatus('Playlist processing started! Videos will appear below.', 'success');
                    }

                    // Poll for updates every 5 seconds for 2 minutes
                    let attempts = 0;
                    const interval = setInterval(() => {
                        fetchVideos();
                        attempts++;
                        if (attempts > 24) clearInterval(interval);
                    }, 5000);
                }
            })
            .catch(err => {
                console.error('Analysis Error:', err);
                showStatus(`Error: ${err.message}`, 'error');
                setLoading(false);
            });
    }

    function setLoading(isLoading) {
        if (isLoading) {
            analyzeBtn.disabled = true;
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
        } else {
            analyzeBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    function showStatus(msg, type) {
        statusMessage.textContent = msg;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');

        if (type === 'error' || type === 'success') {
            setTimeout(() => {
                statusMessage.classList.add('hidden');
            }, 5000);
        }
    }

    function fetchVideos() {
        fetch(`/api/videos?t=${new Date().getTime()}`)
            .then(response => response.json())
            .then(videos => {
                grid.innerHTML = '';
                if (videos.length === 0) {
                    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No transcripts found. Paste a URL above to get started!</p>';
                    return;
                }

                // Sort by date (assuming filename or upload date) - simplistic reverse order for now
                videos.reverse().forEach(video => {
                    const card = createCard(video);
                    grid.appendChild(card);
                });
            })
            .catch(err => console.error('Error fetching videos:', err));
    }

    function fetchPlaylists() {
        fetch(`/api/playlists?t=${new Date().getTime()}`)
            .then(res => res.json())
            .then(playlists => {
                const playlistSection = document.getElementById('playlists-section');
                const playlistGrid = document.getElementById('playlist-grid');

                if (playlists.length > 0) {
                    playlistGrid.innerHTML = '';
                    playlists.forEach(playlist => {
                        const card = document.createElement('div');
                        card.className = 'card playlist-card';
                        card.innerHTML = `
                            <button class="delete-btn" title="Delete Playlist">×</button>
                            <div class="card-content">
                                <h3 class="card-title">📑 ${playlist.title}</h3>
                                <div class="card-date">${playlist.count} videos</div>
                            </div>
                        `;

                        // Handle card click (open playlist)
                        card.addEventListener('click', (e) => {
                            if (!e.target.classList.contains('delete-btn')) {
                                window.location.href = `/playlist/${playlist.id}`;
                            }
                        });

                        // Handle delete click
                        const deleteBtn = card.querySelector('.delete-btn');
                        deleteBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            deletePlaylist(playlist.id, playlist.title);
                        });

                        playlistGrid.appendChild(card);
                    });
                    playlistSection.classList.remove('hidden');
                } else {
                    playlistSection.classList.add('hidden');
                }
            })
            .catch(err => console.error('Error fetching playlists:', err));
    }

    function createCard(video) {
        const card = document.createElement('div');
        card.className = 'card';

        let thumbnailHtml = '<div class="thumbnail-placeholder">▶</div>';
        if (video.video_id) {
            const thumbnailUrl = `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`;
            thumbnailHtml = `<img src="${thumbnailUrl}" alt="${video.title}" class="thumbnail-img" loading="lazy">`;
        }

        card.innerHTML = `
            <button class="delete-btn" title="Delete Video">×</button>
            ${thumbnailHtml}
            <div class="card-content">
                <h3 class="card-title">${video.title}</h3>
                <div class="card-date">${formatDate(video.upload_date)}</div>
            </div>
        `;

        // Handle card click (open modal)
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn')) {
                openModal(video.filename);
            }
        });

        // Handle delete click
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteVideo(video.filename, video.title);
        });

        return card;
    }

    function openModal(filename) {
        const transcriptBody = document.getElementById('modal-body');
        const toggleBtn = document.getElementById('toggle-transcript-btn');

        transcriptBody.innerHTML = '<p>Loading...</p>';
        transcriptBody.classList.add('hidden');
        toggleBtn.textContent = 'Show Transcript';

        modalInsights.classList.add('hidden');
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.add('visible');
        document.body.classList.add('modal-open');

        // Reset Toggle Button
        toggleBtn.onclick = () => {
            transcriptBody.classList.toggle('hidden');
            toggleBtn.textContent = transcriptBody.classList.contains('hidden') ? 'Show Transcript' : 'Hide Transcript';
        };

        fetch(`/api/video/${filename}`)
            .then(res => res.json())
            .then(data => {
                modalTitle.textContent = data.title;
                modalDate.textContent = formatDate(data.upload_date);

                if (data.video_id) {
                    modalLink.href = `https://www.youtube.com/watch?v=${data.video_id}`;
                    modalLink.style.display = 'inline-flex';
                    currentVideoId = data.video_id; // Set ID for timestamps
                    // initPlayer(data.video_id); // Disabled
                } else {
                    modalLink.style.display = 'none';
                    // document.getElementById('player-container').classList.add('hidden'); // Disabled
                }

                // Render Insights
                if (data.insights) {
                    modalSummary.textContent = data.insights.summary;
                    modalAdvice.innerHTML = '';
                    data.insights.actionable_advice.forEach(item => {
                        const li = document.createElement('li');
                        li.className = 'advice-item';

                        let timeLink = `<span class="timestamp-btn" onclick="seekTo(${item.timestamp})">${formatTime(item.timestamp)}</span>`;
                        if (data.video_id) {
                            // Keep the span but ensure it triggers the player
                            timeLink = `<span class="timestamp-btn" onclick="seekTo(${item.timestamp})">${formatTime(item.timestamp)}</span>`;
                        }

                        li.innerHTML = `
                            ${timeLink}
                            <span>${item.advice}</span>
                        `;
                        modalAdvice.appendChild(li);
                    });
                    modalInsights.classList.remove('hidden');
                } else {
                    modalInsights.classList.add('hidden');
                }

                // Render Deep Analysis
                console.log('Deep Analysis Data:', data.deep_analysis);
                if (data.deep_analysis && data.deep_analysis.items) {
                    modalDeepAnalysis.innerHTML = '';
                    try {
                        modalDeepAnalysis.innerHTML = '';
                        data.deep_analysis.items.forEach(item => {
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'analysis-item';
                            itemDiv.innerHTML = `
                                <div class="analysis-header">
                                    <span class="analysis-type type-${item.type ? item.type.toLowerCase() : 'default'}">${item.type || 'Note'}</span>
                                    <span class="analysis-timestamp timestamp-btn" onclick="seekTo(${item.timestamp || 0})">${formatTime(item.timestamp || 0)}</span>
                                </div>
                                <p class="analysis-context"><strong>Context:</strong> ${item.context || ''}</p>
                                <p class="analysis-action"><strong>Action:</strong> ${item.action || ''}</p>
                                <p class="analysis-reasoning"><strong>Reasoning:</strong> ${item.reasoning || ''}</p>
                            `;
                            modalDeepAnalysis.appendChild(itemDiv);
                        });
                        deepAnalysisBox.classList.remove('hidden');
                        console.log('Deep Analysis rendered successfully');
                    } catch (e) {
                        console.error('Error rendering deep analysis:', e);
                    }
                } else {
                    deepAnalysisBox.classList.add('hidden');
                }

                transcriptBody.innerHTML = data.transcript_html;
            })
            .catch(err => {
                transcriptBody.innerHTML = `<p style="color: var(--error)">Error loading transcript: ${err}</p>`;
                transcriptBody.classList.remove('hidden'); // Show error
            });
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function closeModal() {
        modal.classList.remove('visible');
        document.body.classList.remove('modal-open');
        setTimeout(() => {
            modal.classList.add('hidden');
            modalBody.innerHTML = '';
        }, 300);
    }

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('visible')) {
            closeModal();
        }
    });

    function formatDate(dateStr) {
        if (!dateStr || dateStr === 'Unknown Date') return 'Unknown Date';
        if (dateStr.length === 8) {
            const y = dateStr.substring(0, 4);
            const m = dateStr.substring(4, 6);
            const d = dateStr.substring(6, 8);
            return `${y}-${m}-${d}`;
        }
        return dateStr;
    }
    // YouTube Player API
    let player;
    let currentVideoId = null;

    function loadYouTubeApi() {
        // Disabled to prevent hanging
        /*
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        */
    }

    window.onYouTubeIframeAPIReady = function () {
        console.log("YouTube API Ready");
    };

    function initPlayer(videoId) {
        // Disabled
        /*
        const playerContainer = document.getElementById('player-container');
        playerContainer.classList.remove('hidden');

        if (player) {
            player.loadVideoById(videoId);
        } else {
            player = new YT.Player('youtube-player', {
                height: '390',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1
                },
                events: {
                    'onReady': onPlayerReady
                }
            });
        }
        currentVideoId = videoId;
        */
    }

    function onPlayerReady(event) {
        event.target.playVideo();
    }

    function seekTo(seconds) {
        if (currentVideoId) {
            window.open(`https://youtu.be/${currentVideoId}?t=${seconds}`, '_blank');
        } else {
            console.warn('No video ID available for seeking');
        }
    }

    // Expose seekTo globally for inline onclick handlers
    window.seekTo = seekTo;

    function deleteVideo(filename, title) {
        if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
            fetch(`/api/video/${filename}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        showStatus(`Error: ${data.error}`, 'error');
                    } else {
                        showStatus('Video deleted successfully', 'success');
                        fetchVideos(); // Refresh grid
                    }
                })
                .catch(err => showStatus(`Error: ${err}`, 'error'));
        }
    }

    function deletePlaylist(playlistId, title) {
        if (confirm(`Are you sure you want to delete playlist "${title}"? This cannot be undone.`)) {
            fetch(`/api/playlist/${playlistId}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        showStatus(`Error: ${data.error}`, 'error');
                    } else {
                        showStatus('Playlist deleted successfully', 'success');
                        fetchPlaylists(); // Refresh grid
                    }
                })
                .catch(err => showStatus(`Error: ${err}`, 'error'));
        }
    }

    loadYouTubeApi();
});

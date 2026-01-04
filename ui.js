/**
 * UI.JS - User Interface Logic
 * 
 * Handles:
 * - View navigation
 * - Rendering playlists, tracks, queue
 * - User interactions
 * - Context menus
 */

const UI = {
    currentView: 'home',
    currentPlaylist: null,
    allSongs: [],
    contextMenuTrack: null,

    /**
     * Initialize UI
     */
    async init() {
        this.setupEventListeners();
        this.showView('home');
    },

    /**
     * EVENT LISTENERS
     */
    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.showView(view);
            });
        });

        // Player controls
        document.getElementById('playPauseBtn').addEventListener('click', () => {
            Player.togglePlayPause();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            Player.playNext();
        });

        document.getElementById('prevBtn').addEventListener('click', () => {
            Player.playPrevious();
        });

        document.getElementById('shuffleBtn').addEventListener('click', () => {
            Player.toggleShuffle();
        });

        document.getElementById('loopBtn').addEventListener('click', () => {
            Player.toggleLoop();
        });

        // Progress bar
        document.getElementById('progressBar').addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            Player.seek(percent);
        });

        // Volume
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            Player.setVolume(e.target.value / 100);
        });

        // Queue drawer
        document.getElementById('queueBtn').addEventListener('click', () => {
            this.toggleQueue();
        });

        document.getElementById('closeQueueBtn').addEventListener('click', () => {
            this.toggleQueue();
        });

        // Search
        document.getElementById('songsSearch').addEventListener('input', (e) => {
            this.searchSongs(e.target.value);
        });

        // Context menu
        document.getElementById('ctxPlayNext').addEventListener('click', () => {
            if (this.contextMenuTrack) {
                Player.addTrackPlayNext(this.contextMenuTrack);
                this.hideContextMenu();
            }
        });

        document.getElementById('ctxAddToQueue').addEventListener('click', () => {
            if (this.contextMenuTrack) {
                Player.addToQueue(this.contextMenuTrack);
                this.hideContextMenu();
            }
        });

        // Close context menu on click outside
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    },

    /**
     * LOGIN
     */
    async handleLogin() {
        const serverUrl = document.getElementById('serverUrl').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        const success = await NavidromeAPI.connect(serverUrl, username, password);

        if (success) {
            document.getElementById('loginModal').classList.remove('active');
            await this.loadInitialData();
        } else {
            const errorMsg = document.getElementById('loginError');
            errorMsg.textContent = 'Connection failed. Check credentials.';
            errorMsg.classList.add('active');
        }
    },

    /**
     * Load initial data after login
     */
    async loadInitialData() {
        const playlists = await NavidromeAPI.getPlaylists();
        this.renderPlaylistsSidebar(playlists);
        this.renderRecentPlaylists(playlists.slice(0, 6));
    },

    /**
     * VIEW NAVIGATION
     */
    showView(viewName) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const viewMap = {
            'home': 'homeView',
            'playlists': 'playlistsView',
            'songs': 'songsView'
        };

        const viewId = viewMap[viewName];
        if (viewId) {
            document.getElementById(viewId).classList.add('active');
            this.currentView = viewName;

            // Load data if needed
            if (viewName === 'playlists') {
                this.loadPlaylistsView();
            } else if (viewName === 'songs') {
                this.loadSongsView();
            }
        }
    },

    /**
     * PLAYLISTS RENDERING
     */
    renderPlaylistsSidebar(playlists) {
        const container = document.getElementById('playlistsList');
        container.innerHTML = playlists.map(p => `
            <div class="playlist-item" data-id="${p.id}">
                ${p.name}
            </div>
        `).join('');

        container.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showPlaylistDetail(item.dataset.id);
            });
        });
    },

    renderRecentPlaylists(playlists) {
        const container = document.getElementById('recentPlaylists');
        container.innerHTML = `<h2>Recent Playlists</h2>` + playlists.map(p => `
            <div class="card" data-id="${p.id}">
                <div class="card-cover">
                    ${p.image ? `<img src="${p.image}" alt="${p.name}">` : ''}
                </div>
                <div class="card-title">${p.name}</div>
                <div class="card-subtitle">${p.trackCount} tracks</div>
            </div>
        `).join('');

        container.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                this.showPlaylistDetail(card.dataset.id);
            });
        });
    },

    async loadPlaylistsView() {
        const playlists = await NavidromeAPI.getPlaylists();
        const container = document.getElementById('playlistsGrid');
        container.innerHTML = playlists.map(p => `
            <div class="card" data-id="${p.id}">
                <div class="card-cover">
                    ${p.image ? `<img src="${p.image}" alt="${p.name}">` : ''}
                </div>
                <div class="card-title">${p.name}</div>
                <div class="card-subtitle">${p.trackCount} tracks</div>
            </div>
        `).join('');

        container.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                this.showPlaylistDetail(card.dataset.id);
            });
        });
    },

    /**
     * PLAYLIST DETAIL
     */
    async showPlaylistDetail(playlistId) {
        const playlist = await NavidromeAPI.getPlaylist(playlistId);
        if (!playlist) return;

        this.currentPlaylist = playlist;

        // Show detail view
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('playlistDetailView').classList.add('active');

        // Render header
        const cover = document.getElementById('playlistCover');
        cover.innerHTML = playlist.image ? `<img src="${playlist.image}">` : '';

        document.getElementById('playlistName').textContent = playlist.name;
        document.getElementById('playlistMeta').textContent = `${playlist.tracks.length} songs`;

        // Render tracks
        this.renderPlaylistTracks(playlist.tracks);

        // Setup playlist buttons
        document.getElementById('playPlaylistBtn').onclick = () => {
            Player.createQueueFromPlaylist(playlist.tracks);
            Player.playTrackAtIndex(0);
        };

        document.getElementById('shufflePlaylistBtn').onclick = () => {
            Player.createShuffledQueue(playlist.tracks);
            Player.playTrackAtIndex(0);
        };
    },

    renderPlaylistTracks(tracks) {
        const container = document.getElementById('tracksList');
        container.innerHTML = tracks.map((track, index) => `
            <div class="track-row" data-index="${index}">
                <div class="track-col track-num">${index + 1}</div>
                <div class="track-col track-title">${track.name}</div>
                <div class="track-col track-artist">${track.artist.name}</div>
                <div class="track-col track-album">${track.album.name}</div>
                <div class="track-col track-duration">${this.formatDuration(track.duration_ms)}</div>
            </div>
        `).join('');

        container.querySelectorAll('.track-row').forEach(row => {
            row.addEventListener('click', () => {
                const index = parseInt(row.dataset.index);
                if (Player.queue.length === 0 || Player.originalPlaylist !== tracks) {
                    Player.createQueueFromPlaylist(tracks);
                }
                Player.playTrackAtIndex(index);
            });

            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const index = parseInt(row.dataset.index);
                this.showContextMenu(e, tracks[index]);
            });
        });
    },

    /**
     * ALL SONGS VIEW
     */
    async loadSongsView() {
        if (this.allSongs.length === 0) {
            this.allSongs = await NavidromeAPI.getSongs();
        }
        this.renderSongs(this.allSongs);
    },

    renderSongs(songs) {
        const container = document.getElementById('songsGrid');
        container.innerHTML = songs.map(song => `
            <div class="card" data-id="${song.id}">
                <div class="card-cover">
                    ${song.album.image ? `<img src="${song.album.image}">` : ''}
                </div>
                <div class="card-title">${song.name}</div>
                <div class="card-subtitle">${song.artist.name}</div>
            </div>
        `).join('');

        container.querySelectorAll('.card').forEach((card, index) => {
            card.addEventListener('click', () => {
                Player.createQueueFromPlaylist(songs);
                Player.playTrackAtIndex(index);
            });

            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, songs[index]);
            });
        });
    },

    searchSongs(query) {
        if (!query.trim()) {
            this.renderSongs(this.allSongs);
            return;
        }

        const filtered = this.allSongs.filter(song => 
            song.name.toLowerCase().includes(query.toLowerCase()) ||
            song.artist.name.toLowerCase().includes(query.toLowerCase()) ||
            song.album.name.toLowerCase().includes(query.toLowerCase())
        );
        this.renderSongs(filtered);
    },

    /**
     * PLAYER UI UPDATES
     */
    updatePlayerInfo(track) {
        if (!track) {
            document.getElementById('playerTitle').textContent = 'No track playing';
            document.getElementById('playerArtist').textContent = 'Select a song';
            document.getElementById('playerCover').innerHTML = '';
            return;
        }

        document.getElementById('playerTitle').textContent = track.name;
        document.getElementById('playerArtist').textContent = track.artist.name;
        
        const cover = document.getElementById('playerCover');
        cover.innerHTML = track.album.image ? `<img src="${track.album.image}">` : '';
    },

    updateProgress(percent, current, total) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('timeCurrent').textContent = Player.formatTime(current);
        document.getElementById('timeTotal').textContent = Player.formatTime(total);
    },

    updateShuffleButton() {
        const btn = document.getElementById('shuffleBtn');
        btn.classList.toggle('active', Player.isShuffled);
    },

    updateLoopButton() {
        const btn = document.getElementById('loopBtn');
        const icon = btn.querySelector('i');
        
        btn.classList.toggle('active', Player.loopMode !== 'off');
        icon.className = Player.loopMode === 'one' ? 'fas fa-redo-alt' : 'fas fa-redo';
    },

    /**
     * QUEUE DRAWER
     */
    toggleQueue() {
        document.getElementById('queueDrawer').classList.toggle('active');
        this.renderQueue();
    },

    renderQueue() {
        const nowPlaying = document.getElementById('nowPlaying');
        const nextInQueue = document.getElementById('nextInQueue');

        if (Player.currentIndex >= 0 && Player.queue[Player.currentIndex]) {
            nowPlaying.innerHTML = this.renderQueueItem(Player.queue[Player.currentIndex], Player.currentIndex);
        } else {
            nowPlaying.innerHTML = '<p>No track playing</p>';
        }

        const upcoming = Player.queue.slice(Player.currentIndex + 1);
        nextInQueue.innerHTML = upcoming.map((track, i) => 
            this.renderQueueItem(track, Player.currentIndex + 1 + i)
        ).join('');
    },

    renderQueueItem(track, index) {
        return `
            <div class="queue-item" data-index="${index}">
                <div class="queue-item-cover">
                    ${track.album.image ? `<img src="${track.album.image}">` : ''}
                </div>
                <div class="queue-item-info">
                    <div class="queue-item-title">${track.name}</div>
                    <div class="queue-item-artist">${track.artist.name}</div>
                </div>
            </div>
        `;
    },

    /**
     * CONTEXT MENU
     */
    showContextMenu(event, track) {
        const menu = document.getElementById('contextMenu');
        this.contextMenuTrack = track;

        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
        menu.classList.add('active');
    },

    hideContextMenu() {
        document.getElementById('contextMenu').classList.remove('active');
        this.contextMenuTrack = null;
    },

    /**
     * HELPERS
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
    UI.init();
}
/**
 * UI.JS - Responsive Mobile & Desktop Interface Logic
 */

const UI = {
    currentView: 'home',
    currentPlaylist: null,
    allSongs: [],
    contextMenuTrack: null,
    viewHistory: [],

    /**
     * Initialize UI
     */
    async init() {
        this.setupEventListeners();
        this.detectLayoutMode();
        window.addEventListener('resize', () => this.detectLayoutMode());
    },

    /**
     * Detect if we're in mobile or desktop mode
     */
    detectLayoutMode() {
        const isDesktop = window.innerWidth >= 1024;
        document.body.classList.toggle('desktop-mode', isDesktop);
        document.body.classList.toggle('mobile-mode', !isDesktop);
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

        // Bottom navigation (mobile)
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.showView(view);
            });
        });

        // Sidebar navigation (desktop)
        document.querySelectorAll('.sidebar .sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.showView(view);
            });
        });

        // Back button (mobile)
        document.getElementById('backBtn').addEventListener('click', () => {
            this.navigateBack();
        });

        // Mobile mini player - tap track area to open full player
        const miniPlayerTrack = document.getElementById('miniPlayerTrack');
        if (miniPlayerTrack) {
            miniPlayerTrack.addEventListener('click', () => {
                this.openFullPlayer();
            });
        }

        // Mobile full player close
        document.getElementById('closePlayerBtn').addEventListener('click', () => {
            this.closeFullPlayer();
        });

        // Mobile mini player controls
        document.getElementById('miniPlayPauseBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            Player.togglePlayPause();
        });

        document.getElementById('miniPrevBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            Player.playPrevious();
        });

        document.getElementById('miniNextBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            Player.playNext();
        });

        document.getElementById('miniQueueBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openMobileQueue();
        });

        // Player controls - Mobile
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

        // Player controls - Desktop
        document.getElementById('desktopPlayPauseBtn').addEventListener('click', () => {
            Player.togglePlayPause();
        });

        document.getElementById('desktopNextBtn').addEventListener('click', () => {
            Player.playNext();
        });

        document.getElementById('desktopPrevBtn').addEventListener('click', () => {
            Player.playPrevious();
        });

        document.getElementById('desktopShuffleBtn').addEventListener('click', () => {
            Player.toggleShuffle();
        });

        document.getElementById('desktopLoopBtn').addEventListener('click', () => {
            Player.toggleLoop();
        });

        // Progress bars
        document.getElementById('progressBar').addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            Player.seek(percent);
        });

        document.getElementById('desktopProgressBar').addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            Player.seek(percent);
        });

        // Queue button (desktop)
        document.getElementById('queueBtn').addEventListener('click', () => {
            this.toggleQueueDrawer();
        });

        document.getElementById('closeQueueBtn').addEventListener('click', () => {
            this.closeQueueDrawer();
        });

        // Queue button (mobile full player)
        document.getElementById('playerQueueBtn').addEventListener('click', () => {
            this.openMobileQueue();
        });

        // Mobile queue close
        document.getElementById('closeMobileQueueBtn').addEventListener('click', () => {
            this.closeMobileQueue();
        });

        // Search
        const songsSearch = document.getElementById('songsSearch');
        if (songsSearch) {
            songsSearch.addEventListener('input', (e) => {
                this.searchSongs(e.target.value);
            });
        }

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

        document.getElementById('ctxCancel').addEventListener('click', () => {
            this.hideContextMenu();
        });

        document.getElementById('overlay').addEventListener('click', () => {
            this.hideContextMenu();
            this.closeQueueDrawer();
        });
    },

    /**
     * LOGIN
     */
    async handleLogin() {
        const serverUrl = document.getElementById('serverUrl').value.trim();
        const username = 'kush';
        const password = '252349';

        const success = await NavidromeAPI.connect(serverUrl, username, password);

        if (success) {
            document.getElementById('loginModal').classList.remove('active');
            await this.loadInitialData();
        } else {
            const errorMsg = document.getElementById('loginError');
            errorMsg.textContent = 'Connection failed. Check server URL.';
            errorMsg.classList.add('active');
        }
    },

    async loadInitialData() {
        const playlists = await NavidromeAPI.getPlaylists();
        this.renderRecentPlaylists(playlists.slice(0, 6));
    },

    /**
     * VIEW NAVIGATION
     */
    showView(viewName) {
        // Update both navigation bars
        document.querySelectorAll('.bottom-nav .nav-item, .sidebar .sidebar-item').forEach(item => {
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
            
            // Hide back button for main views
            document.getElementById('backBtn').style.display = 'none';
            this.viewHistory = [];

            // Update header title
            const titles = {
                'home': 'Music',
                'playlists': 'Library',
                'songs': 'All Songs'
            };
            document.getElementById('headerTitle').textContent = titles[viewName];

            // Load data if needed
            if (viewName === 'playlists') {
                this.loadPlaylistsView();
            } else if (viewName === 'songs') {
                this.loadSongsView();
            }
        }
    },

    navigateBack() {
        if (this.viewHistory.length > 0) {
            const previousView = this.viewHistory.pop();
            this.showView(previousView);
        }
    },

    /**
     * PLAYLISTS RENDERING
     */
    renderRecentPlaylists(playlists) {
        const container = document.getElementById('recentPlaylists');
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

        // Save current view to history (mobile only)
        if (window.innerWidth < 1024) {
            if (this.viewHistory.length === 0 || this.viewHistory[this.viewHistory.length - 1] !== this.currentView) {
                this.viewHistory.push(this.currentView);
            }
            document.getElementById('backBtn').style.display = 'flex';
        }

        // Show detail view
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('playlistDetailView').classList.add('active');

        // Render header
        const cover = document.getElementById('playlistCover');
        cover.innerHTML = playlist.image ? `<img src="${playlist.image}">` : '';

        document.getElementById('playlistName').textContent = playlist.name;
        document.getElementById('playlistMeta').textContent = `${playlist.tracks.length} songs`;
        document.getElementById('headerTitle').textContent = playlist.name;

        // Render tracks
        this.renderPlaylistTracks(playlist.tracks);

        // Setup playlist buttons
        document.getElementById('playPlaylistBtn').onclick = () => {
            Player.createQueueFromPlaylist(playlist.tracks);
            Player.playTrackAtIndex(0);
            this.showMiniPlayer();
        };

        document.getElementById('shufflePlaylistBtn').onclick = () => {
            Player.createShuffledQueue(playlist.tracks);
            Player.playTrackAtIndex(0);
            this.showMiniPlayer();
        };
    },

    renderPlaylistTracks(tracks) {
        const container = document.getElementById('tracksList');
        container.innerHTML = tracks.map((track, index) => `
            <li class="track-item ${Player.currentTrack && Player.currentTrack.id === track.id ? 'playing' : ''}" data-index="${index}">
                <div class="track-number">${index + 1}</div>
                ${track.album.image ? `
                    <div class="track-cover">
                        <img src="${track.album.image}" alt="">
                    </div>
                ` : ''}
                <div class="track-info">
                    <div class="track-title">${track.name}</div>
                    <div class="track-artist">${track.artist.name}</div>
                </div>
                <div class="track-menu">
                    <i class="fas fa-ellipsis-v"></i>
                </div>
            </li>
        `).join('');

        container.querySelectorAll('.track-item').forEach(item => {
            const index = parseInt(item.dataset.index);
            
            item.addEventListener('click', (e) => {
                if (e.target.closest('.track-menu')) {
                    this.showContextMenu(e, tracks[index]);
                } else {
                    if (Player.queue.length === 0 || Player.originalPlaylist !== tracks) {
                        Player.createQueueFromPlaylist(tracks);
                    }
                    Player.playTrackAtIndex(index);
                    this.showMiniPlayer();
                }
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
        container.innerHTML = songs.map((song, index) => `
            <div class="card" data-index="${index}">
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
                this.showMiniPlayer();
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
     * PLAYER UI UPDATES - Unified for mobile and desktop
     */
    showMiniPlayer() {
        document.getElementById('miniPlayer').style.display = 'flex';
    },

    openFullPlayer() {
        document.getElementById('fullPlayer').classList.add('active');
    },

    closeFullPlayer() {
        document.getElementById('fullPlayer').classList.remove('active');
    },

    updateAllPlayerInfo(track) {
        if (!track) {
            // Mobile mini player
            document.getElementById('miniPlayerTitle').textContent = 'No track';
            document.getElementById('miniPlayerArtist').textContent = 'Select a song';
            document.getElementById('miniPlayerCover').innerHTML = '';
            
            // Mobile full player
            document.getElementById('playerTitle').textContent = 'No track playing';
            document.getElementById('playerArtist').textContent = 'Select a song';
            document.getElementById('playerArtwork').innerHTML = '';
            
            // Desktop player bar
            document.getElementById('desktopPlayerTitle').textContent = 'No track';
            document.getElementById('desktopPlayerArtist').textContent = 'Select a song';
            document.getElementById('desktopPlayerCover').innerHTML = '';
            return;
        }

        // Mobile mini player
        document.getElementById('miniPlayerTitle').textContent = track.name;
        document.getElementById('miniPlayerArtist').textContent = track.artist.name;
        document.getElementById('miniPlayerCover').innerHTML = track.album.image ? `<img src="${track.album.image}">` : '';

        // Mobile full player
        document.getElementById('playerTitle').textContent = track.name;
        document.getElementById('playerArtist').textContent = track.artist.name;
        document.getElementById('playerArtwork').innerHTML = track.album.image ? `<img src="${track.album.image}">` : '';

        // Desktop player bar
        document.getElementById('desktopPlayerTitle').textContent = track.name;
        document.getElementById('desktopPlayerArtist').textContent = track.artist.name;
        document.getElementById('desktopPlayerCover').innerHTML = track.album.image ? `<img src="${track.album.image}">` : '';
    },

    updateAllProgress(percent, current, total) {
        // Mobile full player
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('timeCurrent').textContent = Player.formatTime(current);
        document.getElementById('timeTotal').textContent = Player.formatTime(total);

        // Desktop player bar
        document.getElementById('desktopProgressFill').style.width = `${percent}%`;
        document.getElementById('desktopTimeCurrent').textContent = Player.formatTime(current);
        document.getElementById('desktopTimeTotal').textContent = Player.formatTime(total);
    },

    updateShuffleButtons() {
        // Mobile
        const mobileBtn = document.getElementById('shuffleBtn');
        mobileBtn.classList.toggle('active', Player.isShuffled);

        // Desktop
        const desktopBtn = document.getElementById('desktopShuffleBtn');
        desktopBtn.classList.toggle('active', Player.isShuffled);
    },

    updateLoopButtons() {
        // Mobile
        const mobileBtn = document.getElementById('loopBtn');
        const mobileIcon = mobileBtn.querySelector('i');
        mobileBtn.classList.toggle('active', Player.loopMode !== 'off');
        mobileIcon.className = Player.loopMode === 'one' ? 'fas fa-redo-alt' : 'fas fa-redo';

        // Desktop
        const desktopBtn = document.getElementById('desktopLoopBtn');
        const desktopIcon = desktopBtn.querySelector('i');
        desktopBtn.classList.toggle('active', Player.loopMode !== 'off');
        desktopIcon.className = Player.loopMode === 'one' ? 'fas fa-redo-alt' : 'fas fa-redo';
    },

    /**
     * QUEUE MANAGEMENT
     */
    toggleQueueDrawer() {
        const drawer = document.getElementById('queueDrawer');
        const isActive = drawer.classList.contains('active');
        
        if (isActive) {
            this.closeQueueDrawer();
        } else {
            drawer.classList.add('active');
            document.getElementById('overlay').classList.add('active');
            this.renderQueue();
        }
    },

    closeQueueDrawer() {
        document.getElementById('queueDrawer').classList.remove('active');
    },

    openMobileQueue() {
        document.getElementById('mobileQueueOverlay').classList.add('active');
        this.renderMobileQueue();
    },

    closeMobileQueue() {
        document.getElementById('mobileQueueOverlay').classList.remove('active');
    },

    renderQueue() {
        const content = document.getElementById('queueContent');
        
        if (Player.queue.length === 0) {
            content.innerHTML = '<p class="queue-empty">Queue is empty</p>';
            return;
        }

        let html = '';
        
        // Now Playing section
        if (Player.currentIndex >= 0 && Player.currentIndex < Player.queue.length) {
            html += '<div class="queue-section-title">Now Playing</div>';
            const track = Player.queue[Player.currentIndex];
            html += this.renderQueueItem(track, Player.currentIndex, true);
        }
        
        // Next from Queue section
        const upcomingTracks = Player.queue.slice(Player.currentIndex + 1);
        if (upcomingTracks.length > 0) {
            html += '<div class="queue-section-title">Next From Queue</div>';
            upcomingTracks.forEach((track, idx) => {
                const actualIndex = Player.currentIndex + 1 + idx;
                html += this.renderQueueItem(track, actualIndex, false);
            });
        }

        content.innerHTML = html;
        this.attachQueueItemListeners(content);
    },

    renderMobileQueue() {
        const content = document.getElementById('mobileQueueContent');
        
        if (Player.queue.length === 0) {
            content.innerHTML = '<p class="queue-empty">Queue is empty</p>';
            return;
        }

        let html = '';
        
        // Now Playing section
        if (Player.currentIndex >= 0 && Player.currentIndex < Player.queue.length) {
            html += '<div class="queue-section-title">Now Playing</div>';
            const track = Player.queue[Player.currentIndex];
            html += this.renderQueueItem(track, Player.currentIndex, true);
        }
        
        // Next from Queue section
        const upcomingTracks = Player.queue.slice(Player.currentIndex + 1);
        if (upcomingTracks.length > 0) {
            html += '<div class="queue-section-title">Next From Queue</div>';
            upcomingTracks.forEach((track, idx) => {
                const actualIndex = Player.currentIndex + 1 + idx;
                html += this.renderQueueItem(track, actualIndex, false);
            });
        }

        content.innerHTML = html;
        this.attachQueueItemListeners(content);
    },

    renderQueueItem(track, index, isActive) {
        return `
            <div class="queue-item ${isActive ? 'active' : ''}" data-index="${index}">
                <div class="queue-item-cover">
                    ${track.album.image ? `<img src="${track.album.image}">` : ''}
                </div>
                <div class="queue-item-info">
                    <div class="queue-item-title">${track.name}</div>
                    <div class="queue-item-artist">${track.artist.name}</div>
                </div>
                ${!isActive ? `
                    <button class="queue-item-remove" data-remove="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        `;
    },

    attachQueueItemListeners(container) {
        // Click to play
        container.querySelectorAll('.queue-item').forEach(item => {
            const index = parseInt(item.dataset.index);
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.queue-item-remove')) {
                    Player.playTrackAtIndex(index);
                }
            });
        });

        // Remove buttons
        container.querySelectorAll('.queue-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.remove);
                Player.removeFromQueue(index);
                
                // Re-render both queues to stay in sync
                if (window.innerWidth >= 1024) {
                    this.renderQueue();
                } else {
                    this.renderMobileQueue();
                }
            });
        });
    },

    /**
     * CONTEXT MENU
     */
    showContextMenu(event, track) {
        event.stopPropagation();
        this.contextMenuTrack = track;
        document.getElementById('overlay').classList.add('active');
        document.getElementById('contextMenu').classList.add('active');
    },

    hideContextMenu() {
        document.getElementById('overlay').classList.remove('active');
        document.getElementById('contextMenu').classList.remove('active');
        this.contextMenuTrack = null;
    }
};

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
    UI.init();
}
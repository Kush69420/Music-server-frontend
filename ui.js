/**
 * UI.JS - Responsive Mobile & Desktop Interface Logic
 * Enhanced with Full Playlist Editing Features
 */

const UI = {
    currentView: 'home',
    currentPlaylist: null,
    allSongs: [],
    allPlaylists: [],
    contextMenuTrack: null,
    contextMenuTrackIndex: null,
    viewHistory: [],
    editingPlaylistId: null,
    draggedIndex: null,

    /**
     * Initialize UI
     */
    async init() {
        this.setupEventListeners();
        this.detectLayoutMode();
        window.addEventListener('resize', () => this.detectLayoutMode());
        
        await this.autoConnectIfPossible();
    },

    /**
     * Auto-connect if server URL is saved
     */
    async autoConnectIfPossible() {
        const loginModal = document.getElementById('loginModal');
        const savedUrl = NavidromeAPI.loadSavedServerUrl();
        
        if (savedUrl) {
            console.log('Found saved server URL:', savedUrl);
            document.getElementById('serverUrl').value = savedUrl;
            
            const username = 'kush';
            const password = '252349';
            
            console.log('Attempting auto-connect...');
            const success = await NavidromeAPI.connect(savedUrl, username, password);
            
            if (success) {
                console.log('Auto-connect successful!');
                loginModal.classList.remove('active');
                await this.loadInitialData();
            } else {
                console.log('Auto-connect failed, showing login modal');
                loginModal.classList.add('active');
            }
        } else {
            console.log('No saved URL found, showing login modal');
            loginModal.classList.add('active');
        }
    },

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

        // Navigation
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showView(item.dataset.view);
            });
        });

        document.querySelectorAll('.sidebar .sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showView(item.dataset.view);
            });
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            this.navigateBack();
        });

        // Mini player
        const miniPlayerTrack = document.getElementById('miniPlayerTrack');
        if (miniPlayerTrack) {
            miniPlayerTrack.addEventListener('click', () => {
                this.openFullPlayer();
            });
        }

        document.getElementById('closePlayerBtn').addEventListener('click', () => {
            this.closeFullPlayer();
        });

        // Mini player controls
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

        // Queue
        document.getElementById('queueBtn').addEventListener('click', () => {
            this.toggleQueueDrawer();
        });

        document.getElementById('closeQueueBtn').addEventListener('click', () => {
            this.closeQueueDrawer();
        });

        document.getElementById('playerQueueBtn').addEventListener('click', () => {
            this.openMobileQueue();
        });

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

        document.getElementById('ctxAddToPlaylist').addEventListener('click', () => {
            if (this.contextMenuTrack) {
                this.showAddToPlaylistModal(this.contextMenuTrack);
                this.hideContextMenu();
            }
        });

        document.getElementById('ctxRemoveFromPlaylist').addEventListener('click', () => {
            if (this.contextMenuTrack && this.contextMenuTrackIndex !== null) {
                this.removeTrackFromCurrentPlaylist(this.contextMenuTrackIndex);
                this.hideContextMenu();
            }
        });

        document.getElementById('ctxMoveUp').addEventListener('click', () => {
            if (this.contextMenuTrackIndex !== null && this.contextMenuTrackIndex > 0) {
                this.moveTrackInPlaylist(this.contextMenuTrackIndex, this.contextMenuTrackIndex - 1);
                this.hideContextMenu();
            }
        });

        document.getElementById('ctxMoveDown').addEventListener('click', () => {
            if (this.contextMenuTrack && this.contextMenuTrackIndex !== null) {
                this.moveTrackInPlaylist(this.contextMenuTrackIndex, this.contextMenuTrackIndex + 1);
                this.hideContextMenu();
            }
        });

        document.getElementById('ctxCancel').addEventListener('click', () => {
            this.hideContextMenu();
        });

        document.getElementById('overlay').addEventListener('click', () => {
            this.hideContextMenu();
            this.closeQueueDrawer();
            this.hideAddToPlaylistModal();
            this.hideNewPlaylistModal();
            this.hideEditNameModal();
            this.hideDeleteConfirmModal();
        });

        // Playlist editing modals
        document.getElementById('closeAddToPlaylistBtn').addEventListener('click', () => {
            this.hideAddToPlaylistModal();
        });

        document.getElementById('closeNewPlaylistBtn').addEventListener('click', () => {
            this.hideNewPlaylistModal();
        });

        document.getElementById('newPlaylistForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreatePlaylist();
        });

        document.getElementById('closeEditNameBtn').addEventListener('click', () => {
            this.hideEditNameModal();
        });

        document.getElementById('editNameForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRenamePlaylist();
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.handleDeletePlaylist();
        });

        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            this.hideDeleteConfirmModal();
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
        this.allPlaylists = await NavidromeAPI.getPlaylists();
        this.renderRecentPlaylists(this.allPlaylists.slice(0, 6));
    },

    /**
     * VIEW NAVIGATION
     */
    showView(viewName) {
        document.querySelectorAll('.bottom-nav .nav-item, .sidebar .sidebar-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        const viewMap = {
            'home': 'homeView',
            'playlists': 'playlistsView',
            'songs': 'songsView'
        };

        const viewId = viewMap[viewName];
        if (viewId) {
            document.getElementById(viewId).classList.add('active');
            this.currentView = viewName;
            
            document.getElementById('backBtn').style.display = 'none';
            this.viewHistory = [];

            const titles = {
                'home': 'Music',
                'playlists': 'Library',
                'songs': 'All Songs'
            };
            document.getElementById('headerTitle').textContent = titles[viewName];

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
        this.allPlaylists = await NavidromeAPI.getPlaylists();
        const container = document.getElementById('playlistsGrid');
        
        // Add "Create New Playlist" card
        let html = `
            <div class="card card-create-playlist">
                <div class="card-cover card-cover-create">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="card-title">Create Playlist</div>
                <div class="card-subtitle">Add new playlist</div>
            </div>
        `;

        html += this.allPlaylists.map(p => `
            <div class="card" data-id="${p.id}">
                <div class="card-cover">
                    ${p.image ? `<img src="${p.image}" alt="${p.name}">` : ''}
                </div>
                <div class="card-title">${p.name}</div>
                <div class="card-subtitle">${p.trackCount} tracks</div>
            </div>
        `).join('');

        container.innerHTML = html;

        // Create playlist card
        container.querySelector('.card-create-playlist').addEventListener('click', () => {
            this.showNewPlaylistModal();
        });

        // Existing playlists
        container.querySelectorAll('.card[data-id]').forEach(card => {
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
        this.editingPlaylistId = playlistId;

        if (window.innerWidth < 1024) {
            if (this.viewHistory.length === 0 || this.viewHistory[this.viewHistory.length - 1] !== this.currentView) {
                this.viewHistory.push(this.currentView);
            }
            document.getElementById('backBtn').style.display = 'flex';
        }

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('playlistDetailView').classList.add('active');

        const cover = document.getElementById('playlistCover');
        cover.innerHTML = playlist.image ? `<img src="${playlist.image}">` : '';

        document.getElementById('playlistName').textContent = playlist.name;
        document.getElementById('playlistMeta').textContent = `${playlist.tracks.length} songs`;
        document.getElementById('headerTitle').textContent = playlist.name;

        // Show/hide edit controls based on ownership
        this.renderPlaylistEditControls(playlist);
        this.renderPlaylistTracks(playlist.tracks);

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

    renderPlaylistEditControls(playlist) {
        const actionsContainer = document.querySelector('.playlist-actions');
        
        // Remove existing edit buttons if any
        const existingEditBtns = actionsContainer.querySelectorAll('.btn-edit, .btn-delete');
        existingEditBtns.forEach(btn => btn.remove());

        if (playlist.isOwner) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-edit';
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Name';
            editBtn.onclick = () => this.showEditNameModal(playlist);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-delete';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteBtn.onclick = () => this.showDeleteConfirmModal(playlist);

            actionsContainer.appendChild(editBtn);
            actionsContainer.appendChild(deleteBtn);
        }
    },

    renderPlaylistTracks(tracks) {
        const container = document.getElementById('tracksList');
        container.innerHTML = tracks.map((track, index) => `
            <li class="track-item ${Player.currentTrack && Player.currentTrack.id === track.id ? 'playing' : ''}" 
                data-index="${index}"
                draggable="${this.currentPlaylist?.isOwner ? 'true' : 'false'}">
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
                    this.showContextMenu(e, tracks[index], index);
                } else {
                    if (Player.queue.length === 0 || Player.originalPlaylist !== tracks) {
                        Player.createQueueFromPlaylist(tracks);
                    }
                    Player.playTrackAtIndex(index);
                    this.showMiniPlayer();
                }
            });

            // Drag and drop for reordering (only if owner)
            if (this.currentPlaylist?.isOwner) {
                item.addEventListener('dragstart', (e) => {
                    this.draggedIndex = index;
                    item.classList.add('dragging');
                });

                item.addEventListener('dragend', (e) => {
                    item.classList.remove('dragging');
                    this.draggedIndex = null;
                });

                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    const afterElement = this.getDragAfterElement(container, e.clientY);
                    const dragging = container.querySelector('.dragging');
                    if (afterElement == null) {
                        container.appendChild(dragging);
                    } else {
                        container.insertBefore(dragging, afterElement);
                    }
                });

                item.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    const dropIndex = parseInt(item.dataset.index);
                    if (this.draggedIndex !== null && this.draggedIndex !== dropIndex) {
                        await this.moveTrackInPlaylist(this.draggedIndex, dropIndex);
                    }
                });
            }
        });
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.track-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
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
                <div class="card-menu" data-index="${index}">
                    <i class="fas fa-plus"></i>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.card').forEach((card, index) => {
            const menuBtn = card.querySelector('.card-menu');
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-menu')) {
                    e.stopPropagation();
                    this.showAddToPlaylistModal(songs[index]);
                } else {
                    Player.createQueueFromPlaylist(songs);
                    Player.playTrackAtIndex(index);
                    this.showMiniPlayer();
                }
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
     * PLAYLIST EDITING OPERATIONS
     */
    async removeTrackFromCurrentPlaylist(trackIndex) {
        if (!this.currentPlaylist || !this.currentPlaylist.isOwner) return;

        const success = await NavidromeAPI.removeTrackFromPlaylist(
            this.currentPlaylist.id,
            trackIndex
        );

        if (success) {
            await this.refreshCurrentPlaylist();
        } else {
            alert('Failed to remove track from playlist');
        }
    },

    async moveTrackInPlaylist(fromIndex, toIndex) {
        if (!this.currentPlaylist || !this.currentPlaylist.isOwner) return;
        if (fromIndex === toIndex) return;

        const tracks = [...this.currentPlaylist.tracks];
        const [movedTrack] = tracks.splice(fromIndex, 1);
        tracks.splice(toIndex, 0, movedTrack);

        const trackIds = tracks.map(t => t.id);
        const success = await NavidromeAPI.reorderPlaylistTracks(
            this.currentPlaylist.id,
            trackIds
        );

        if (success) {
            await this.refreshCurrentPlaylist();
        } else {
            alert('Failed to reorder tracks');
        }
    },

    async refreshCurrentPlaylist() {
        if (!this.editingPlaylistId) return;

        const playlist = await NavidromeAPI.getPlaylist(this.editingPlaylistId);
        if (playlist) {
            this.currentPlaylist = playlist;
            document.getElementById('playlistMeta').textContent = `${playlist.tracks.length} songs`;
            this.renderPlaylistTracks(playlist.tracks);
        }
    },

    /**
     * MODALS
     */
    showNewPlaylistModal() {
        document.getElementById('newPlaylistName').value = '';
        document.getElementById('overlay').classList.add('active');
        document.getElementById('newPlaylistModal').classList.add('active');
        document.getElementById('newPlaylistName').focus();
    },

    hideNewPlaylistModal() {
        document.getElementById('overlay').classList.remove('active');
        document.getElementById('newPlaylistModal').classList.remove('active');
    },

    async handleCreatePlaylist() {
        const name = document.getElementById('newPlaylistName').value.trim();
        if (!name) return;

        const playlist = await NavidromeAPI.createPlaylist(name);
        if (playlist) {
            this.hideNewPlaylistModal();
            this.allPlaylists = await NavidromeAPI.getPlaylists();
            await this.showPlaylistDetail(playlist.id);
        } else {
            alert('Failed to create playlist');
        }
    },

    showEditNameModal(playlist) {
        document.getElementById('editPlaylistName').value = playlist.name;
        document.getElementById('overlay').classList.add('active');
        document.getElementById('editNameModal').classList.add('active');
        document.getElementById('editPlaylistName').focus();
    },

    hideEditNameModal() {
        document.getElementById('overlay').classList.remove('active');
        document.getElementById('editNameModal').classList.remove('active');
    },

    async handleRenamePlaylist() {
        const name = document.getElementById('editPlaylistName').value.trim();
        if (!name || !this.currentPlaylist) return;

        const success = await NavidromeAPI.updatePlaylistName(
            this.currentPlaylist.id,
            name
        );

        if (success) {
            this.hideEditNameModal();
            document.getElementById('playlistName').textContent = name;
            document.getElementById('headerTitle').textContent = name;
            this.currentPlaylist.name = name;
            this.allPlaylists = await NavidromeAPI.getPlaylists();
        } else {
            alert('Failed to rename playlist');
        }
    },

    showDeleteConfirmModal(playlist) {
        document.getElementById('deletePlaylistName').textContent = playlist.name;
        document.getElementById('overlay').classList.add('active');
        document.getElementById('deleteConfirmModal').classList.add('active');
    },

    hideDeleteConfirmModal() {
        document.getElementById('overlay').classList.remove('active');
        document.getElementById('deleteConfirmModal').classList.remove('active');
    },

    async handleDeletePlaylist() {
        if (!this.currentPlaylist) return;

        const success = await NavidromeAPI.deletePlaylist(this.currentPlaylist.id);
        
        if (success) {
            this.hideDeleteConfirmModal();
            this.editingPlaylistId = null;
            this.currentPlaylist = null;
            this.allPlaylists = await NavidromeAPI.getPlaylists();
            this.showView('playlists');
        } else {
            alert('Failed to delete playlist');
        }
    },

    showAddToPlaylistModal(track) {
        this.contextMenuTrack = track;
        
        const container = document.getElementById('addToPlaylistList');
        container.innerHTML = this.allPlaylists.filter(p => p.isOwner).map(p => `
            <div class="playlist-select-item" data-id="${p.id}">
                <div class="playlist-select-icon">
                    ${p.image ? `<img src="${p.image}">` : '<i class="fas fa-music"></i>'}
                </div>
                <div class="playlist-select-info">
                    <div class="playlist-select-name">${p.name}</div>
                    <div class="playlist-select-count">${p.trackCount} songs</div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.playlist-select-item').forEach(item => {
            item.addEventListener('click', async () => {
                const playlistId = item.dataset.id;
                await this.addTrackToPlaylist(track, playlistId);
            });
        });

        document.getElementById('overlay').classList.add('active');
        document.getElementById('addToPlaylistModal').classList.add('active');
    },

    hideAddToPlaylistModal() {
        document.getElementById('overlay').classList.remove('active');
        document.getElementById('addToPlaylistModal').classList.remove('active');
        this.contextMenuTrack = null;
    },

    async addTrackToPlaylist(track, playlistId) {
        const success = await NavidromeAPI.addTracksToPlaylist(playlistId, [track.id]);
        
        if (success) {
            this.hideAddToPlaylistModal();
            
            if (this.editingPlaylistId === playlistId) {
                await this.refreshCurrentPlaylist();
            }
            
            this.allPlaylists = await NavidromeAPI.getPlaylists();
        } else {
            alert('Failed to add track to playlist');
        }
    },

    /**
     * PLAYER UI UPDATES
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
            document.getElementById('miniPlayerTitle').textContent = 'No track';
            document.getElementById('miniPlayerArtist').textContent = 'Select a song';
            document.getElementById('miniPlayerCover').innerHTML = '';
            
            document.getElementById('playerTitle').textContent = 'No track playing';
            document.getElementById('playerArtist').textContent = 'Select a song';
            document.getElementById('playerArtwork').innerHTML = '';
            
            document.getElementById('desktopPlayerTitle').textContent = 'No track';
            document.getElementById('desktopPlayerArtist').textContent = 'Select a song';
            document.getElementById('desktopPlayerCover').innerHTML = '';
            return;
        }

        document.getElementById('miniPlayerTitle').textContent = track.name;
        document.getElementById('miniPlayerArtist').textContent = track.artist.name;
        document.getElementById('miniPlayerCover').innerHTML = track.album.image ? `<img src="${track.album.image}">` : '';

        document.getElementById('playerTitle').textContent = track.name;
        document.getElementById('playerArtist').textContent = track.artist.name;
        document.getElementById('playerArtwork').innerHTML = track.album.image ? `<img src="${track.album.image}">` : '';

        document.getElementById('desktopPlayerTitle').textContent = track.name;
        document.getElementById('desktopPlayerArtist').textContent = track.artist.name;
        document.getElementById('desktopPlayerCover').innerHTML = track.album.image ? `<img src="${track.album.image}">` : '';
    },

    updateAllProgress(percent, current, total) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('timeCurrent').textContent = Player.formatTime(current);
        document.getElementById('timeTotal').textContent = Player.formatTime(total);

        document.getElementById('desktopProgressFill').style.width = `${percent}%`;
        document.getElementById('desktopTimeCurrent').textContent = Player.formatTime(current);
        document.getElementById('desktopTimeTotal').textContent = Player.formatTime(total);
    },

    updateShuffleButtons() {
        const mobileBtn = document.getElementById('shuffleBtn');
        mobileBtn.classList.toggle('active', Player.isShuffled);

        const desktopBtn = document.getElementById('desktopShuffleBtn');
        desktopBtn.classList.toggle('active', Player.isShuffled);
    },

    updateLoopButtons() {
        const mobileBtn = document.getElementById('loopBtn');
        const mobileIcon = mobileBtn.querySelector('i');
        mobileBtn.classList.toggle('active', Player.loopMode !== 'off');
        mobileIcon.className = Player.loopMode === 'one' ? 'fas fa-redo-alt' : 'fas fa-redo';

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
        
        if (Player.currentIndex >= 0 && Player.currentIndex < Player.queue.length) {
            html += '<div class="queue-section-title">Now Playing</div>';
            const track = Player.queue[Player.currentIndex];
            html += this.renderQueueItem(track, Player.currentIndex, true);
        }
        
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
        
        if (Player.currentIndex >= 0 && Player.currentIndex < Player.queue.length) {
            html += '<div class="queue-section-title">Now Playing</div>';
            const track = Player.queue[Player.currentIndex];
            html += this.renderQueueItem(track, Player.currentIndex, true);
        }
        
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
        container.querySelectorAll('.queue-item').forEach(item => {
            const index = parseInt(item.dataset.index);
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.queue-item-remove')) {
                    Player.playTrackAtIndex(index);
                }
            });
        });

        container.querySelectorAll('.queue-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.remove);
                Player.removeFromQueue(index);
                
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
    showContextMenu(event, track, trackIndex = null) {
        event.stopPropagation();
        this.contextMenuTrack = track;
        this.contextMenuTrackIndex = trackIndex;

        // Show/hide playlist-specific options
        const isInPlaylist = this.currentPlaylist && trackIndex !== null;
        document.getElementById('ctxRemoveFromPlaylist').style.display = 
            isInPlaylist && this.currentPlaylist.isOwner ? 'flex' : 'none';
        document.getElementById('ctxMoveUp').style.display = 
            isInPlaylist && this.currentPlaylist.isOwner && trackIndex > 0 ? 'flex' : 'none';
        document.getElementById('ctxMoveDown').style.display = 
            isInPlaylist && this.currentPlaylist.isOwner && trackIndex < this.currentPlaylist.tracks.length - 1 ? 'flex' : 'none';

        document.getElementById('overlay').classList.add('active');
        document.getElementById('contextMenu').classList.add('active');
    },

    hideContextMenu() {
        document.getElementById('overlay').classList.remove('active');
        document.getElementById('contextMenu').classList.remove('active');
        this.contextMenuTrack = null;
        this.contextMenuTrackIndex = null;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
    UI.init();
}
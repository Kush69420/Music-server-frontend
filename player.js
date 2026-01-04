/**
 * PLAYER.JS - Playback & Queue Management
 * Enhanced for Responsive Design
 * 
 * CRITICAL RULES:
 * 1. Queue is INDEPENDENT of playlist
 * 2. Playlist order is NEVER modified
 * 3. Shuffle affects QUEUE ONLY (not playlist)
 * 4. Playback continues even if UI navigates
 */

const Player = {
    // Playback state
    audio: document.getElementById('audioPlayer'),
    currentTrack: null,
    isPlaying: false,
    
    // Queue state
    originalPlaylist: [],
    queue: [],
    currentIndex: -1,
    
    // Playback modes
    isShuffled: false,
    loopMode: 'off',

    /**
     * Initialize player
     */
    init() {
        this.audio.volume = 0.8;
        this.setupAudioEvents();
    },

    /**
     * Setup audio element event listeners
     */
    setupAudioEvents() {
        this.audio.addEventListener('timeupdate', () => {
            this.onTimeUpdate();
        });

        this.audio.addEventListener('ended', () => {
            this.onTrackEnded();
        });

        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayPauseButtons();
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseButtons();
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
        });
    },

    /**
     * QUEUE MANAGEMENT
     */

    createQueueFromPlaylist(tracks) {
        this.originalPlaylist = [...tracks];
        this.queue = [...tracks];
        this.currentIndex = 0;
        this.isShuffled = false;
    },

    createShuffledQueue(tracks) {
        this.originalPlaylist = [...tracks];
        this.queue = this.shuffleArray([...tracks]);
        this.currentIndex = 0;
        this.isShuffled = true;
    },

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    toggleShuffle() {
        if (this.queue.length === 0) return;

        if (!this.isShuffled) {
            const currentTrack = this.queue[this.currentIndex];
            this.queue = this.shuffleArray([...this.originalPlaylist]);
            
            if (currentTrack) {
                this.currentIndex = this.queue.findIndex(t => t.id === currentTrack.id);
            }
            this.isShuffled = true;
        } else {
            const currentTrack = this.queue[this.currentIndex];
            this.queue = [...this.originalPlaylist];
            
            if (currentTrack) {
                this.currentIndex = this.queue.findIndex(t => t.id === currentTrack.id);
            }
            this.isShuffled = false;
        }

        if (typeof UI !== 'undefined') {
            UI.updateShuffleButtons();
            // Update both desktop and mobile queue
            if (window.innerWidth >= 1024) {
                const drawer = document.getElementById('queueDrawer');
                if (drawer && drawer.classList.contains('active')) {
                    UI.renderQueue();
                }
            } else {
                const mobileQueue = document.getElementById('mobileQueueOverlay');
                if (mobileQueue && mobileQueue.classList.contains('active')) {
                    UI.renderMobileQueue();
                }
            }
        }
    },

    toggleLoop() {
        if (this.loopMode === 'off') {
            this.loopMode = 'all';
        } else if (this.loopMode === 'all') {
            this.loopMode = 'one';
        } else {
            this.loopMode = 'off';
        }
        if (typeof UI !== 'undefined') {
            UI.updateLoopButtons();
        }
    },

    /**
     * PLAYBACK CONTROLS
     */

    playTrackAtIndex(index) {
        if (index < 0 || index >= this.queue.length) return;

        this.currentIndex = index;
        const track = this.queue[index];
        this.currentTrack = track;

        this.audio.src = NavidromeAPI.getStreamUrl(track.id);
        this.audio.play().catch(err => console.error('Play error:', err));

        if (typeof UI !== 'undefined') {
            UI.updateAllPlayerInfo(track);
            // Update both desktop and mobile queue
            if (window.innerWidth >= 1024) {
                const drawer = document.getElementById('queueDrawer');
                if (drawer && drawer.classList.contains('active')) {
                    UI.renderQueue();
                }
            } else {
                const mobileQueue = document.getElementById('mobileQueueOverlay');
                if (mobileQueue && mobileQueue.classList.contains('active')) {
                    UI.renderMobileQueue();
                }
            }
        }
    },

    togglePlayPause() {
        if (this.currentIndex === -1 && this.queue.length > 0) {
            this.playTrackAtIndex(0);
            return;
        }

        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play();
        }
    },

    playNext() {
        if (this.loopMode === 'one') {
            this.audio.currentTime = 0;
            this.audio.play();
            return;
        }

        if (this.currentIndex < this.queue.length - 1) {
            this.playTrackAtIndex(this.currentIndex + 1);
        } else if (this.loopMode === 'all') {
            this.playTrackAtIndex(0);
        }
    },

    onTrackEnded() {
        this.playNext();
    },

    playPrevious() {
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
        } else if (this.currentIndex > 0) {
            this.playTrackAtIndex(this.currentIndex - 1);
        } else if (this.loopMode === 'all') {
            this.playTrackAtIndex(this.queue.length - 1);
        }
    },

    /**
     * QUEUE MANIPULATION
     */

    addTrackPlayNext(track) {
        const insertIndex = this.currentIndex + 1;
        this.queue.splice(insertIndex, 0, track);
        if (typeof UI !== 'undefined') {
            // Update the appropriate queue view
            if (window.innerWidth >= 1024) {
                const drawer = document.getElementById('queueDrawer');
                if (drawer && drawer.classList.contains('active')) {
                    UI.renderQueue();
                }
            } else {
                const mobileQueue = document.getElementById('mobileQueueOverlay');
                if (mobileQueue && mobileQueue.classList.contains('active')) {
                    UI.renderMobileQueue();
                }
            }
        }
    },

    addToQueue(track) {
        this.queue.push(track);
        if (typeof UI !== 'undefined') {
            // Update the appropriate queue view
            if (window.innerWidth >= 1024) {
                const drawer = document.getElementById('queueDrawer');
                if (drawer && drawer.classList.contains('active')) {
                    UI.renderQueue();
                }
            } else {
                const mobileQueue = document.getElementById('mobileQueueOverlay');
                if (mobileQueue && mobileQueue.classList.contains('active')) {
                    UI.renderMobileQueue();
                }
            }
        }
    },

    removeFromQueue(index) {
        if (index === this.currentIndex) {
            this.queue.splice(index, 1);
            if (this.queue.length > 0) {
                if (index >= this.queue.length) {
                    this.currentIndex = this.queue.length - 1;
                }
                this.playTrackAtIndex(this.currentIndex);
            } else {
                this.stop();
            }
        } else {
            if (index < this.currentIndex) {
                this.currentIndex--;
            }
            this.queue.splice(index, 1);
        }
        // UI will re-render from the UI component after this
    },

    stop() {
        this.audio.pause();
        this.audio.src = '';
        this.currentTrack = null;
        this.currentIndex = -1;
        if (typeof UI !== 'undefined') {
            UI.updateAllPlayerInfo(null);
        }
    },

    seek(percent) {
        if (this.audio.duration) {
            this.audio.currentTime = percent * this.audio.duration;
        }
    },

    setVolume(volume) {
        this.audio.volume = Math.max(0, Math.min(1, volume));
    },

    /**
     * UI UPDATE CALLBACKS - Enhanced for responsive design
     */

    onTimeUpdate() {
        if (this.audio.duration && typeof UI !== 'undefined') {
            const percent = (this.audio.currentTime / this.audio.duration) * 100;
            UI.updateAllProgress(percent, this.audio.currentTime, this.audio.duration);
        }
    },

    updatePlayPauseButtons() {
        // Mobile full player
        const mobileBtn = document.getElementById('playPauseBtn');
        if (mobileBtn) {
            const icon = mobileBtn.querySelector('i');
            if (icon) {
                icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
        }

        // Mobile mini player
        const miniBtn = document.getElementById('miniPlayPauseBtn');
        if (miniBtn) {
            const icon = miniBtn.querySelector('i');
            if (icon) {
                icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
        }

        // Desktop player bar
        const desktopBtn = document.getElementById('desktopPlayPauseBtn');
        if (desktopBtn) {
            const icon = desktopBtn.querySelector('i');
            if (icon) {
                icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
        }
    },

    /**
     * FORMAT HELPERS
     */

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// Initialize player on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Player.init());
} else {
    Player.init();
}
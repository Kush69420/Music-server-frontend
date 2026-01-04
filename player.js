/**
 * PLAYER.JS - Playback & Queue Management
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
    originalPlaylist: [],    // Original playlist order (IMMUTABLE)
    queue: [],              // Active playback queue (can be shuffled)
    currentIndex: -1,
    
    // Playback modes
    isShuffled: false,
    loopMode: 'off',       // 'off', 'all', 'one'

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
            this.updatePlayPauseButton();
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
        });
    },

    /**
     * QUEUE MANAGEMENT
     * 
     * Rule: Queue is separate from playlist
     * Playlist order NEVER changes
     */

    /**
     * Create queue from playlist (normal play)
     */
    createQueueFromPlaylist(tracks) {
        // Store original order (IMMUTABLE)
        this.originalPlaylist = [...tracks];
        
        // Create queue as copy
        this.queue = [...tracks];
        
        // Reset state
        this.currentIndex = 0;
        this.isShuffled = false;
    },

    /**
     * Create shuffled queue from playlist
     */
    createShuffledQueue(tracks) {
        // Store original order (IMMUTABLE)
        this.originalPlaylist = [...tracks];
        
        // Create shuffled queue
        this.queue = this.shuffleArray([...tracks]);
        
        // Reset state
        this.currentIndex = 0;
        this.isShuffled = true;
    },

    /**
     * Fisher-Yates shuffle algorithm
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    /**
     * Toggle shuffle mode
     */
    toggleShuffle() {
        if (this.queue.length === 0) return;

        if (!this.isShuffled) {
            // Enable shuffle
            const currentTrack = this.queue[this.currentIndex];
            this.queue = this.shuffleArray([...this.originalPlaylist]);
            
            // Find current track in new shuffle
            if (currentTrack) {
                this.currentIndex = this.queue.findIndex(t => t.id === currentTrack.id);
            }
            this.isShuffled = true;
        } else {
            // Disable shuffle - restore original order
            const currentTrack = this.queue[this.currentIndex];
            this.queue = [...this.originalPlaylist];
            
            // Find current track in original order
            if (currentTrack) {
                this.currentIndex = this.queue.findIndex(t => t.id === currentTrack.id);
            }
            this.isShuffled = false;
        }

        if (typeof UI !== 'undefined') {
            UI.updateShuffleButton();
            UI.renderQueue();
        }
    },

    /**
     * Toggle loop mode
     */
    toggleLoop() {
        if (this.loopMode === 'off') {
            this.loopMode = 'all';
        } else if (this.loopMode === 'all') {
            this.loopMode = 'one';
        } else {
            this.loopMode = 'off';
        }
        if (typeof UI !== 'undefined') {
            UI.updateLoopButton();
        }
    },

    /**
     * PLAYBACK CONTROLS
     */

    /**
     * Play track at queue index
     */
    playTrackAtIndex(index) {
        if (index < 0 || index >= this.queue.length) return;

        this.currentIndex = index;
        const track = this.queue[index];
        this.currentTrack = track;

        // Set audio source
        this.audio.src = NavidromeAPI.getStreamUrl(track.id);
        this.audio.play().catch(err => console.error('Play error:', err));

        // Update UI
        if (typeof UI !== 'undefined') {
            UI.updatePlayerInfo(track);
            UI.renderQueue();
        }
    },

    /**
     * Toggle play/pause
     */
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

    /**
     * Play next track (called by next button)
     */
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

    /**
     * Called when track ends naturally
     */
    onTrackEnded() {
        this.playNext();
    },

    /**
     * Play previous track
     */
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

    /**
     * Add track to play next
     */
    addTrackPlayNext(track) {
        const insertIndex = this.currentIndex + 1;
        this.queue.splice(insertIndex, 0, track);
        if (typeof UI !== 'undefined') {
            UI.renderQueue();
        }
    },

    /**
     * Add track to end of queue
     */
    addToQueue(track) {
        this.queue.push(track);
        if (typeof UI !== 'undefined') {
            UI.renderQueue();
        }
    },

    /**
     * Remove track from queue
     */
    removeFromQueue(index) {
        if (index === this.currentIndex) {
            // Removing current track
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
        if (typeof UI !== 'undefined') {
            UI.renderQueue();
        }
    },

    /**
     * Stop playback
     */
    stop() {
        this.audio.pause();
        this.audio.src = '';
        this.currentTrack = null;
        this.currentIndex = -1;
        if (typeof UI !== 'undefined') {
            UI.updatePlayerInfo(null);
        }
    },

    /**
     * Seek to position
     */
    seek(percent) {
        if (this.audio.duration) {
            this.audio.currentTime = percent * this.audio.duration;
        }
    },

    /**
     * Set volume (0-1)
     */
    setVolume(volume) {
        this.audio.volume = Math.max(0, Math.min(1, volume));
    },

    /**
     * UI UPDATE CALLBACKS
     */

    onTimeUpdate() {
        if (this.audio.duration && typeof UI !== 'undefined') {
            const percent = (this.audio.currentTime / this.audio.duration) * 100;
            UI.updateProgress(percent, this.audio.currentTime, this.audio.duration);
        }
    },

    updatePlayPauseButton() {
        const btn = document.getElementById('playPauseBtn');
        if (btn) {
            const icon = btn.querySelector('i');
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
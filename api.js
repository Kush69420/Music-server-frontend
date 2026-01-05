/**
 * API.JS - Navidrome API Integration & Data Mapping
 * Enhanced with Playlist Editing Capabilities
 * 
 * This module handles:
 * 1. Navidrome authentication (token-based)
 * 2. All /rest/... API calls
 * 3. Data mapping from Navidrome to Spotify-like structure
 * 4. Server URL persistence via localStorage
 * 5. Playlist CRUD operations
 * 
 * RULES:
 * - DO NOT modify authentication logic
 * - DO NOT change /rest/... endpoints
 * - Keep streaming logic intact
 */

const NavidromeAPI = {
    // Authentication state
    serverUrl: '',
    username: '',
    token: '',
    salt: '',

    /**
     * Load saved server URL from localStorage
     */
    loadSavedServerUrl() {
        return localStorage.getItem('navidrome_server_url');
    },

    /**
     * Save server URL to localStorage
     */
    saveServerUrl(url) {
        localStorage.setItem('navidrome_server_url', url);
    },

    /**
     * Clear saved server URL (for logout/reset)
     */
    clearSavedServerUrl() {
        localStorage.removeItem('navidrome_server_url');
    },

    /**
     * Generate random salt for MD5 authentication
     */
    generateSalt() {
        return Math.random().toString(36).substring(2, 15);
    },

    /**
     * Generate MD5 token from password + salt
     */
    generateToken(password, salt) {
        return SparkMD5.hash(password + salt);
    },

    /**
     * Build Navidrome API URL with authentication params
     */
    buildUrl(endpoint, params = {}) {
        const url = new URL(`${this.serverUrl}/rest${endpoint}`);
        url.searchParams.append('u', this.username);
        url.searchParams.append('t', this.token);
        url.searchParams.append('s', this.salt);
        url.searchParams.append('v', '1.16.1');
        url.searchParams.append('c', 'WebPlayer');
        url.searchParams.append('f', 'json');
        
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });
        
        return url.toString();
    },

    /**
     * Test connection and authenticate
     */
    async connect(serverUrl, username, password) {
        try {
            console.log('Connecting to:', serverUrl);
            this.serverUrl = serverUrl;
            this.username = username;
            this.salt = this.generateSalt();
            this.token = this.generateToken(password, this.salt);

            const url = this.buildUrl('/ping');
            const response = await fetch(url);
            const data = await response.json();

            const success = data['subsonic-response'].status === 'ok';
            
            if (success) {
                console.log('Connection successful, saving URL to localStorage');
                this.saveServerUrl(serverUrl);
            } else {
                console.log('Connection failed, status:', data['subsonic-response'].status);
            }
            
            return success;
        } catch (error) {
            console.error('Connection error:', error);
            return false;
        }
    },

    /**
     * DATA MAPPING - Navidrome to Spotify structure
     */
    
    mapTrack(navidromeTrack) {
        return {
            id: navidromeTrack.id,
            name: navidromeTrack.title,
            artist: {
                name: navidromeTrack.artist || 'Unknown Artist'
            },
            album: {
                name: navidromeTrack.album || 'Unknown Album',
                image: navidromeTrack.coverArt ? this.getCoverArtUrl(navidromeTrack.coverArt) : null
            },
            duration_ms: (navidromeTrack.duration || 0) * 1000,
            _original: navidromeTrack
        };
    },

    mapPlaylist(navidromePlaylist) {
        return {
            id: navidromePlaylist.id,
            name: navidromePlaylist.name,
            image: navidromePlaylist.coverArt ? this.getCoverArtUrl(navidromePlaylist.coverArt) : null,
            trackCount: navidromePlaylist.songCount || 0,
            owner: navidromePlaylist.owner || this.username,
            isOwner: navidromePlaylist.owner === this.username || !navidromePlaylist.owner,
            tracks: []
        };
    },

    /**
     * API METHODS - Reading
     */

    async getPlaylists() {
        try {
            const url = this.buildUrl('/getPlaylists');
            const response = await fetch(url);
            const data = await response.json();

            if (data['subsonic-response'].status === 'ok') {
                const playlists = data['subsonic-response'].playlists?.playlist || [];
                return playlists.map(p => this.mapPlaylist(p));
            }
            return [];
        } catch (error) {
            console.error('Error fetching playlists:', error);
            return [];
        }
    },

    async getPlaylist(playlistId) {
        try {
            const url = this.buildUrl('/getPlaylist', { id: playlistId });
            const response = await fetch(url);
            const data = await response.json();

            if (data['subsonic-response'].status === 'ok') {
                const playlist = data['subsonic-response'].playlist;
                const mapped = this.mapPlaylist(playlist);
                mapped.tracks = (playlist.entry || []).map(t => this.mapTrack(t));
                return mapped;
            }
            return null;
        } catch (error) {
            console.error('Error fetching playlist:', error);
            return null;
        }
    },

    async getSongs(size = 500) {
        try {
            const url = this.buildUrl('/getRandomSongs', { size });
            const response = await fetch(url);
            const data = await response.json();

            if (data['subsonic-response'].status === 'ok') {
                const songs = data['subsonic-response'].randomSongs?.song || [];
                return songs.map(s => this.mapTrack(s));
            }
            return [];
        } catch (error) {
            console.error('Error fetching songs:', error);
            return [];
        }
    },

    async searchSongs(query) {
        try {
            const url = this.buildUrl('/search3', { query });
            const response = await fetch(url);
            const data = await response.json();

            if (data['subsonic-response'].status === 'ok') {
                const songs = data['subsonic-response'].searchResult3?.song || [];
                return songs.map(s => this.mapTrack(s));
            }
            return [];
        } catch (error) {
            console.error('Error searching songs:', error);
            return [];
        }
    },

    /**
     * PLAYLIST EDITING API METHODS
     */

    /**
     * Create a new playlist
     * @param {string} name - Playlist name
     * @returns {Promise<Object|null>} Created playlist or null on error
     */
    async createPlaylist(name) {
        try {
            const url = this.buildUrl('/createPlaylist', { name });
            const response = await fetch(url);
            const data = await response.json();

            if (data['subsonic-response'].status === 'ok') {
                const playlist = data['subsonic-response'].playlist;
                return this.mapPlaylist(playlist);
            }
            return null;
        } catch (error) {
            console.error('Error creating playlist:', error);
            return null;
        }
    },

    /**
     * Update playlist name
     * @param {string} playlistId - Playlist ID
     * @param {string} name - New name
     * @returns {Promise<boolean>} Success status
     */
    async updatePlaylistName(playlistId, name) {
        try {
            const url = this.buildUrl('/updatePlaylist', { 
                playlistId, 
                name 
            });
            const response = await fetch(url);
            const data = await response.json();

            return data['subsonic-response'].status === 'ok';
        } catch (error) {
            console.error('Error updating playlist name:', error);
            return false;
        }
    },

    /**
     * Add tracks to playlist
     * @param {string} playlistId - Playlist ID
     * @param {Array<string>} trackIds - Track IDs to add
     * @returns {Promise<boolean>} Success status
     */
    async addTracksToPlaylist(playlistId, trackIds) {
        try {
            const params = { playlistId };
            trackIds.forEach(id => {
                params.songIdToAdd = id;
            });

            const url = this.buildUrl('/updatePlaylist', params);
            const response = await fetch(url);
            const data = await response.json();

            return data['subsonic-response'].status === 'ok';
        } catch (error) {
            console.error('Error adding tracks to playlist:', error);
            return false;
        }
    },

    /**
     * Remove track from playlist by index
     * @param {string} playlistId - Playlist ID
     * @param {number} trackIndex - Index of track to remove (0-based)
     * @returns {Promise<boolean>} Success status
     */
    async removeTrackFromPlaylist(playlistId, trackIndex) {
        try {
            const url = this.buildUrl('/updatePlaylist', { 
                playlistId, 
                songIndexToRemove: trackIndex 
            });
            const response = await fetch(url);
            const data = await response.json();

            return data['subsonic-response'].status === 'ok';
        } catch (error) {
            console.error('Error removing track from playlist:', error);
            return false;
        }
    },

    /**
     * Reorder tracks in playlist
     * @param {string} playlistId - Playlist ID
     * @param {Array<string>} trackIds - Complete ordered list of track IDs
     * @returns {Promise<boolean>} Success status
     */
    async reorderPlaylistTracks(playlistId, trackIds) {
        try {
            // First, get current playlist to know all tracks
            const currentPlaylist = await this.getPlaylist(playlistId);
            if (!currentPlaylist) return false;

            // Remove all tracks
            for (let i = currentPlaylist.tracks.length - 1; i >= 0; i--) {
                await this.removeTrackFromPlaylist(playlistId, i);
            }

            // Add tracks in new order
            for (const trackId of trackIds) {
                await this.addTracksToPlaylist(playlistId, [trackId]);
            }

            return true;
        } catch (error) {
            console.error('Error reordering playlist tracks:', error);
            return false;
        }
    },

    /**
     * Delete a playlist
     * @param {string} playlistId - Playlist ID
     * @returns {Promise<boolean>} Success status
     */
    async deletePlaylist(playlistId) {
        try {
            const url = this.buildUrl('/deletePlaylist', { id: playlistId });
            const response = await fetch(url);
            const data = await response.json();

            return data['subsonic-response'].status === 'ok';
        } catch (error) {
            console.error('Error deleting playlist:', error);
            return false;
        }
    },

    /**
     * Get stream URL for track (DO NOT MODIFY)
     */
    getStreamUrl(trackId) {
        return this.buildUrl('/stream', { id: trackId });
    },

    /**
     * Get cover art URL (DO NOT MODIFY)
     */
    getCoverArtUrl(coverArtId, size = 200) {
        return this.buildUrl('/getCoverArt', { id: coverArtId, size });
    }
};
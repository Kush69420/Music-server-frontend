/**
 * API.JS - Navidrome API Integration & Data Mapping
 * 
 * This module handles:
 * 1. Navidrome authentication (token-based)
 * 2. All /rest/... API calls
 * 3. Data mapping from Navidrome to Spotify-like structure
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
            this.serverUrl = serverUrl;
            this.username = username;
            this.salt = this.generateSalt();
            this.token = this.generateToken(password, this.salt);

            const url = this.buildUrl('/ping');
            const response = await fetch(url);
            const data = await response.json();

            return data['subsonic-response'].status === 'ok';
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
            _original: navidromeTrack // Keep original for reference
        };
    },

    mapPlaylist(navidromePlaylist) {
        return {
            id: navidromePlaylist.id,
            name: navidromePlaylist.name,
            image: navidromePlaylist.coverArt ? this.getCoverArtUrl(navidromePlaylist.coverArt) : null,
            trackCount: navidromePlaylist.songCount || 0,
            tracks: []
        };
    },

    /**
     * API METHODS
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
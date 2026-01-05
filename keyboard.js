/**
 * KEYBOARD.JS - Desktop Keyboard Shortcuts
 * 
 * Keyboard shortcuts for desktop/laptop users:
 * - Spacebar: Toggle Play/Pause
 * - Ctrl + Right Arrow: Next Track
 * - Ctrl + Left Arrow: Previous Track
 * 
 * RULES:
 * - Shortcuts disabled when typing in input/textarea
 * - Spacebar prevents page scrolling
 * - Only active on desktop (irrelevant on mobile)
 */

const KeyboardShortcuts = {
    /**
     * Initialize keyboard shortcuts
     */
    init() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    },

    /**
     * Check if user is currently typing in an input field
     */
    isTyping() {
        const activeElement = document.activeElement;
        const tagName = activeElement.tagName.toLowerCase();
        
        // Check if focused on input, textarea, or contenteditable
        if (tagName === 'input' || tagName === 'textarea') {
            return true;
        }
        
        if (activeElement.isContentEditable) {
            return true;
        }
        
        return false;
    },

    /**
     * Handle keyboard events
     */
    handleKeyPress(e) {
        // Ignore if user is typing
        if (this.isTyping()) {
            return;
        }

        // Spacebar - Toggle Play/Pause
        if (e.code === 'Space') {
            e.preventDefault(); // Prevent page scrolling
            Player.togglePlayPause();
            return;
        }

        // Ctrl + Right Arrow - Next Track
        if (e.ctrlKey && e.code === 'ArrowRight') {
            e.preventDefault();
            Player.playNext();
            return;
        }

        // Ctrl + Left Arrow - Previous Track
        if (e.ctrlKey && e.code === 'ArrowLeft') {
            e.preventDefault();
            Player.playPrevious();
            return;
        }
    }
};

// Initialize keyboard shortcuts on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KeyboardShortcuts.init());
} else {
    KeyboardShortcuts.init();
}
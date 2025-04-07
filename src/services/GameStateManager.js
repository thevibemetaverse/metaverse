/**
 * Central manager for game state that controls when gameplay is active
 * and when UI interactions should take priority
 */
class GameStateManager {
  constructor() {
    this.currentState = 'playing'; // Default state: 'playing', 'form-open', 'menu', etc.
    this.listeners = new Map();
    this.gameCanvas = null;
    
    console.log('[GameStateManager] Initialized with default state:', this.currentState);
    
    // Bind methods
    this.disableGameInteractions = this.disableGameInteractions.bind(this);
    this.enableGameInteractions = this.enableGameInteractions.bind(this);
  }
  
  /**
   * Get the current game state
   * @returns {string} The current game state
   */
  getCurrentState() {
    return this.currentState;
  }
  
  /**
   * Set the game state and notify listeners
   * @param {string} newState - The new state to set
   */
  setState(newState) {
    const oldState = this.currentState;
    this.currentState = newState;
    
    console.log(`[GameStateManager] State changed from '${oldState}' to '${newState}'`);
    
    // Handle specific state transitions
    if (newState === 'form-open') {
      this.disableGameInteractions();
    } else if (oldState === 'form-open' && newState === 'playing') {
      this.enableGameInteractions();
    }
    
    // Notify all listeners of the state change
    if (this.listeners.has('stateChange')) {
      this.listeners.get('stateChange').forEach(callback => {
        callback(newState, oldState);
      });
    }
  }
  
  /**
   * Register a callback to be called when the state changes
   * @param {function} callback - Function to call on state change
   */
  onStateChange(callback) {
    if (!this.listeners.has('stateChange')) {
      this.listeners.set('stateChange', []);
    }
    this.listeners.get('stateChange').push(callback);
  }
  
  /**
   * Set the game canvas element reference
   * @param {HTMLElement} canvas - The game canvas element
   */
  setGameCanvas(canvas) {
    this.gameCanvas = canvas;
  }
  
  /**
   * Disable game interactions when in form or menu mode
   */
  disableGameInteractions() {
    console.log('[GameStateManager] Disabling game interactions');
    
    // If canvas is available, disable its pointer events
    if (this.gameCanvas) {
      this.gameCanvas.style.pointerEvents = 'none';
    }
    
    // Find and disable any Three.js renderers
    const renderers = document.querySelectorAll('canvas');
    renderers.forEach(renderer => {
      renderer.style.pointerEvents = 'none';
    });
    
    // Add an overlay to catch all interactions
    const existingOverlay = document.getElementById('game-interaction-overlay');
    if (!existingOverlay) {
      const overlay = document.createElement('div');
      overlay.id = 'game-interaction-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'transparent';
      overlay.style.zIndex = '99999'; // Just below the form z-index
      overlay.style.pointerEvents = 'auto';
      document.body.appendChild(overlay);
    }
  }
  
  /**
   * Enable game interactions when returning to playing mode
   */
  enableGameInteractions() {
    console.log('[GameStateManager] Enabling game interactions');
    
    // If canvas is available, enable its pointer events
    if (this.gameCanvas) {
      this.gameCanvas.style.pointerEvents = 'auto';
    }
    
    // Find and enable any Three.js renderers
    const renderers = document.querySelectorAll('canvas');
    renderers.forEach(renderer => {
      renderer.style.pointerEvents = 'auto';
    });
    
    // Remove the interaction overlay
    const overlay = document.getElementById('game-interaction-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
  
  /**
   * Check if the current state is the playing state
   * @returns {boolean} True if currently in the playing state
   */
  isPlaying() {
    return this.currentState === 'playing';
  }
  
  /**
   * Convenience method to set state to playing
   */
  setPlaying() {
    this.setState('playing');
  }
  
  /**
   * Convenience method to set state to form-open
   */
  setFormOpen() {
    this.setState('form-open');
  }
}

export default GameStateManager; 
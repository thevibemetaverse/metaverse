/**
 * Central manager for game state that controls when gameplay is active
 * and when UI interactions should take priority
 */
class GameStateManager {
  constructor() {
    this.currentState = 'playing'; // Default state: 'playing', 'form-open', 'menu', etc.
    this.listeners = new Map();
    
    console.log('[GameStateManager] Initialized with default state:', this.currentState);
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
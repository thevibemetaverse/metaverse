export class InteractionEvents {
  constructor() {
    this.listeners = new Map();
  }
  
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
  }
  
  removeEventListener(type, callback) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(callback);
    }
  }
  
  dispatchEvent(event) {
    if (this.listeners.has(event.type)) {
      this.listeners.get(event.type).forEach(callback => {
        callback(event);
      });
    }
  }
  
  // Convenience methods for common events
  onObjectClicked(callback) {
    this.addEventListener('objectClicked', callback);
  }
  
  onObjectHovered(callback) {
    this.addEventListener('objectHovered', callback);
  }
  
  onObjectHoverExit(callback) {
    this.addEventListener('objectHoverExit', callback);
  }
} 
// ChatInput.js
// Handles the input UI when "T" is pressed

export class ChatInput {
  constructor(chatManager) {
    this.chatManager = chatManager;
    this.inputElement = null;
    this.containerElement = null;
    
    // Create UI elements
    this.createElements();
  }
  
  createElements() {
    // Create container div for chat input
    this.containerElement = document.createElement('div');
    this.containerElement.className = 'chat-input-container';
    Object.assign(this.containerElement.style, {
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '80%',
      maxWidth: '600px',
      display: 'none',
      zIndex: '1000',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '4px',
      padding: '10px'
    });
    
    // Create input element
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.className = 'chat-input';
    this.inputElement.placeholder = 'Type your message...';
    Object.assign(this.inputElement.style, {
      width: '100%',
      padding: '8px',
      border: 'none',
      borderRadius: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      color: '#333',
      fontSize: '16px'
    });
    
    // Handle enter key press
    this.inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const text = this.inputElement.value.trim();
        if (text) {
          this.chatManager.sendMessage(text);
          this.inputElement.value = '';
        }
      }
    });
    
    // Prevent keyboard events from propagating to game controls
    this.inputElement.addEventListener('keydown', (event) => {
      event.stopPropagation();
    });
    
    // Add input to container
    this.containerElement.appendChild(this.inputElement);
    
    // Add container to document
    document.body.appendChild(this.containerElement);
  }
  
  show() {
    if (this.containerElement) {
      this.containerElement.style.display = 'block';
      // Focus input after a short delay to ensure it works
      setTimeout(() => {
        this.inputElement.focus();
      }, 50);
    }
  }
  
  hide() {
    if (this.containerElement) {
      this.containerElement.style.display = 'none';
      this.inputElement.blur();
      this.inputElement.value = '';
    }
  }
} 
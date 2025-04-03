class VoiceUI {
  constructor(voiceManager) {
    this.voiceManager = voiceManager;
    this.uiContainer = null;
    this.muteButton = null;
    this.isMuted = false;
    
    this.init();
  }
  
  init() {
    // Create UI container
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    
    // Create mute button
    this.muteButton = document.createElement('button');
    this.muteButton.className = 'voice-mute-button';
    this.muteButton.innerHTML = '🎤';
    this.muteButton.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background-color: #4CAF50;
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      position: relative;
    `;
    
    // Add hover effect
    this.muteButton.addEventListener('mouseover', () => {
      this.muteButton.style.transform = 'scale(1.1)';
      this.muteButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    });
    
    this.muteButton.addEventListener('mouseout', () => {
      this.muteButton.style.transform = 'scale(1)';
      this.muteButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    });
    
    // Add click animation
    this.muteButton.addEventListener('mousedown', () => {
      this.muteButton.style.transform = 'scale(0.95)';
    });
    
    this.muteButton.addEventListener('mouseup', () => {
      this.muteButton.style.transform = 'scale(1)';
    });
    
    // Add click handler
    this.muteButton.addEventListener('click', () => {
      this.isMuted = this.voiceManager.toggleMute();
      this.updateButtonState();
    });
    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    tooltip.textContent = 'Click to toggle microphone';
    this.muteButton.appendChild(tooltip);
    
    // Show/hide tooltip on hover
    this.muteButton.addEventListener('mouseover', () => {
      tooltip.style.opacity = '1';
    });
    
    this.muteButton.addEventListener('mouseout', () => {
      tooltip.style.opacity = '0';
    });
    
    // Add button to container
    this.uiContainer.appendChild(this.muteButton);
    
    // Add container to document
    document.body.appendChild(this.uiContainer);
    
    // Initial button state
    this.updateButtonState();
  }
  
  updateButtonState() {
    if (!this.muteButton) return;
    
    if (this.isMuted) {
      this.muteButton.style.backgroundColor = '#f44336';
      this.muteButton.innerHTML = '🎤';
      this.muteButton.title = 'Click to unmute';
    } else {
      this.muteButton.style.backgroundColor = '#4CAF50';
      this.muteButton.innerHTML = '🎤';
      this.muteButton.title = 'Click to mute';
    }
  }
  
  remove() {
    if (this.uiContainer) {
      this.uiContainer.remove();
    }
  }
}

export default VoiceUI; 
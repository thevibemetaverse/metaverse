export function setupUI(gameState) {
  // Get UI elements
  const vrButton = document.getElementById('vr-button');
  const settingsPanel = document.getElementById('settings-panel');
  const closeSettingsButton = document.getElementById('close-settings');
  const volumeSlider = document.getElementById('volume');
  const graphicsSelect = document.getElementById('graphics');
  const emojiButtons = document.querySelectorAll('.emoji-button');
  
  // VR button toggle
  if (vrButton) {
    // VR button is now handled in main.js
    // This is just for visual feedback
    vrButton.addEventListener('click', () => {
      vrButton.classList.toggle('active');
    });
  }
  
  if (closeSettingsButton && settingsPanel) {
    closeSettingsButton.addEventListener('click', () => {
      settingsPanel.style.display = 'none';
    });
  }
  
  // Volume control
  if (volumeSlider) {
    volumeSlider.value = gameState.settings.volume;
    volumeSlider.addEventListener('input', () => {
      gameState.settings.volume = parseInt(volumeSlider.value);
      // In a real implementation, this would adjust actual audio volume
    });
  }
  
  // Graphics quality
  if (graphicsSelect) {
    graphicsSelect.value = gameState.settings.graphics;
    graphicsSelect.addEventListener('change', () => {
      gameState.settings.graphics = graphicsSelect.value;
      applyGraphicsSettings(gameState.settings.graphics);
    });
  }
  
  // Add camera control instructions to the UI
  const controlsInfo = document.getElementById('controls-info');
  if (controlsInfo) {
    // Add camera control instructions
    const cameraControls = document.createElement('div');
    cameraControls.innerHTML = `
      <h3>Camera Controls:</h3>
      <ul>
        <li><strong>Q:</strong> Move camera higher</li>
        <li><strong>E:</strong> Move camera lower</li>
        <li><strong>Z:</strong> Zoom camera in</li>
        <li><strong>X:</strong> Zoom camera out</li>
        <li><strong>Mouse Drag:</strong> Orbit camera around avatar</li>
        <li><strong>Mouse Wheel:</strong> Zoom in/out</li>
      </ul>
    `;
    controlsInfo.appendChild(cameraControls);
  }
  
  // Emoji reactions
  if (emojiButtons) {
    emojiButtons.forEach(button => {
      button.addEventListener('click', () => {
        const emoji = button.getAttribute('data-emoji');
        if (emoji) {
          showEmojiReaction(emoji);
        }
      });
    });
  }
  
  // Function to apply graphics settings
  function applyGraphicsSettings(quality) {
    // In a real implementation, this would adjust renderer settings
    console.log(`Graphics quality set to: ${quality}`);
    
    // Example of what this might do:
    // - Low: Reduce shadow quality, disable antialiasing
    // - Medium: Medium shadow quality, enable basic antialiasing
    // - High: High shadow quality, enable advanced antialiasing and effects
  }
  
  // Return the UI elements for external use
  return {
    vrButton,
    settingsPanel,
    closeSettingsButton,
    volumeSlider,
    graphicsSelect,
    emojiButtons
  };
}

// Add emoji bar to UI
export function createEmojiBar() {
  console.log('Creating emoji bar in UI.js');
  
  // Create emoji bar container
  const emojiContainer = document.createElement('div');
  emojiContainer.id = 'emoji-bar-container';
  emojiContainer.style.position = 'fixed';
  emojiContainer.style.bottom = '20px';
  emojiContainer.style.left = '50%';
  emojiContainer.style.transform = 'translateX(-50%)';
  emojiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  emojiContainer.style.color = 'white';
  emojiContainer.style.padding = '10px 15px';
  emojiContainer.style.borderRadius = '25px';
  emojiContainer.style.display = 'flex';
  emojiContainer.style.gap = '15px';
  emojiContainer.style.zIndex = '1001';
  emojiContainer.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.5)';
  
  // Create emoji buttons
  const emojis = ['👋', '👍', '❤️', '😂', '🎉'];
  emojis.forEach(emoji => {
    const button = document.createElement('button');
    button.textContent = emoji;
    button.style.fontSize = '28px';
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    button.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    button.style.borderRadius = '50%';
    button.style.width = '45px';
    button.style.height = '45px';
    button.style.cursor = 'pointer';
    button.style.color = 'white';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.transition = 'all 0.2s ease';
    
    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });
    
    // Add click handler
    button.addEventListener('click', () => {
      showEmojiReaction(emoji);
    });
    
    emojiContainer.appendChild(button);
  });
  
  // Add the emoji bar to the document body
  document.body.appendChild(emojiContainer);
  console.log('Emoji bar created and added to document.body');
  
  return emojiContainer;
}

// Function to show floating emoji animation
export function showEmojiReaction(emoji) {
  console.log('Emoji clicked:', emoji);
  
  // Create floating emoji element
  const element = document.createElement('div');
  element.textContent = emoji;
  element.style.position = 'fixed';
  element.style.fontSize = '60px';
  element.style.left = '50%';
  element.style.bottom = '40%';
  element.style.transform = 'translateX(-50%)';
  element.style.zIndex = '1002';
  element.style.textShadow = '0 2px 10px rgba(0, 0, 0, 0.7)';
  element.style.pointerEvents = 'none';
  
  // Add animation
  const animationName = 'float-up-' + Date.now();
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ${animationName} {
      0% { opacity: 1; transform: translateX(-50%) translateY(0); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-200px); }
    }
  `;
  document.head.appendChild(style);
  element.style.animation = `${animationName} 2s ease-out forwards`;
  
  // Add to document
  document.body.appendChild(element);
  
  // Remove after animation completes
  setTimeout(() => {
    if (document.body.contains(element)) {
      document.body.removeChild(element);
    }
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  }, 2000);
} 
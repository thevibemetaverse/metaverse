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
        showEmojiReaction(button.textContent);
      });
    });
  }
  
  // Function to show emoji reaction
  function showEmojiReaction(emoji) {
    // Create a floating emoji element
    const emojiElement = document.createElement('div');
    emojiElement.textContent = emoji;
    emojiElement.style.position = 'absolute';
    emojiElement.style.fontSize = '2rem';
    emojiElement.style.left = '50%';
    emojiElement.style.bottom = '20%';
    emojiElement.style.transform = 'translateX(-50%)';
    emojiElement.style.animation = 'float-up 2s ease-out forwards';
    document.body.appendChild(emojiElement);
    
    // Add animation style if it doesn't exist
    if (!document.querySelector('#emoji-animation')) {
      const style = document.createElement('style');
      style.id = 'emoji-animation';
      style.textContent = `
        @keyframes float-up {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-100px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Remove the element after animation completes
    setTimeout(() => {
      document.body.removeChild(emojiElement);
    }, 2000);
    
    // In a multiplayer implementation, this would also send the emoji to other players
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
  
  // Expose methods that need to be called from outside
  return {
    showEmojiReaction
  };
} 
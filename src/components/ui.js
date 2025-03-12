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
  
  // Add responsive styles for mobile and active state
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      #emoji-bar-container {
        display: none;
        position: fixed;
        bottom: 180px; /* Align with the toggle button */
        left: 110px; /* Position to the left of the toggle button */
        transform: none;
        padding: 10px;
        border-radius: 25px;
        background-color: rgba(0, 0, 0, 0.7);
        flex-direction: row;
        transition: opacity 0.3s ease;
        opacity: 0;
      }

      #emoji-bar-container.visible {
        display: flex;
        opacity: 1;
      }

      #emoji-toggle {
        position: fixed;
        left: 20px;
        bottom: 160px; /* Slightly lower position */
        width: 80px;
        height: 80px;
        background-color: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1002;
        outline: none;
        backdrop-filter: blur(5px);
      }

      #emoji-toggle.active {
        background-color: rgba(255, 255, 255, 0.4);
      }

      #emoji-toggle:active {
        transform: scale(0.95);
      }
    }

    @media (min-width: 769px) {
      #emoji-toggle {
        display: none;
      }
    }

    .active {
      background-color: rgba(255, 255, 255, 0.2) !important;
      transform: scale(1.1) !important;
    }
  `;
  document.head.appendChild(style);
  
  // Create emoji buttons
  const emojis = ['👋', '👍', '❤️', '😂', '🎉'];
  emojis.forEach(emoji => {
    const button = document.createElement('button');
    button.textContent = emoji;
    button.style.fontSize = '28px';
    button.style.backgroundColor = 'transparent';
    button.style.border = 'none';
    button.style.outline = 'none';
    button.style.cursor = 'pointer';
    button.style.color = 'white';
    button.style.padding = '5px';
    button.style.width = '40px';
    button.style.height = '40px';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    
    // Add click handler
    button.addEventListener('click', () => {
      console.log('Emoji clicked:', emoji);
      
      if (window.showEmojiReaction) {
        window.showEmojiReaction(emoji);
      } else {
        // Create floating emoji element
        const element = document.createElement('div');
        element.textContent = emoji;
        element.style.position = 'fixed';
        element.style.fontSize = '60px';
        element.style.left = '50%';
        element.style.bottom = '40%';
        element.style.transform = 'translateX(-50%)';
        element.style.zIndex = '10000';
        element.style.pointerEvents = 'none';
        
        // Add animation
        element.style.animation = 'float-up 2s ease-out forwards';
        
        // Add to document
        document.body.appendChild(element);
        
        // Remove after animation completes
        setTimeout(() => {
          if (document.body.contains(element)) {
            document.body.removeChild(element);
          }
        }, 2000);
      }
    });
    
    emojiContainer.appendChild(button);
  });

  // Add divider
  const divider = document.createElement('div');
  divider.className = 'divider';
  divider.style.width = '1px';
  divider.style.height = '30px';
  divider.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  divider.style.margin = '0 5px';
  emojiContainer.appendChild(divider);

  // Add skateboard button
  const skateboardButton = document.createElement('button');
  skateboardButton.textContent = '🛹';
  skateboardButton.style.fontSize = '28px';
  skateboardButton.style.backgroundColor = 'transparent';
  skateboardButton.style.border = 'none';
  skateboardButton.style.outline = 'none';
  skateboardButton.style.cursor = 'pointer';
  skateboardButton.style.color = 'white';
  skateboardButton.style.padding = '5px';
  skateboardButton.style.transition = 'transform 0.2s, background-color 0.2s';
  skateboardButton.style.width = '40px';
  skateboardButton.style.height = '40px';
  skateboardButton.style.display = 'flex';
  skateboardButton.style.alignItems = 'center';
  skateboardButton.style.justifyContent = 'center';
  
  // Add hover effect
  skateboardButton.addEventListener('mouseenter', () => {
    if (!skateboardButton.classList.contains('active')) {
      skateboardButton.style.transform = 'scale(1.2)';
      skateboardButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    }
  });
  
  skateboardButton.addEventListener('mouseleave', () => {
    if (!skateboardButton.classList.contains('active')) {
      skateboardButton.style.transform = 'scale(1)';
      skateboardButton.style.backgroundColor = 'transparent';
    }
  });
  
  // Add click handler for skateboard
  skateboardButton.addEventListener('click', () => {
    console.log('Skateboard clicked');
    const isActive = skateboardButton.classList.contains('active');
    
    // Toggle active state
    skateboardButton.classList.toggle('active');
    
    // Update visual state
    if (!isActive) {
      skateboardButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      skateboardButton.style.transform = 'scale(1.1)';
    } else {
      skateboardButton.style.backgroundColor = 'transparent';
      skateboardButton.style.transform = 'scale(1)';
      skateboardButton.classList.remove('active');
    }
    
    // Dispatch event
    const event = new CustomEvent('toggle-skateboard-mode', { 
      detail: { 
        isActive: !isActive
      }
    });
    document.dispatchEvent(event);
  });
  
  emojiContainer.appendChild(skateboardButton);

  // Add toggle button for mobile
  const toggleButton = document.createElement('button');
  toggleButton.id = 'emoji-toggle';
  toggleButton.textContent = '👍';
  toggleButton.addEventListener('click', () => {
    toggleButton.classList.toggle('active');
    emojiContainer.classList.toggle('visible');
  });

  // Only close emoji bar when clicking the toggle button again
  document.addEventListener('click', (event) => {
    // Remove the auto-hide behavior
  });
  
  // Add the emoji bar and toggle button to the document body
  document.body.appendChild(emojiContainer);
  document.body.appendChild(toggleButton);
  
  console.log('Emoji bar created and added to document.body');
  
  return emojiContainer;
}

// Function to show floating emoji animation
export function showEmojiReaction(emoji) {
  console.log('Emoji clicked:', emoji);
  
  // This function will be overridden by the main.js file to use the 3D emoji effects
  // We'll just dispatch the event for the main.js to handle
  
  // Dispatch a custom event that main.js can listen for to create 3D emojis
  const event = new CustomEvent('emoji-reaction', { detail: { emoji } });
  document.dispatchEvent(event);
} 
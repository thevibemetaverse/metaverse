import * as THREE from 'three';

/**
 * Creates virtual joystick controls for mobile devices
 * @param {Object} controls - The controls object to update
 * @returns {Object} - The joystick controller object
 */
export function setupMobileControls(controls) {
  // Check if entering via portal
  const urlParams = new URLSearchParams(window.location.search);
  const isPortalEntrance = urlParams.get('portal') === 'true';

  // Create container for mobile controls
  const mobileControlsContainer = document.createElement('div');
  mobileControlsContainer.id = 'mobile-controls';
  mobileControlsContainer.style.position = 'fixed';
  mobileControlsContainer.style.bottom = '20px';
  mobileControlsContainer.style.left = '0';
  mobileControlsContainer.style.width = '100%';
  mobileControlsContainer.style.display = isPortalEntrance ? 'flex' : 'none'; // Hide initially if not from portal
  mobileControlsContainer.style.justifyContent = 'space-between';
  mobileControlsContainer.style.pointerEvents = 'none';
  mobileControlsContainer.style.zIndex = '100';
  document.body.appendChild(mobileControlsContainer);

  // Create username container
  const usernameContainer = document.createElement('div');
  usernameContainer.id = 'username-container';
  usernameContainer.style.position = 'fixed';
  usernameContainer.style.top = '20px';
  usernameContainer.style.left = '50%';
  usernameContainer.style.transform = 'translateX(-50%)';
  usernameContainer.style.padding = '8px 12px';
  usernameContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
  usernameContainer.style.borderRadius = '30px';
  usernameContainer.style.color = 'white';
  usernameContainer.style.fontFamily = 'Arial, sans-serif';
  usernameContainer.style.zIndex = '100';
  usernameContainer.style.display = isPortalEntrance ? 'flex' : 'none'; // Hide initially if not from portal
  usernameContainer.style.flexDirection = 'row';
  usernameContainer.style.alignItems = 'center';
  usernameContainer.style.pointerEvents = 'auto';
  usernameContainer.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  document.body.appendChild(usernameContainer);
  
  // Create label for username input
  const usernameLabel = document.createElement('label');
  usernameLabel.textContent = 'Name:';
  usernameLabel.style.marginRight = '8px';
  usernameLabel.style.fontSize = '14px';
  usernameLabel.style.fontWeight = 'bold';
  usernameLabel.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
  usernameContainer.appendChild(usernameLabel);
  
  // Create input field for username
  const usernameInput = document.createElement('input');
  usernameInput.id = 'username-input';
  usernameInput.type = 'text';
  usernameInput.placeholder = 'metaverse-explorer';
  usernameInput.style.padding = '5px 10px';
  usernameInput.style.borderRadius = '15px';
  usernameInput.style.border = '1px solid rgba(255, 255, 255, 0.3)';
  usernameInput.style.fontSize = '14px';
  usernameInput.style.width = '140px';
  usernameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  usernameInput.style.outline = 'none';
  usernameInput.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1)';
  
  // Get username from window.gameState if available
  if (window.gameState && window.gameState.username) {
    usernameInput.value = window.gameState.username;
  } else {
    // Try to get username from URL
    const urlUsername = urlParams.get('username');
    if (urlUsername) {
      usernameInput.value = urlUsername;
      // Update gameState if it exists
      if (window.gameState) {
        window.gameState.username = urlUsername;
      }
    }
  }
  
  usernameInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      // Update the username immediately
      if (usernameInput.value.trim()) {
        if (window.gameState) {
          window.gameState.username = usernameInput.value.trim();
          console.log('Username set to:', window.gameState.username);
          
          // Sync with controls username input if it exists
          const controlsUsernameInput = document.getElementById('controls-username');
          if (controlsUsernameInput) {
            controlsUsernameInput.value = window.gameState.username;
          }
        }
      }
    }
  });
  
  // Also listen for input events to update in real-time
  usernameInput.addEventListener('input', function() {
    if (usernameInput.value.trim() && window.gameState) {
      window.gameState.username = usernameInput.value.trim();
      
      // Sync with controls username input if it exists
      const controlsUsernameInput = document.getElementById('controls-username');
      if (controlsUsernameInput) {
        controlsUsernameInput.value = window.gameState.username;
      }
    }
  });
  
  usernameContainer.appendChild(usernameInput);

  // Create left joystick container (movement)
  const leftJoystickContainer = document.createElement('div');
  leftJoystickContainer.style.width = '120px';
  leftJoystickContainer.style.height = '120px';
  leftJoystickContainer.style.marginLeft = '20px';
  leftJoystickContainer.style.position = 'relative';
  leftJoystickContainer.style.pointerEvents = 'auto';
  mobileControlsContainer.appendChild(leftJoystickContainer);

  // Create right joystick container (rotation)
  const rightJoystickContainer = document.createElement('div');
  rightJoystickContainer.style.width = '120px';
  rightJoystickContainer.style.height = '120px';
  rightJoystickContainer.style.marginRight = '20px';
  rightJoystickContainer.style.position = 'relative';
  rightJoystickContainer.style.pointerEvents = 'auto';
  mobileControlsContainer.appendChild(rightJoystickContainer);

  // Create jump button
  const jumpButton = document.createElement('div');
  jumpButton.id = 'jump-button';
  jumpButton.style.position = 'fixed';
  jumpButton.style.bottom = '160px';
  jumpButton.style.right = '40px';
  jumpButton.style.width = '60px';
  jumpButton.style.height = '60px';
  jumpButton.style.borderRadius = '50%';
  jumpButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
  jumpButton.style.display = isPortalEntrance ? 'flex' : 'none'; // Hide initially if not from portal
  jumpButton.style.justifyContent = 'center';
  jumpButton.style.alignItems = 'center';
  jumpButton.style.pointerEvents = 'auto';
  jumpButton.style.zIndex = '101';
  jumpButton.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  jumpButton.innerHTML = '<span style="font-size: 24px;">↑</span>';
  document.body.appendChild(jumpButton);

  // Create joystick bases
  const createJoystickBase = (container) => {
    const base = document.createElement('div');
    base.style.position = 'absolute';
    base.style.width = '100%';
    base.style.height = '100%';
    base.style.borderRadius = '50%';
    base.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    base.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    container.appendChild(base);
    return base;
  };

  // Create joystick sticks
  const createJoystickStick = (container) => {
    const stick = document.createElement('div');
    stick.style.position = 'absolute';
    stick.style.top = '50%';
    stick.style.left = '50%';
    stick.style.width = '40%';
    stick.style.height = '40%';
    stick.style.borderRadius = '50%';
    stick.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    stick.style.transform = 'translate(-50%, -50%)';
    stick.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    container.appendChild(stick);
    return stick;
  };

  // Create joystick elements
  const leftBase = createJoystickBase(leftJoystickContainer);
  const leftStick = createJoystickStick(leftJoystickContainer);
  const rightBase = createJoystickBase(rightJoystickContainer);
  const rightStick = createJoystickStick(rightJoystickContainer);

  // Add labels
  const addLabel = (container, text) => {
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.bottom = '-25px';
    label.style.left = '0';
    label.style.width = '100%';
    label.style.textAlign = 'center';
    label.style.color = 'white';
    label.style.fontSize = '12px';
    label.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.8)';
    label.textContent = text;
    container.appendChild(label);
  };

  addLabel(leftJoystickContainer, 'MOVE');
  addLabel(rightJoystickContainer, 'ROTATE');

  // Joystick state
  const joystickState = {
    left: { active: false, position: { x: 0, y: 0 } },
    right: { active: false, position: { x: 0, y: 0 } }
  };

  // Handle touch events for joysticks
  const handleJoystickTouch = (joystick, stick, event, isLeft) => {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = joystick.getBoundingClientRect();
    
    // Calculate joystick position
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    // Limit joystick movement to the base radius
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2;
    
    if (distance > maxDistance) {
      const ratio = maxDistance / distance;
      deltaX *= ratio;
      deltaY *= ratio;
    }
    
    // Update stick position
    stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    // Normalize values between -1 and 1
    const normalizedX = deltaX / maxDistance;
    const normalizedY = deltaY / maxDistance;
    
    // Update joystick state
    if (isLeft) {
      joystickState.left.position.x = normalizedX;
      joystickState.left.position.y = normalizedY;
      
      // Update movement controls
      controls.moveForward = normalizedY < -0.2;
      controls.moveBackward = normalizedY > 0.2;
      controls.moveLeft = normalizedX < -0.2;
      controls.moveRight = normalizedX > 0.2;
    } else {
      joystickState.right.position.x = normalizedX;
      joystickState.right.position.y = normalizedY;
      
      // Update rotation based on horizontal movement of right joystick
      if (Math.abs(normalizedX) > 0.1) {
        controls.targetRotation -= normalizedX * 0.05;
      }
    }
  };

  // Reset joystick position and state
  const resetJoystick = (stick, isLeft) => {
    stick.style.transform = 'translate(-50%, -50%)';
    
    if (isLeft) {
      joystickState.left.active = false;
      joystickState.left.position = { x: 0, y: 0 };
      
      // Reset movement controls
      controls.moveForward = false;
      controls.moveBackward = false;
      controls.moveLeft = false;
      controls.moveRight = false;
    } else {
      joystickState.right.active = false;
      joystickState.right.position = { x: 0, y: 0 };
    }
  };

  // Left joystick event listeners
  leftJoystickContainer.addEventListener('touchstart', (event) => {
    joystickState.left.active = true;
    handleJoystickTouch(leftJoystickContainer, leftStick, event, true);
  }, { passive: false });

  leftJoystickContainer.addEventListener('touchmove', (event) => {
    if (joystickState.left.active) {
      handleJoystickTouch(leftJoystickContainer, leftStick, event, true);
    }
  }, { passive: false });

  leftJoystickContainer.addEventListener('touchend', () => {
    resetJoystick(leftStick, true);
  });

  // Right joystick event listeners
  rightJoystickContainer.addEventListener('touchstart', (event) => {
    joystickState.right.active = true;
    handleJoystickTouch(rightJoystickContainer, rightStick, event, false);
  }, { passive: false });

  rightJoystickContainer.addEventListener('touchmove', (event) => {
    if (joystickState.right.active) {
      handleJoystickTouch(rightJoystickContainer, rightStick, event, false);
    }
  }, { passive: false });

  rightJoystickContainer.addEventListener('touchend', () => {
    resetJoystick(rightStick, false);
  });

  // Jump button event listener
  jumpButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    if (controls.canJump) {
      controls.jump = true;
      
      // Visual feedback
      jumpButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      jumpButton.style.transform = 'scale(0.9)';
      
      // Reset after a short delay
      setTimeout(() => {
        jumpButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        jumpButton.style.transform = 'scale(1)';
      }, 200);
    }
  }, { passive: false });

  // Function to show/hide mobile controls
  const toggleMobileControls = (show) => {
    // If entering via portal, show controls immediately
    const isPortalEntrance = new URLSearchParams(window.location.search).get('portal') === 'true';
    
    if (isPortalEntrance) {
      // Always show controls for portal entrance
      console.log("Portal entrance detected - showing mobile controls");
      mobileControlsContainer.style.display = 'flex';
      jumpButton.style.display = 'flex';
      usernameContainer.style.display = 'flex';
    } else {
      // Normal toggle behavior
      console.log(`Toggling mobile controls: ${show ? 'showing' : 'hiding'}`);
      mobileControlsContainer.style.display = show ? 'flex' : 'none';
      jumpButton.style.display = show ? 'flex' : 'none';
      usernameContainer.style.display = show ? 'flex' : 'none';
    }
  };

  return {
    joystickState,
    toggleMobileControls
  };
}

/**
 * Detects if the device is a mobile device
 * @returns {boolean} - True if the device is mobile
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.innerWidth <= 800 && window.innerHeight <= 900);
}

/**
 * Optimizes the renderer for mobile devices
 * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
 */
export function optimizeForMobile(renderer) {
  // Lower pixel ratio for better performance
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  
  // Reduce shadow map size
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  
  // Disable antialiasing on lower-end devices
  if (window.innerWidth < 600) {
    renderer.antialias = false;
  }
}

/**
 * Updates the mobile controls based on device orientation
 * @param {Object} controls - The controls object to update
 */
export function setupDeviceOrientation(controls) {
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (event) => {
      // Only use device orientation for rotation if right joystick is not active
      if (!controls.joystickState || !controls.joystickState.right.active) {
        // Get device orientation data
        const beta = event.beta; // X-axis rotation (-180 to 180)
        const gamma = event.gamma; // Y-axis rotation (-90 to 90)
        
        // Only apply rotation if the device is tilted significantly
        if (Math.abs(gamma) > 10) {
          // Convert gamma to rotation speed
          const rotationSpeed = gamma * 0.01;
          controls.targetRotation -= rotationSpeed;
        }
      }
    });
  }
}

/**
 * Creates a mobile-friendly UI
 */
export function createMobileUI() {
  // Create a container for mobile UI elements
  const mobileUIContainer = document.createElement('div');
  mobileUIContainer.id = 'mobile-ui';
  mobileUIContainer.style.position = 'fixed';
  mobileUIContainer.style.top = '10px';
  mobileUIContainer.style.right = '10px';
  mobileUIContainer.style.zIndex = '100';
  document.body.appendChild(mobileUIContainer);

  // Create settings button
  const settingsButton = document.createElement('button');
  settingsButton.id = 'mobile-settings-button';
  settingsButton.style.width = '40px';
  settingsButton.style.height = '40px';
  settingsButton.style.borderRadius = '50%';
  settingsButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  settingsButton.style.border = 'none';
  settingsButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  settingsButton.style.marginBottom = '10px';
  settingsButton.innerHTML = '⚙️';
  mobileUIContainer.appendChild(settingsButton);

  // Create mobile settings panel
  const settingsPanel = document.createElement('div');
  settingsPanel.id = 'mobile-settings-panel';
  settingsPanel.style.position = 'fixed';
  settingsPanel.style.top = '50%';
  settingsPanel.style.left = '50%';
  settingsPanel.style.transform = 'translate(-50%, -50%)';
  settingsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  settingsPanel.style.padding = '20px';
  settingsPanel.style.borderRadius = '10px';
  settingsPanel.style.color = 'white';
  settingsPanel.style.zIndex = '1000';
  settingsPanel.style.display = 'none';
  settingsPanel.style.maxWidth = '80%';
  settingsPanel.style.width = '300px';
  
  settingsPanel.innerHTML = `
    <h3 style="margin-top: 0; text-align: center;">Mobile Settings</h3>
    
    <div style="margin: 15px 0;">
      <label for="graphics-quality">Graphics Quality:</label>
      <select id="graphics-quality" style="width: 100%; padding: 8px; margin-top: 5px; background: #333; color: white; border: 1px solid #555;">
        <option value="low">Low (Better Performance)</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High (Better Graphics)</option>
      </select>
    </div>
    
    <div style="margin: 15px 0;">
      <label for="joystick-size">Joystick Size:</label>
      <input type="range" id="joystick-size" min="80" max="150" value="120" style="width: 100%;">
    </div>
    
    <div style="margin: 15px 0;">
      <label>
        <input type="checkbox" id="use-gyroscope" checked>
        Use Gyroscope for Rotation (if available)
      </label>
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
      <button id="close-settings" style="padding: 8px 15px; background: #555; color: white; border: none; border-radius: 5px;">Close</button>
      <button id="apply-settings" style="padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 5px;">Apply</button>
    </div>
  `;
  
  document.body.appendChild(settingsPanel);

  // Settings button event listener
  settingsButton.addEventListener('click', () => {
    settingsPanel.style.display = 'block';
  });

  // Close settings button event listener
  document.getElementById('close-settings').addEventListener('click', () => {
    settingsPanel.style.display = 'none';
  });

  // Apply settings button event listener
  document.getElementById('apply-settings').addEventListener('click', () => {
    const graphicsQuality = document.getElementById('graphics-quality').value;
    const joystickSize = document.getElementById('joystick-size').value;
    const useGyroscope = document.getElementById('use-gyroscope').checked;
    
    // Apply joystick size
    const leftJoystick = document.querySelector('#mobile-controls > div:first-child');
    const rightJoystick = document.querySelector('#mobile-controls > div:last-child');
    
    if (leftJoystick && rightJoystick) {
      leftJoystick.style.width = `${joystickSize}px`;
      leftJoystick.style.height = `${joystickSize}px`;
      rightJoystick.style.width = `${joystickSize}px`;
      rightJoystick.style.height = `${joystickSize}px`;
    }
    
    // Apply graphics quality
    window.dispatchEvent(new CustomEvent('mobile-settings-changed', { 
      detail: { graphicsQuality, joystickSize, useGyroscope } 
    }));
    
    // Close settings panel
    settingsPanel.style.display = 'none';
  });

  return {
    settingsButton,
    settingsPanel
  };
} 
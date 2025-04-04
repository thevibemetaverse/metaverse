class VoiceUI {
  constructor(voiceManager) {
    this.voiceManager = voiceManager;
    this.uiContainer = null;
    this.muteButton = null;
    this.isMuted = true;
    this.isInitialized = false;
    this.errorNotification = null;
    this.isVisible = false;
    
    this.init();
    
    // Register console commands for showing/hiding
    this.registerConsoleCommands();
  }
  
  init() {
    // Create UI container
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: none;
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
      background-color: #f44336;
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
      // Remove any existing error notifications
      this.removeErrorNotification();
      
      if (!this.isInitialized) {
        // First click - initialize voice chat and request microphone permission
        
        // Show loading state
        this.muteButton.style.opacity = '0.7';
        this.muteButton.style.cursor = 'wait';

        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('MediaDevices API not available in this browser');
          
          // Reset button state
          this.muteButton.style.opacity = '1';
          this.muteButton.style.cursor = 'pointer';
          
          // Show browser compatibility error
          const error = new Error('Your browser does not support the MediaDevices API');
          error.name = 'NotSupportedError';
          this.showErrorNotification(error);
          return;
        }

        // Check HTTPS requirement (except for localhost)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          console.error('HTTPS required for microphone access');
          
          // Reset button state
          this.muteButton.style.opacity = '1';
          this.muteButton.style.cursor = 'pointer';
          
          // Show HTTPS requirement error
          const error = new Error('Voice chat requires a secure connection (HTTPS)');
          error.name = 'SecurityError';
          this.showErrorNotification(error);
          return;
        }

        // Check if running in an iframe
        if (window.self !== window.top) {
          console.error('Running in iframe, microphone access may be restricted');
          
          // Reset button state
          this.muteButton.style.opacity = '1';
          this.muteButton.style.cursor = 'pointer';
          
          // Show iframe restriction error
          const error = new Error('Voice chat may not work properly in iframes');
          error.name = 'IframeError';
          this.showErrorNotification(error);
          // Continue anyway as some browsers allow it
        }

        // Force trigger permission dialog by requesting microphone
        try {
          console.log('Requesting microphone permission...');
          // Use async/await and try-catch for cleaner error handling
          navigator.mediaDevices
            .getUserMedia({ audio: { 
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }})
            .then((stream) => {
              // Successfully got microphone access
              console.log('Microphone access granted');
              
              // Initialize voice chat with the stream
              this.voiceManager.initializeVoiceChat(stream)
                .then(() => {
                  // Reset button state
                  this.muteButton.style.opacity = '1';
                  this.muteButton.style.cursor = 'pointer';
                  
                  this.isInitialized = true;
                  
                  // Important: Auto-unmute after permission is granted
                  // This makes the microphone active immediately after permission
                  this.isMuted = false;
                  this.voiceManager.isMuted = false;
                  
                  // Unmute all audio tracks in the stream
                  stream.getAudioTracks().forEach(track => {
                    track.enabled = true;
                  });
                  
                  // Force update the microphone state in the multiplayer system
                  console.log('Force updating voice state on initialization');
                  
                  // First use the VoiceManager to update its state
                  this.voiceManager.updateMicrophoneState();
                  
                  // Then directly update the player's label if MultiplayerManager is available
                  if (this.voiceManager.multiplayerManager && this.voiceManager.clientId) {
                    // Ensure the player's name gets updated with microphone icon
                    this.voiceManager.multiplayerManager.updatePlayerVoiceState(
                      this.voiceManager.clientId, 
                      false // Explicitly set to unmuted state
                    );
                    
                    // Add a delayed second call to handle race conditions
                    setTimeout(() => {
                      if (this.voiceManager.multiplayerManager) {
                        console.log('Delayed second call to update player label with mic icon');
                        this.voiceManager.multiplayerManager.updatePlayerVoiceState(
                          this.voiceManager.clientId, 
                          false // Still unmuted
                        );
                      }
                    }, 1000);
                  }
                  
                  // Update UI to reflect unmuted state
                  this.updateButtonState();
                  
                  console.log('Microphone initialized and unmuted');
                })
                .catch((error) => {
                  // Error during voice chat initialization
                  console.error('Failed to initialize voice chat:', error);
                  stream.getTracks().forEach(track => track.stop());
                  
                  // Reset button state
                  this.muteButton.style.opacity = '1';
                  this.muteButton.style.cursor = 'pointer';
                  
                  // Show error notification
                  this.showErrorNotification(error);
                });
            })
            .catch((error) => {
              // Failed to get microphone access
              console.error('Microphone access error:', error);
              
              // Reset button state
              this.muteButton.style.opacity = '1';
              this.muteButton.style.cursor = 'pointer';
              
              // Show appropriate error notification
              if (error.name === 'NotAllowedError') {
                this.showPermissionBlockedHelp();
              } else {
                this.showErrorNotification(error);
              }
            });
        } catch (error) {
          console.error('Error in getUserMedia:', error);
          
          // Reset button state
          this.muteButton.style.opacity = '1';
          this.muteButton.style.cursor = 'pointer';
          
          // Show error notification
          this.showErrorNotification(error);
        }
      } else {
        // Subsequent clicks - toggle mute
        this.isMuted = this.voiceManager.toggleMute();
        this.updateButtonState();
      }
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
    tooltip.textContent = 'Click to enable voice chat';
    this.muteButton.appendChild(tooltip);
    
    // Show/hide tooltip on hover
    this.muteButton.addEventListener('mouseover', () => {
      tooltip.style.opacity = '1';
      tooltip.textContent = this.isInitialized ? 'Click to toggle microphone' : 'Click to enable voice chat';
    });
    
    this.muteButton.addEventListener('mouseout', () => {
      tooltip.style.opacity = '0';
    });
    
    // Add button to container
    this.uiContainer.appendChild(this.muteButton);
    
    // Create diagnostic button
    const diagnosticButton = document.createElement('button');
    diagnosticButton.className = 'voice-diagnostic-button';
    diagnosticButton.innerHTML = '📊';
    diagnosticButton.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background-color: #2196F3;
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
    diagnosticButton.addEventListener('mouseover', () => {
      diagnosticButton.style.transform = 'scale(1.1)';
      diagnosticButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    });
    
    diagnosticButton.addEventListener('mouseout', () => {
      diagnosticButton.style.transform = 'scale(1)';
      diagnosticButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    });
    
    // Add click handler
    diagnosticButton.addEventListener('click', () => {
      if (this.voiceManager) {
        this.voiceManager.showConnectionStatus();
      }
    });
    
    // Add tooltip
    const diagnosticTooltip = document.createElement('div');
    diagnosticTooltip.style.cssText = `
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
    diagnosticTooltip.textContent = 'Voice Diagnostics';
    diagnosticButton.appendChild(diagnosticTooltip);
    
    // Show/hide tooltip on hover
    diagnosticButton.addEventListener('mouseover', () => {
      diagnosticTooltip.style.opacity = '1';
    });
    
    diagnosticButton.addEventListener('mouseout', () => {
      diagnosticTooltip.style.opacity = '0';
    });
    
    // Add button to container
    this.uiContainer.appendChild(diagnosticButton);
    
    // Add container to document
    document.body.appendChild(this.uiContainer);
    
    // Initial button state
    this.updateButtonState();
  }
  
  showErrorNotification(error) {
    // Remove any existing error notification
    this.removeErrorNotification();
    
    let errorMessage = '';
    let title = 'Voice Chat Disabled';
    let showTroubleshooting = false;

    if (error.name === 'NotAllowedError') {
      title = 'Microphone Access Required';
      errorMessage = 'Please allow microphone access in your browser to use voice chat. Click the microphone button again to retry.';
      showTroubleshooting = true;
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No microphone found. Please connect a microphone and try again.';
    } else if (error.message.includes('HTTPS')) {
      errorMessage = 'Voice chat requires a secure connection (HTTPS). Please use HTTPS or localhost.';
    } else if (error.message.includes('iframe')) {
      errorMessage = 'Voice chat is not supported in iframes. Please open the page directly in your browser.';
    } else if (error.message.includes('support')) {
      errorMessage = 'Your browser does not support voice chat. Please use a modern browser like Chrome, Firefox, or Edge.';
    } else {
      errorMessage = 'An error occurred while setting up voice chat. Please try again later.';
    }
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background-color: ${error.name === 'NotAllowedError' ? '#2196F3' : '#f44336'};
      color: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 1000;
      max-width: 300px;
      font-size: 14px;
      line-height: 1.4;
      animation: fadeIn 0.3s ease-in-out;
    `;
    
    let notificationContent = `
      <div style="margin-bottom: 10px;">
        <strong>${title}</strong>
      </div>
      <div style="margin-bottom: ${showTroubleshooting ? '10px' : '0px'};">
        ${errorMessage}
      </div>
    `;

    if (showTroubleshooting) {
      notificationContent += `
        <div style="font-size: 12px; opacity: 0.9; margin-top: 10px;">
          <strong>Troubleshooting:</strong><br>
          1. Look for the microphone icon in your browser's address bar<br>
          2. Click it and select "Allow"<br>
          3. Click the microphone button again to retry
        </div>
      `;
    }
    
    notification.innerHTML = notificationContent;
    
    document.body.appendChild(notification);
    this.errorNotification = notification;
    
    // Remove notification after 10 seconds
    setTimeout(() => {
      this.removeErrorNotification();
    }, 10000);
  }
  
  removeErrorNotification() {
    if (this.errorNotification) {
      this.errorNotification.remove();
      this.errorNotification = null;
    }
  }
  
  updateButtonState() {
    if (!this.muteButton) return;
    
    if (this.isMuted) {
      this.muteButton.style.backgroundColor = '#f44336';
      this.muteButton.innerHTML = '🎤';
      this.muteButton.title = this.isInitialized ? 'Click to unmute' : 'Click to enable voice chat';
    } else {
      this.muteButton.style.backgroundColor = '#4CAF50';
      this.muteButton.innerHTML = '🎤';
      this.muteButton.title = 'Click to mute';
    }
  }
  
  remove() {
    this.removeErrorNotification();
    if (this.uiContainer) {
      this.uiContainer.remove();
    }
    
    // Clean up console commands
    delete window.showVoiceUI;
    delete window.hideVoiceUI;
    delete window.toggleVoiceUI;
  }
  
  // New method to show browser-specific instructions for blocked permissions
  showPermissionBlockedHelp() {
    // Detect browser
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
    const isFirefox = navigator.userAgent.indexOf('Firefox') > -1;
    const isSafari = navigator.userAgent.indexOf('Safari') > -1 && !isChrome;
    const isEdge = navigator.userAgent.indexOf('Edg') > -1;
    
    let browserName = '';
    let settingsInstructions = '';
    
    if (isChrome || isEdge) {
      browserName = isEdge ? 'Edge' : 'Chrome';
      settingsInstructions = `
        1. Click the lock/info icon in the address bar
        2. Click "Site settings"
        3. Find "Microphone" and change to "Allow"
        4. Refresh the page and try again
      `;
    } else if (isFirefox) {
      browserName = 'Firefox';
      settingsInstructions = `
        1. Click the lock/info icon in the address bar
        2. Click the arrow next to "Microphone"
        3. Select "Allow"
        4. Refresh the page and try again
      `;
    } else if (isSafari) {
      browserName = 'Safari';
      settingsInstructions = `
        1. Open Safari Preferences
        2. Go to "Websites" > "Microphone"
        3. Find this website and select "Allow"
        4. Refresh the page and try again
      `;
    } else {
      browserName = 'your browser';
      settingsInstructions = `
        1. Look for site permissions in your browser settings
        2. Find microphone permissions for this website
        3. Allow microphone access
        4. Refresh the page and try again
      `;
    }
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background-color: #FF9800;
      color: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 1000;
      max-width: 320px;
      font-size: 14px;
      line-height: 1.5;
      animation: fadeIn 0.3s ease-in-out;
    `;
    
    notification.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Microphone Permission Blocked</strong>
      </div>
      <div style="margin-bottom: 10px;">
        ${browserName} is blocking microphone access. You need to change this in your browser settings.
      </div>
      <div style="font-size: 13px; margin-bottom: 10px;">
        <strong>How to enable in ${browserName}:</strong><br>
        ${settingsInstructions}
      </div>
      <button id="close-notification" style="
        background: white; 
        color: #FF9800; 
        border: none; 
        padding: 5px 10px; 
        border-radius: 3px; 
        cursor: pointer;
        font-weight: bold;
      ">Got it</button>
    `;
    
    document.body.appendChild(notification);
    this.errorNotification = notification;
    
    // Add click handler for the close button
    document.getElementById('close-notification').addEventListener('click', () => {
      this.removeErrorNotification();
    });
  }
  
  // New method to register console commands
  registerConsoleCommands() {
    window.showVoiceUI = () => {
      this.show();
      console.log('Voice UI is now visible');
      return 'Voice UI is now visible';
    };
    
    window.hideVoiceUI = () => {
      this.hide();
      console.log('Voice UI is now hidden');
      return 'Voice UI is now hidden';
    };
    
    window.toggleVoiceUI = () => {
      if (this.isVisible) {
        this.hide();
        console.log('Voice UI is now hidden');
        return 'Voice UI is now hidden';
      } else {
        this.show();
        console.log('Voice UI is now visible');
        return 'Voice UI is now visible';
      }
    };
    
    window.showVoiceDiagnostic = () => {
      if (this.voiceManager) {
        console.log('Showing voice diagnostics');
        return this.voiceManager.showConnectionStatus();
      } else {
        console.log('Voice manager not available');
        return 'Voice manager not available';
      }
    };
    
    console.log('Voice UI commands registered: showVoiceUI(), hideVoiceUI(), toggleVoiceUI(), showVoiceDiagnostic()');
  }
  
  // New method to show the UI
  show() {
    if (!this.isVisible && this.uiContainer) {
      this.uiContainer.style.display = 'flex';
      this.isVisible = true;
    }
    return this.isVisible;
  }
  
  // New method to hide the UI
  hide() {
    if (this.isVisible && this.uiContainer) {
      this.uiContainer.style.display = 'none';
      this.isVisible = false;
    }
    return this.isVisible;
  }
}

export default VoiceUI; 
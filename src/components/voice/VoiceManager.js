import { io } from 'socket.io-client';
import PeerConnection from './PeerConnection';

class VoiceManager {
  constructor(scene) {
    this.scene = scene;
    this.stream = null;
    this.socket = null;
    this.peers = {};
    this.audioElements = {};
    this.isMuted = true;
    this.isInitialized = false;
    
    // Reference to the existing multiplayer system
    this.clientId = null;
    this.multiplayerManager = null;
    this.characterManager = null;
    this.microphoneAccessDenied = false;
    this.permissionRequestShown = false;
    
    // Register global diagnostic commands
    this.registerDiagnosticCommands();
  }

  setMultiplayerManager(multiplayerManager) {
    this.multiplayerManager = multiplayerManager;
  }
  
  setCharacterManager(characterManager) {
    this.characterManager = characterManager;
  }

  // Initialize basic socket connection without requesting microphone access
  async init(socket, clientId) {
    this.socket = socket;
    this.clientId = clientId;
    this.setupSocketListeners();
    
    // Announce presence in voice chat
    if (this.socket) {
      console.log('[VoiceManager] Announcing voice chat presence');
      this.socket.emit('voiceChat:announce', { userId: this.clientId });
    }
  }

  // Modified method to accept an existing stream
  async initializeVoiceChat(stream) {
    try {
      // Check if we're in an iframe
      if (window.self !== window.top) {
        throw new Error('Voice chat is not supported in iframes. Please open the page directly.');
      }

      // Check if we're on HTTPS (required for getUserMedia)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Voice chat requires a secure connection (HTTPS). Please use HTTPS or localhost.');
      }

      console.log('[VoiceManager] Initializing voice chat with stream...');
      
      // Store the stream
      this.stream = stream;
      
      this.isInitialized = true;
      console.log('[VoiceManager] Successfully initialized voice chat');
      
      // VoiceUI will control the initial mute state
      // We'll set it to active (unmuted) by default when permission is given
      this.isMuted = false;
      
      // Enable all audio tracks
      if (this.stream) {
        this.stream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
      }
      
      console.log('[VoiceManager] Initial microphone state set to unmuted');
      
      // Emit initial microphone state
      this.updateMicrophoneState();
      
      // Update local player's name label with initial state
      if (this.multiplayerManager) {
        console.log('[VoiceManager] Updating player label with unmuted state');
        this.multiplayerManager.updatePlayerVoiceState(this.clientId, this.isMuted);
      } else {
        console.warn('[VoiceManager] No multiplayerManager available for initial state');
      }
      
      // Update character manager's mute state
      if (this.characterManager) {
        this.characterManager.updateMuteState(this.isMuted);
      }

      return true;
      
    } catch (error) {
      console.error('[VoiceManager] Error initializing voice chat:', error);
      throw error; // Propagate the error to be handled by VoiceUI
    }
  }

  showPermissionRequest() {
    const permissionRequest = document.createElement('div');
    permissionRequest.id = 'voice-permission-request';
    permissionRequest.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background-color: #2196F3;
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
    
    permissionRequest.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Voice Chat Available</strong>
      </div>
      <div style="margin-bottom: 10px;">
        Click the microphone icon in your browser's address bar to enable voice chat.
      </div>
      <div style="font-size: 12px; opacity: 0.9;">
        You can always enable it later from your browser settings.
      </div>
    `;
    
    // Add some animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(permissionRequest);
    this.permissionRequestShownTime = Date.now();
  }

  hidePermissionRequest() {
    const permissionRequest = document.getElementById('voice-permission-request');
    if (permissionRequest) {
      permissionRequest.remove();
    }
  }

  showErrorNotification(error) {
    let errorMessage = 'Voice chat is currently disabled. ';
    if (error.name === 'NotAllowedError') {
      errorMessage += 'You can enable it later from your browser settings.';
    } else if (error.name === 'NotFoundError') {
      errorMessage += 'No microphone found. You can connect one later.';
    } else if (error.message.includes('HTTPS')) {
      errorMessage += 'Please use HTTPS or localhost.';
    } else if (error.message.includes('iframe')) {
      errorMessage += 'Please open the page directly in your browser.';
    } else {
      errorMessage += 'You can try again later.';
    }
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background-color: #f44336;
      color: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 1000;
      max-width: 300px;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    notification.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Voice Chat Disabled</strong>
      </div>
      <div style="margin-bottom: 10px;">
        ${errorMessage}
      </div>
      <div style="font-size: 12px; opacity: 0.9;">
        You can still play the game without voice chat.
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  setupSocketListeners() {
    if (!this.socket) return;

    console.log('[VoiceManager] Setting up socket listeners...');
    
    // Debug socket connection
    this.socket.on('connect', () => {
      console.log('[VoiceManager] Socket connected, ID:', this.socket.id);
      // Re-announce presence after reconnection
      if (this.stream) {
        console.log('[VoiceManager] Re-announcing presence after reconnection');
        this.socket.emit('voiceChat:announce', { userId: this.clientId });
      }
    });
    
    this.socket.on('disconnect', (reason) => {
      console.warn('[VoiceManager] Socket disconnected, reason:', reason);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('[VoiceManager] Socket connection error:', error);
    });

    this.socket.on('voiceChat:join', (data) => {
      console.log('[VoiceManager] User joined voice chat:', data);
      
      // Create a new peer connection as initiator
      this.createInitiator(data.userId);
      
      // Log confirmation of peer creation
      setTimeout(() => {
        console.log('[VoiceManager] Status after user joined:', this.showConnectionStatus());
      }, 1000);
    });
    
    // Handle announcements from other users already in the voice chat
    this.socket.on('voiceChat:announce', (data) => {
      console.log('[VoiceManager] User announced voice chat presence:', data);
      
      // Only create a connection if it's not ourselves
      if (data.userId !== this.clientId) {
        // Create a new peer connection as initiator
        this.createInitiator(data.userId);
        
        // Log confirmation of peer creation
        setTimeout(() => {
          console.log('[VoiceManager] Status after user announced:', this.showConnectionStatus());
        }, 1000);
      }
    });

    this.socket.on('voiceChat:signal', (data) => {
      console.log('[VoiceManager] Received signal from:', data.userId, 'Signal type:', data.signal.type || 'unknown');
      const peer = this.peers[data.userId];
      if (peer) {
        peer.signal(data.signal);
        console.log('[VoiceManager] Successfully passed signal to peer');
      } else {
        console.warn('[VoiceManager] No peer found for signal from:', data.userId);
        // Create peer if it doesn't exist yet
        this.createPeer(data.userId);
        // Try signaling again after peer is created
        setTimeout(() => {
          if (this.peers[data.userId]) {
            this.peers[data.userId].signal(data.signal);
            console.log('[VoiceManager] Delayed signal passed to new peer');
          } else {
            console.error('[VoiceManager] Failed to create peer for delayed signal');
          }
        }, 100);
      }
    });

    this.socket.on('voiceChat:leave', (data) => {
      console.log('[VoiceManager] User left voice chat:', data);
      this.removePeer(data.userId);
    });

    this.socket.on('voiceChat:state', (data) => {
      console.log('[VoiceManager] Received voice state update:', data);
      if (this.multiplayerManager) {
        this.multiplayerManager.updatePlayerVoiceState(data.userId, data.isMuted);
      }
    });
  }

  updateMicrophoneState() {
    if (this.socket) {
      console.log('[VoiceManager] Emitting microphone state:', this.isMuted);
      this.socket.emit('voiceChat:state', {
        userId: this.clientId,
        isMuted: this.isMuted
      });
    }
  }

  createPeer(userId) {
    console.log('[VoiceManager] Creating peer connection for user:', userId);
    
    // Create a new PeerConnection with proper callbacks
    const peer = new PeerConnection(
      this.stream,
      false, // Not initiator for incoming connections
      userId,
      (signal) => {
        console.log('[VoiceManager] Sending signal to:', userId);
        this.sendSignal(userId, signal);
      },
      (stream) => {
        console.log('[VoiceManager] Received stream from:', userId);
        this.handleStream(userId, stream);
      },
      () => {
        console.log('[VoiceManager] Peer closed for:', userId);
        this.removePeer(userId);
      }
    );
    
    this.peers[userId] = peer;
  }

  handleStream(userId, stream) {
    console.log('[VoiceManager] Handling stream for user:', userId);
    
    // Remove any existing audio element for this user
    if (this.audioElements[userId]) {
      this.audioElements[userId].remove();
      delete this.audioElements[userId];
    }
    
    // Create new audio element
    const audio = document.createElement('audio');
    
    // Important settings for voice chat audio
    audio.setAttribute('autoplay', 'autoplay');
    audio.setAttribute('playsinline', 'playsinline'); // For iOS
    audio.muted = false; // Ensure it's not muted
    audio.volume = 1.0;
    
    // Set the stream as the source
    audio.srcObject = stream;
    
    // Add to DOM for the audio to actually play
    document.body.appendChild(audio);
    
    // Make sure the audio is playing
    audio.play().catch(err => {
      console.error('[VoiceManager] Error playing audio:', err);
    });
    
    // Store reference to the audio element
    this.audioElements[userId] = audio;
    
    console.log('[VoiceManager] Audio element created and added to DOM for user:', userId);
  }

  removePeer(userId) {
    console.log('[VoiceManager] Removing peer:', userId);
    const peer = this.peers[userId];
    if (peer) {
      peer.destroy();
      delete this.peers[userId];
    }
    
    const audio = this.audioElements[userId];
    if (audio) {
      audio.srcObject = null;
      delete this.audioElements[userId];
    }
  }

  sendSignal(userId, signal) {
    if (this.socket) {
      console.log('[VoiceManager] Sending signal to server for user:', userId);
      this.socket.emit('voiceChat:signal', {
        userId: this.clientId,
        targetId: userId,
        signal: signal
      });
    }
  }

  toggleMute() {
    if (!this.stream) return false;
    
    this.isMuted = !this.isMuted;
    console.log('[VoiceManager] Toggling mute:', this.isMuted);
    
    // Mute/unmute all tracks in the stream
    this.stream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });

    // Update microphone state in multiplayer
    this.updateMicrophoneState();
    
    // Update local player's name label
    if (this.multiplayerManager) {
      console.log('[VoiceManager] Updating player voice state in MultiplayerManager: clientId=', this.clientId, 'isMuted=', this.isMuted);
      this.multiplayerManager.updatePlayerVoiceState(this.clientId, this.isMuted);
    } else {
      console.warn('[VoiceManager] No MultiplayerManager available to update voice state');
    }
    
    // Update the character manager's mute state
    if (this.characterManager) {
      this.characterManager.updateMuteState(this.isMuted);
    }
    
    return this.isMuted;
  }

  disconnect() {
    console.log('[VoiceManager] Disconnecting voice chat...');
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    Object.values(this.peers).forEach(peer => peer.destroy());
    this.peers = {};
    
    Object.values(this.audioElements).forEach(audio => {
      audio.srcObject = null;
    });
    this.audioElements = {};
    
    if (this.socket) {
      this.socket.emit('voiceChat:leave', { userId: this.clientId });
    }
  }

  // Add a new method to create initiator peer
  createInitiator(userId) {
    console.log('[VoiceManager] Creating initiator peer connection for user:', userId);
    
    // Create a new PeerConnection with initiator=true
    const peer = new PeerConnection(
      this.stream,
      true, // Initiator for outgoing connections
      userId,
      (signal) => {
        console.log('[VoiceManager] Sending initiator signal to:', userId);
        this.sendSignal(userId, signal);
      },
      (stream) => {
        console.log('[VoiceManager] Received stream from initiator:', userId);
        this.handleStream(userId, stream);
      },
      () => {
        console.log('[VoiceManager] Initiator peer closed for:', userId);
        this.removePeer(userId);
      }
    );
    
    this.peers[userId] = peer;
    
    // After creating the peer, show diagnostic info
    this.showConnectionStatus();
  }
  
  // Add diagnostic methods
  showConnectionStatus() {
    // Check socket connection
    const socketConnected = this.socket && this.socket.connected;
    console.log('[VoiceManager] Socket connection status:', socketConnected ? 'Connected' : 'Disconnected');
    
    // Check peer connections
    const peerCount = Object.keys(this.peers).length;
    console.log('[VoiceManager] Number of peer connections:', peerCount);
    
    // Check audio tracks in our stream
    if (this.stream) {
      const audioTracks = this.stream.getAudioTracks();
      console.log('[VoiceManager] Local audio tracks:', audioTracks.length);
      audioTracks.forEach((track, i) => {
        console.log(`[VoiceManager] Track ${i}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
        
        // Create audio level meter for this track
        this.createAudioMeter(track);
      });
    } else {
      console.log('[VoiceManager] No local audio stream available');
    }
    
    // Display diagnostic UI
    this.showDiagnosticUI();
    
    return {
      socketConnected,
      peerCount,
      hasLocalStream: !!this.stream,
      audioTrackCount: this.stream ? this.stream.getAudioTracks().length : 0,
      isMuted: this.isMuted
    };
  }
  
  createAudioMeter(track) {
    try {
      // Create an audio context
      const audioContext = new AudioContext();
      
      // Create a source from the track
      const stream = new MediaStream([track]);
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create an analyzer
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      // Get data array
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Check audio levels periodically
      const checkAudioLevel = () => {
        if (audioContext.state === 'closed') return;
        
        analyzer.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        console.log(`[VoiceManager] Audio level: ${average.toFixed(2)}`);
        
        // If audio level is consistently zero, there might be a problem
        if (average < 1) {
          console.warn('[VoiceManager] Very low audio level detected, microphone might not be capturing audio');
        }
        
        // Update the diagnostic meter if it exists
        const meter = document.getElementById('voice-audio-meter');
        if (meter) {
          meter.value = average;
          meter.style.setProperty('--audio-level', `${average}%`);
        }
        
        // Check again in 500ms
        setTimeout(checkAudioLevel, 500);
      };
      
      // Start checking
      checkAudioLevel();
      
    } catch (error) {
      console.error('[VoiceManager] Error creating audio meter:', error);
    }
  }
  
  showDiagnosticUI() {
    // Remove existing diagnostic UI if any
    const existingDiagnostic = document.getElementById('voice-diagnostic');
    if (existingDiagnostic) {
      existingDiagnostic.remove();
    }
    
    // Create diagnostic UI
    const diagnostic = document.createElement('div');
    diagnostic.id = 'voice-diagnostic';
    diagnostic.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      width: 250px;
    `;
    
    const socketStatus = this.socket && this.socket.connected ? '✅ Connected' : '❌ Disconnected';
    const streamStatus = this.stream ? '✅ Available' : '❌ Not available';
    const peerCount = Object.keys(this.peers).length;
    const muteStatus = this.isMuted ? '🔇 Muted' : '🔊 Unmuted';
    
    diagnostic.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Voice Chat Diagnostic</div>
      <div>Socket: ${socketStatus}</div>
      <div>Local Stream: ${streamStatus}</div>
      <div>Peer Connections: ${peerCount}</div>
      <div>Microphone: ${muteStatus}</div>
      <div style="margin-top: 5px;">
        <div>Audio Level:</div>
        <div style="background: #333; height: 10px; width: 100%; border-radius: 5px; margin-top: 3px;">
          <div id="voice-audio-meter" style="height: 100%; width: var(--audio-level, 0%); background: linear-gradient(to right, green, yellow, red); border-radius: 5px;"></div>
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 10px;">Click to dismiss</div>
    `;
    
    // Add click handler to dismiss
    diagnostic.addEventListener('click', () => {
      diagnostic.remove();
    });
    
    document.body.appendChild(diagnostic);
    
    // Start measuring audio levels if we have a stream
    if (this.stream) {
      const audioTracks = this.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        this.createAudioMeter(audioTracks[0]);
      }
    }
  }

  // Register console commands for diagnostics
  registerDiagnosticCommands() {
    // Add global command to check voice chat status
    window.checkVoiceStatus = () => {
      console.log('Running voice chat diagnostic...');
      return this.showConnectionStatus();
    };
    
    // Add global command to force reconnection
    window.forceVoiceReconnect = () => {
      console.log('Forcing voice chat reconnection...');
      // Disconnect all existing peers
      Object.values(this.peers).forEach(peer => peer.destroy());
      this.peers = {};
      
      // Re-announce presence
      if (this.socket) {
        this.socket.emit('voiceChat:announce', { userId: this.clientId });
        return 'Reconnection initiated';
      } else {
        return 'No socket connection available';
      }
    };
    
    console.log('Voice diagnostic commands registered: checkVoiceStatus(), forceVoiceReconnect()');
  }
}

export default VoiceManager; 
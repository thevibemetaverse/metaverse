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
    this.audioUnlocked = false;
    
    // Register global diagnostic commands
    this.registerDiagnosticCommands();
    
    // Ensure WebRTC adapter is loaded
    this.ensureWebRTCAdapter();
    
    // Setup audio unlock
    this.setupAudioUnlock();
  }
  
  // Ensure adapter.js is loaded for WebRTC compatibility
  async ensureWebRTCAdapter() {
    if (typeof adapter === 'undefined') {
      console.log('[VoiceManager] WebRTC adapter.js not detected, attempting to load it');
      try {
        // Try to dynamically load adapter.js
        const script = document.createElement('script');
        script.src = 'https://webrtc.github.io/adapter/adapter-latest.js';
        script.async = true;
        
        // Create a promise to wait for script to load
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('[VoiceManager] WebRTC adapter.js loaded successfully');
            resolve(true);
          };
          script.onerror = (err) => {
            console.error('[VoiceManager] Failed to load WebRTC adapter.js:', err);
            reject(err);
          };
        });
        
        // Add script to document
        document.head.appendChild(script);
        
        // Wait for script to load
        await loadPromise;
        
        // Log adapter details if available
        if (typeof adapter !== 'undefined') {
          console.log('[VoiceManager] adapter.js loaded:', adapter.browserDetails);
        }
      } catch (err) {
        console.error('[VoiceManager] Error loading WebRTC adapter.js:', err);
      }
    } else {
      console.log('[VoiceManager] WebRTC adapter.js already loaded:', adapter.browserDetails);
    }
  }

  setMultiplayerManager(multiplayerManager) {
    this.multiplayerManager = multiplayerManager;
  }
  
  setCharacterManager(characterManager) {
    this.characterManager = characterManager;
  }

  // Initialize basic socket connection without requesting microphone access
  async init(socket, clientId) {
    console.log('[VoiceManager] Initializing with socket and clientId:', clientId);
    
    this.socket = socket;
    this.clientId = clientId;
    
    // Check if socket is actually connected
    if (this.socket && !this.socket.connected) {
      console.warn('[VoiceManager] Socket provided but not connected. Will wait for connection.');
    }
    
    this.setupSocketListeners();
    
    // Announce presence by joining voice chat
    if (this.socket && this.socket.connected) {
      console.log('[VoiceManager] Socket already connected, joining voice chat');
      this.socket.emit('joinVoice', { userId: this.clientId });
    } else {
      console.log('[VoiceManager] Socket not connected yet, will join when connected');
    }
    
    return true;
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
      
      // Verify the stream has audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks found in the provided stream.');
      }
      
      console.log(`[VoiceManager] Stream has ${audioTracks.length} audio tracks`);
      audioTracks.forEach((track, i) => {
        console.log(`[VoiceManager] Track ${i}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
        
        // Ensure track is enabled
        track.enabled = true;
      });
      
      // Store the stream
      this.stream = stream;
      
      this.isInitialized = true;
      console.log('[VoiceManager] Successfully initialized voice chat');
      
      // VoiceUI will control the initial mute state
      // We'll set it to active (unmuted) by default when permission is given
      this.isMuted = false;
      
      // Recheck audio tracks are enabled
      if (this.stream) {
        this.stream.getAudioTracks().forEach(track => {
          track.enabled = true;
          console.log(`[VoiceManager] Ensuring track is enabled: ${track.enabled}`);
        });
      }
      
      console.log('[VoiceManager] Initial microphone state set to unmuted');
      
      // Emit initial microphone state
      this.updateMicrophoneState();
      
      // Join the voice chat after stream is initialized
      if (this.socket && this.clientId) {
        console.log('[VoiceManager] Joining voice chat after microphone initialization');
        this.socket.emit('joinVoice', { userId: this.clientId });
        
        // Request update from server after a short delay
        setTimeout(() => {
          console.log('[VoiceManager] Refreshing voice chat state');
          this.reconnect();
        }, 1000);
      } else {
        console.warn('[VoiceManager] Cannot join voice chat - no socket or clientId');
      }
      
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
      // Re-join voice chat after reconnection
      if (this.stream) {
        console.log('[VoiceManager] Re-joining voice chat after reconnection');
        this.socket.emit('joinVoice', { userId: this.clientId });
      }
    });
    
    this.socket.on('disconnect', (reason) => {
      console.warn('[VoiceManager] Socket disconnected, reason:', reason);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('[VoiceManager] Socket connection error:', error);
    });

    // Listen for server's voice join events
    this.socket.on('voiceJoined', (data) => {
      console.log(`[VoiceManager] User ${data.id} joined voice chat. Creating peer connection...`);
      // A new user has joined voice chat, create a peer connection
      if (data.id === this.clientId) {
        console.log('[VoiceManager] Ignoring self voice join event');
        return; // Skip self
      }

      // Check if we already have a connection for this user
      if (this.peers[data.id]) {
        console.log(`[VoiceManager] Connection for ${data.id} already exists, skipping creation`);
        return;
      }

      // Create a peer as initiator if we have a valid audio stream
      if (this.stream && typeof this.stream.getAudioTracks === 'function' && this.stream.getAudioTracks().length > 0) {
        this.createInitiator(data.id);
      } else {
        console.error(`[VoiceManager] Cannot create peer for ${data.id}: No valid audio stream available`);
        // Try to reinitialize the microphone
        this.reinitializeMicrophone().then(() => {
          if (this.stream && typeof this.stream.getAudioTracks === 'function' && this.stream.getAudioTracks().length > 0) {
            console.log(`[VoiceManager] Microphone reinitialized, creating peer for ${data.id}`);
            this.createInitiator(data.id);
          }
        }).catch(err => {
          console.error('[VoiceManager] Failed to reinitialize microphone:', err);
        });
      }
    });
    
    // Listen for voice signals from other peers
    this.socket.on('voiceSignal', (data) => {
      console.log(`[VoiceManager] Received voice signal from ${data.fromId}, signal type: ${data.signal.type || 'unknown'}`);
      
      if (!data.fromId || !data.signal) {
        console.error('[VoiceManager] Received invalid voice signal:', data);
        return;
      }

      // If we don't have a connection for this user yet, create one
      let peer = this.peers[data.fromId];
      if (!peer) {
        console.log(`[VoiceManager] Creating new non-initiator peer for ${data.fromId} due to incoming signal`);
        
        // Check if stream is valid before creating the peer
        if (!this.stream || typeof this.stream.getAudioTracks !== 'function') {
          console.error(`[VoiceManager] Cannot create peer for ${data.fromId}: No valid audio stream available`);
          // Try to reinitialize the microphone
          this.reinitializeMicrophone().then(() => {
            console.log(`[VoiceManager] Microphone reinitialized, creating peer for ${data.fromId}`);
            peer = this.createPeer(data.fromId);
            if (peer) {
              peer.signal(data.signal);
            }
          }).catch(err => {
            console.error('[VoiceManager] Failed to reinitialize microphone:', err);
          });
          return;
        }
        
        peer = this.createPeer(data.fromId);
        if (!peer) {
          console.error(`[VoiceManager] Failed to create peer for ${data.fromId}`);
          return;
        }
      }

      try {
        console.log(`[VoiceManager] Signaling to peer ${data.fromId}`);
        peer.signal(data.signal);
      } catch (err) {
        console.error(`[VoiceManager] Error signaling to peer ${data.fromId}:`, err);
      }
    });

    // Handle users leaving voice chat
    this.socket.on('voiceLeft', (data) => {
      console.log('[VoiceManager] User left voice chat:', data);
      this.removePeer(data.id);
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
    if (!userId) {
      console.error('[VoiceManager] Cannot create peer connection: missing user ID');
      return null;
    }
    
    // Skip if we already have a connection to this user
    if (this.peers[userId]) {
      console.log(`[VoiceManager] Already have a peer connection to ${userId}, skipping`);
      return this.peers[userId];
    }
    
    console.log('[VoiceManager] Creating peer connection for user:', userId);
    
    // Ensure we have a valid stream
    if (!this.stream || this.stream.getAudioTracks().length === 0) {
      console.error('[VoiceManager] Cannot create peer connection: no audio stream available');
      return null;
    }
    
    try {
      // Create a new PeerConnection with proper callbacks
      const peer = new PeerConnection(
        userId,
        this.stream,
        false, // Not initiator for incoming connections
        this.socket
      );
      
      // Set up event handlers
      peer.on('connect', () => {
        console.log(`[VoiceManager] Successfully connected to peer ${userId}`);
        
        // Update diagnostic UI if showing
        setTimeout(() => {
          this.showConnectionStatus();
        }, 500);
      });
      
      peer.on('stream', (stream) => {
        console.log(`[VoiceManager] Received stream from: ${userId}`);
        this.handleStream(userId, stream);
      });
      
      peer.on('close', () => {
        console.log(`[VoiceManager] Peer closed for: ${userId}`);
        this.removePeer(userId);
      });
      
      peer.on('error', (err) => {
        console.error(`[VoiceManager] Peer connection error with ${userId}:`, err);
      });
      
      this.peers[userId] = peer;
      return peer;
    } catch (error) {
      console.error(`[VoiceManager] Error creating peer for ${userId}:`, error);
      return null;
    }
  }

  handleStream(userId, stream) {
    console.log('[VoiceManager] Handling stream for user:', userId);
    
    // Signal that we received a stream
    this.emit('stream', { userId, stream });
    
    // Attempt to unlock audio on stream received
    if (!this.audioUnlocked) {
      this.tryUnlockAudio();
    }
    
    // Remove any existing audio element for this user
    if (this.audioElements[userId]) {
      this.audioElements[userId].remove();
      delete this.audioElements[userId];
    }
    
    // Verify stream has audio tracks
    if (!stream || typeof stream.getAudioTracks !== 'function') {
      console.error(`[VoiceManager] Invalid stream received for user ${userId}`);
      return;
    }
    
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error(`[VoiceManager] Stream for user ${userId} has no audio tracks`);
      return;
    }
    
    // Log audio track details
    audioTracks.forEach((track, i) => {
      console.log(`[VoiceManager] Remote track ${i} from ${userId}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
      
      // Ensure track is enabled
      if (!track.enabled) {
        console.log(`[VoiceManager] Enabling disabled remote track for ${userId}`);
        track.enabled = true;
      }
    });
    
    // Create new audio element
    const audio = document.createElement('audio');
    
    // Important settings for voice chat audio
    audio.setAttribute('autoplay', 'autoplay');
    audio.setAttribute('playsinline', 'playsinline'); // For iOS
    audio.setAttribute('controls', 'controls'); // Add controls for debugging
    audio.style.display = 'none'; // Hide the controls but allow debugging via inspection
    audio.muted = false; // Ensure it's not muted
    audio.volume = 1.0;
    
    // Set the stream as the source
    audio.srcObject = stream;
    
    // Add to DOM for the audio to actually play
    document.body.appendChild(audio);
    
    // Debug events
    audio.onplay = () => console.log(`[VoiceManager] Audio playback started for ${userId}`);
    audio.onpause = () => console.log(`[VoiceManager] Audio playback paused for ${userId}`);
    audio.onended = () => console.log(`[VoiceManager] Audio playback ended for ${userId}`);
    audio.onerror = (e) => console.error(`[VoiceManager] Audio error for ${userId}:`, e);
    
    // Make sure the audio is playing
    audio.play().then(() => {
      console.log(`[VoiceManager] Successfully started audio playback for ${userId}`);
    }).catch(err => {
      console.error(`[VoiceManager] Error playing audio for ${userId}:`, err);
      
      // Browser might require user interaction for audio playback - show a button
      if (err.name === 'NotAllowedError') {
        const enableAudioBtn = document.createElement('button');
        enableAudioBtn.textContent = 'Enable Voice Chat Audio';
        enableAudioBtn.style.position = 'fixed';
        enableAudioBtn.style.top = '60px';
        enableAudioBtn.style.right = '10px';
        enableAudioBtn.style.zIndex = '9999';
        enableAudioBtn.style.background = '#2196F3';
        enableAudioBtn.style.color = 'white';
        enableAudioBtn.style.border = 'none';
        enableAudioBtn.style.borderRadius = '4px';
        enableAudioBtn.style.padding = '8px 16px';
        
        enableAudioBtn.onclick = () => {
          // Try playing all audio elements
          Object.values(this.audioElements).forEach(audioEl => {
            audioEl.play().catch(e => console.error('Still failed to play:', e));
          });
          
          // Also try this specific one
          audio.play().then(() => {
            console.log(`[VoiceManager] Audio enabled for ${userId} by user interaction`);
            enableAudioBtn.remove();
          }).catch(e => {
            console.error(`[VoiceManager] Still failed to play audio for ${userId}:`, e);
          });
        };
        
        document.body.appendChild(enableAudioBtn);
      }
    });
    
    // Create audio meter to monitor levels
    this.createRemoteAudioMeter(stream, userId);
    
    // Store reference to the audio element
    this.audioElements[userId] = audio;
    
    console.log('[VoiceManager] Audio element created and added to DOM for user:', userId);
  }
  
  // Create an audio meter to debug remote audio streams
  createRemoteAudioMeter(stream, userId) {
    try {
      // Create an audio context
      const audioContext = new AudioContext();
      
      // Create a source from the stream
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create an analyzer
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      // Get data array
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Track continuous silence
      let silenceCounter = 0;
      
      // Check audio levels periodically
      const checkAudioLevel = () => {
        if (audioContext.state === 'closed' || !this.audioElements[userId]) return;
        
        analyzer.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Log less frequently to reduce console spam (5% chance)
        if (Math.random() < 0.05) {
          console.log(`[VoiceManager] Remote audio level for ${userId}: ${average.toFixed(2)}`);
        }
        
        // If audio level is consistently zero, there might be a problem
        if (average < 1) {
          silenceCounter++;
          if (silenceCounter > 20) { // After 10 seconds of silence
            console.warn(`[VoiceManager] Continuous silence detected in remote stream for ${userId}, audio might not be transmitting`);
            
            // Try to reconnect
            this.reconnectStreamForUser(userId);
            
            silenceCounter = 0; // Reset to avoid spamming
          }
        } else {
          silenceCounter = 0;
        }
        
        // Check again in 500ms if audio element still exists
        if (this.audioElements[userId]) {
          setTimeout(checkAudioLevel, 500);
        }
      };
      
      // Start checking
      checkAudioLevel();
      
    } catch (error) {
      console.error(`[VoiceManager] Error creating remote audio meter for ${userId}:`, error);
    }
  }
  
  // Try to reconnect a problematic stream
  reconnectStreamForUser(userId) {
    console.log(`[VoiceManager] Attempting to reconnect stream for ${userId}`);
    
    // Check if we have a peer connection
    if (!this.peers[userId]) {
      console.warn(`[VoiceManager] No peer connection found for ${userId}`);
      return;
    }
    
    // Check if audio element exists - if not, the stream probably wasn't set up correctly
    if (!this.audioElements[userId]) {
      console.log(`[VoiceManager] No audio element found for ${userId}, creating a new one`);
      
      // Try to get the stream from the peer connection
      const peer = this.peers[userId];
      if (peer.remoteStream) {
        console.log(`[VoiceManager] Found remote stream in peer connection, attempting to create audio element`);
        this.handleStream(userId, peer.remoteStream);
      } else {
        console.warn(`[VoiceManager] No remote stream found in peer connection for ${userId}`);
      }
      return;
    }
    
    // If audio element exists but is not playing, try to play it
    const audio = this.audioElements[userId];
    if (audio.paused) {
      console.log(`[VoiceManager] Audio for ${userId} is paused, attempting to play`);
      audio.play().catch(err => {
        console.error(`[VoiceManager] Failed to restart audio for ${userId}:`, err);
      });
    }
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
      audio.remove();
      delete this.audioElements[userId];
    }
  }

  sendSignal(userId, signal) {
    if (this.socket) {
      console.log('[VoiceManager] Sending signal to server for user:', userId);
      this.socket.emit('voiceSignal', {
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
      audio.remove();
    });
    this.audioElements = {};
    
    if (this.socket) {
      console.log('[VoiceManager] Leaving voice chat');
      this.socket.emit('leaveVoice', { userId: this.clientId });
    }
  }

  // Add a new method to create initiator peer
  createInitiator(userId) {
    if (!userId) {
      console.error('[VoiceManager] Cannot create peer connection: missing user ID');
      return null;
    }
    
    // Skip if we already have a connection to this user
    if (this.peers[userId]) {
      console.log(`[VoiceManager] Already have a peer connection to ${userId}, skipping`);
      return this.peers[userId];
    }
    
    console.log('[VoiceManager] Creating initiator peer connection for user:', userId);
    
    // Ensure we have a valid stream
    if (!this.stream || this.stream.getAudioTracks().length === 0) {
      console.error('[VoiceManager] Cannot create peer connection: no audio stream available');
      return null;
    }
    
    try {
      // Check parameter order to ensure correct creation of PeerConnection
      const peer = new PeerConnection(
        userId,
        this.stream,
        true, // Initiator for outgoing connections
        this.socket
      );
      
      // Set up event handlers
      peer.on('connect', () => {
        console.log(`[VoiceManager] Successfully connected to peer ${userId}`);
        
        // Update diagnostic UI if showing
        setTimeout(() => {
          this.showConnectionStatus();
        }, 500);
      });
      
      peer.on('stream', (stream) => {
        console.log(`[VoiceManager] Received stream from initiator: ${userId}`);
        this.handleStream(userId, stream);
      });
      
      peer.on('close', () => {
        console.log(`[VoiceManager] Initiator peer closed for: ${userId}`);
        this.removePeer(userId);
      });
      
      peer.on('error', (err) => {
        console.error(`[VoiceManager] Peer connection error with ${userId}:`, err);
      });
      
      this.peers[userId] = peer;
      
      // After creating the peer, show diagnostic info
      setTimeout(() => {
        this.showConnectionStatus();
      }, 500);
      
      return peer;
    } catch (error) {
      console.error(`[VoiceManager] Error creating initiator for ${userId}:`, error);
      return null;
    }
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
      
      // Track continuous silence
      let silenceCounter = 0;
      
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
        
        // Log less frequently to reduce console spam
        if (Math.random() < 0.1) {
          console.log(`[VoiceManager] Audio level: ${average.toFixed(2)}`);
        }
        
        // If audio level is consistently zero, there might be a problem
        if (average < 1) {
          silenceCounter++;
          if (silenceCounter > 10) {
            console.warn('[VoiceManager] Continuous silence detected for 5 seconds, microphone might not be capturing audio');
            
            // Show a warning in the UI
            const warningElement = document.getElementById('voice-mic-warning');
            if (!warningElement && document.getElementById('voice-diagnostic')) {
              const warning = document.createElement('div');
              warning.id = 'voice-mic-warning';
              warning.style.color = '#ff9800';
              warning.style.marginTop = '5px';
              warning.style.fontSize = '11px';
              warning.textContent = 'No audio detected! Try speaking or check microphone settings.';
              document.getElementById('voice-diagnostic').appendChild(warning);
            }
            
            silenceCounter = 0; // Reset to avoid spamming
          }
        } else {
          silenceCounter = 0;
          
          // Remove warning if audio is now detected
          const warningElement = document.getElementById('voice-mic-warning');
          if (warningElement) {
            warningElement.remove();
          }
        }
        
        // Update the diagnostic meter if it exists
        const meter = document.getElementById('voice-audio-meter');
        if (meter) {
          const scaledLevel = Math.min(100, average * 2); // Scale up for better visibility
          meter.style.width = `${scaledLevel}%`;
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
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 14px;
      z-index: 1000;
      width: 300px;
    `;
    
    const socketStatus = this.socket && this.socket.connected ? '✅ Connected' : '❌ Disconnected';
    const streamStatus = this.stream ? '✅ Available' : '❌ Not available';
    const peerCount = Object.keys(this.peers).length;
    const muteStatus = this.isMuted ? '🔇 Muted' : '🔊 Unmuted';
    
    // Get peer status information
    let peerDetails = '';
    if (peerCount > 0) {
      peerDetails = '<div style="margin-top: 5px; font-size: 12px; color: #aaa;">Connected peers:</div>';
      Object.keys(this.peers).forEach(peerId => {
        peerDetails += `<div style="font-size: 11px; margin-left: 10px;">• ${peerId}</div>`;
      });
    } else if (this.multiplayerManager && this.multiplayerManager.players) {
      // Check if there are other players but no connections
      let otherPlayersCount = 0;
      
      // Handle players as either an Array, Map, or Object
      if (Array.isArray(this.multiplayerManager.players)) {
        otherPlayersCount = this.multiplayerManager.players.filter(player => 
          player && player.id && player.id !== this.clientId
        ).length;
      } else if (this.multiplayerManager.players instanceof Map) {
        this.multiplayerManager.players.forEach((player, id) => {
          if (id !== this.clientId) otherPlayersCount++;
        });
      } else if (typeof this.multiplayerManager.players === 'object') {
        otherPlayersCount = Object.keys(this.multiplayerManager.players)
          .filter(id => id !== this.clientId).length;
      }
      
      if (otherPlayersCount > 0) {
        peerDetails = `<div style="margin-top: 5px; font-size: 12px; color: #ff9800;">❗ ${otherPlayersCount} other players but no connections</div>`;
      }
    }
    
    // Check if any audio elements exist but aren't playing
    let audioStatus = '';
    if (Object.keys(this.audioElements).length > 0) {
      let playingCount = 0;
      let pausedCount = 0;
      
      Object.entries(this.audioElements).forEach(([id, audio]) => {
        if (audio.paused) {
          pausedCount++;
        } else {
          playingCount++;
        }
      });
      
      if (pausedCount > 0) {
        audioStatus = `<div style="margin-top: 5px; font-size: 12px; color: #ff9800;">⚠️ ${pausedCount} audio streams paused, ${playingCount} playing</div>`;
      } else {
        audioStatus = `<div style="margin-top: 5px; font-size: 12px; color: #4CAF50;">✅ ${playingCount} audio streams playing</div>`;
      }
    }
    
    diagnostic.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">Voice Chat Diagnostic</div>
      <div>Socket: ${socketStatus}</div>
      <div>Local Stream: ${streamStatus}</div>
      <div>Peer Connections: ${peerCount}</div>
      <div>Microphone: ${muteStatus}</div>
      ${peerDetails}
      ${audioStatus}
      <div style="margin-top: 10px;">
        <div>Audio Level:</div>
        <div style="background: #333; height: 15px; width: 100%; border-radius: 5px; margin-top: 5px; overflow: hidden;">
          <div id="voice-audio-meter" style="height: 100%; width: 0%; background: linear-gradient(to right, green, yellow, red); border-radius: 5px; transition: width 0.2s ease-in-out;"></div>
        </div>
      </div>
      <div style="margin-top: 15px; display: flex; justify-content: space-between; flex-wrap: wrap;">
        <button id="voice-test-btn" style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px; margin-bottom: 5px;">Test Sound</button>
        <button id="voice-connect-btn" style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px; margin-bottom: 5px;">Connect All</button>
        <button id="voice-close-btn" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px; margin-bottom: 5px;">Close</button>
        <button id="voice-fix-audio-btn" style="background: #FF9800; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px; margin-bottom: 5px; width: 100%;">Fix Audio Playback</button>
      </div>
    `;
    
    document.body.appendChild(diagnostic);
    
    // Add click handlers for buttons
    document.getElementById('voice-test-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.playTestSound();
    });
    
    document.getElementById('voice-connect-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.forceConnectToAllUsers();
      setTimeout(() => {
        this.showConnectionStatus();
      }, 1000);
    });
    
    document.getElementById('voice-close-btn').addEventListener('click', () => {
      diagnostic.remove();
    });
    
    document.getElementById('voice-fix-audio-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.fixAudioPlayback();
    });
    
    // Prevent clicks on the diagnostic from closing it (except for the close button)
    diagnostic.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Start measuring audio levels if we have a stream
    if (this.stream) {
      const audioTracks = this.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        this.createAudioMeter(audioTracks[0]);
      }
    }
  }

  // Method to fix audio playback issues
  fixAudioPlayback() {
    console.log('[VoiceManager] Attempting to fix audio playback issues...');
    
    // First, create a temporary audio context to unlock audio on browsers that require user interaction
    const tempContext = new AudioContext();
    const tempOsc = tempContext.createOscillator();
    const tempGain = tempContext.createGain();
    
    // Set gain to 0 so we don't hear it
    tempGain.gain.value = 0;
    
    // Connect nodes
    tempOsc.connect(tempGain);
    tempGain.connect(tempContext.destination);
    
    // Play for a fraction of a second
    tempOsc.start();
    tempOsc.stop(tempContext.currentTime + 0.001);
    
    console.log('[VoiceManager] Audio context unlocking attempted');
    
    // Get all audio elements on page
    const allAudioElements = document.querySelectorAll('audio');
    console.log(`[VoiceManager] Found ${allAudioElements.length} audio elements`);
    
    // Try to play all audio elements
    allAudioElements.forEach((audio, index) => {
      try {
        // Check if paused
        if (audio.paused) {
          console.log(`[VoiceManager] Trying to play paused audio element ${index}`);
          audio.volume = 1.0;
          audio.muted = false;
          audio.play().then(() => {
            console.log(`[VoiceManager] Successfully played audio element ${index}`);
          }).catch(err => {
            console.error(`[VoiceManager] Failed to play audio element ${index}:`, err);
          });
        } else {
          console.log(`[VoiceManager] Audio element ${index} is already playing`);
        }
      } catch (err) {
        console.error(`[VoiceManager] Error handling audio element ${index}:`, err);
      }
    });
    
    // Try to recreate all our audio elements
    console.log('[VoiceManager] Attempting to recreate audio elements for peer connections');
    Object.entries(this.peers).forEach(([userId, peer]) => {
      try {
        if (peer.remoteStream) {
          console.log(`[VoiceManager] Recreating audio element for peer ${userId}`);
          this.handleStream(userId, peer.remoteStream);
        } else {
          console.log(`[VoiceManager] No remote stream for peer ${userId}`);
        }
      } catch (err) {
        console.error(`[VoiceManager] Error recreating audio for peer ${userId}:`, err);
      }
    });
    
    // Show a success message
    const message = document.createElement('div');
    message.textContent = 'Attempted to fix audio. Please check if you can hear other users now.';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-family: sans-serif;
      font-size: 14px;
      z-index: 9999;
    `;
    
    document.body.appendChild(message);
    
    // Remove after 5 seconds
    setTimeout(() => {
      message.remove();
    }, 5000);
  }

  // Add a reconnect method for recovering from connection issues
  reconnect() {
    console.log('[VoiceManager] Attempting to reconnect voice chat...');
    
    // Clean up existing connections
    Object.values(this.peers).forEach(peer => peer.destroy());
    this.peers = {};
    
    // Check if stream is valid
    if (!this.stream || this.stream.getAudioTracks().length === 0) {
      console.error('[VoiceManager] Cannot reconnect - no valid audio stream');
      return false;
    }
    
    // Make sure tracks are enabled
    this.stream.getAudioTracks().forEach(track => {
      if (!track.enabled && !this.isMuted) {
        console.log('[VoiceManager] Re-enabling audio track that was incorrectly disabled');
        track.enabled = true;
      }
    });
    
    // Re-join voice chat
    if (this.socket && this.socket.connected && this.clientId) {
      console.log('[VoiceManager] Re-joining voice chat');
      this.socket.emit('joinVoice', { userId: this.clientId });
      
      // Also broadcast current mute state
      this.updateMicrophoneState();
      
      return true;
    } else {
      console.error('[VoiceManager] Cannot reconnect - socket not connected');
      return false;
    }
  }
  
  // Register console commands for diagnostics
  registerDiagnosticCommands() {
    // Make diagnostic functions available in the global scope for debugging
    window.checkVoiceStatus = () => {
      console.log('[Voice Diagnostic] Status:', this.showConnectionStatus());
      return this.showConnectionStatus();
    };
    
    window.forceVoiceReconnect = () => {
      console.log('[Voice Diagnostic] Forcing reconnection');
      this.reinitialize();
      console.log('[Voice Diagnostic] Reconnection attempt completed');
      return 'Reconnection attempt initiated';
    };
    
    window.reinitializeMicrophone = async () => {
      console.log('[Voice Diagnostic] Reinitializing microphone');
      this.stopMicrophone();
      try {
        await this.startMicrophone();
        console.log('[Voice Diagnostic] Microphone reinitialized successfully');
        return 'Microphone reinitialized successfully';
      } catch (err) {
        console.error('[Voice Diagnostic] Failed to reinitialize microphone:', err);
        return `Failed to reinitialize microphone: ${err.message}`;
      }
    };
    
    window.forceConnectToAll = () => {
      this.forceConnectToAllUsers();
      return 'Attempting to connect to all users';
    };
    
    window.testAudioOutput = () => {
      this.testAudioOutput();
      return 'Playing test sound';
    };
    
    window.dumpPlayers = () => {
      this.dumpPlayerInfo();
      return 'Player info dumped to console';
    };
    
    window.testWebRTC = () => {
      this.testDirectWebRTC();
      return 'WebRTC test initiated';
    };
    
    window.testWebRTCVersions = () => {
      return this.testWebRTCVersions();
    };
  }
  
  // Force connections to all users
  forceConnectToAllUsers() {
    console.log('[VoiceManager] Forcing connections to all active users');
    
    if (!this.stream) {
      console.error('[VoiceManager] Cannot connect - no local stream available');
      return 'Failed: No microphone stream available';
    }
    
    // Validate that stream is a proper MediaStream with audio tracks
    if (typeof this.stream.getAudioTracks !== 'function') {
      console.error('[VoiceManager] Cannot connect - stream is not a valid MediaStream');
      
      // Try to reinitialize the microphone
      console.log('[VoiceManager] Attempting to reinitialize microphone...');
      this.reinitializeMicrophone().then(() => {
        console.log('[VoiceManager] Microphone reinitialized, retrying connections');
        // Try again after stream is reinitialized
        this.forceConnectToAllUsers();
      }).catch(err => {
        console.error('[VoiceManager] Failed to reinitialize microphone:', err);
      });
      
      return 'Failed: Invalid audio stream, attempting to reinitialize';
    }
    
    const audioTracks = this.stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error('[VoiceManager] Cannot connect - stream has no audio tracks');
      return 'Failed: No audio tracks in stream';
    }
    
    if (!this.socket || !this.socket.connected) {
      console.error('[VoiceManager] Cannot connect - socket not connected');
      return 'Failed: Socket not connected';
    }
    
    // Request the server to re-broadcast all users
    this.socket.emit('joinVoice', { userId: this.clientId, forceReconnect: true });
    
    // Also try to directly establish connections if we know other players
    if (this.multiplayerManager && this.multiplayerManager.players) {
      let connectedCount = 0;
      
      // Get all player IDs
      const playerIds = [];
      
      // Handle players as either an Array, Map, or Object
      if (Array.isArray(this.multiplayerManager.players)) {
        // Players is an array of objects with ids
        this.multiplayerManager.players.forEach(player => {
          if (player && player.id && player.id !== this.clientId) {
            playerIds.push(player.id);
          }
        });
      } else if (this.multiplayerManager.players instanceof Map) {
        // Players is a Map with keys as ids
        this.multiplayerManager.players.forEach((player, id) => {
          if (id && id !== this.clientId) {
            playerIds.push(id);
          }
        });
      } else if (typeof this.multiplayerManager.players === 'object') {
        // Players is an object with keys as ids
        Object.keys(this.multiplayerManager.players).forEach(id => {
          if (id && id !== this.clientId) {
            playerIds.push(id);
          }
        });
      }
      
      console.log(`[VoiceManager] Found ${playerIds.length} other players to connect to`);
      
      // Connect to each player
      playerIds.forEach(playerId => {
        try {
          // Create initiator connection to this player
          console.log(`[VoiceManager] Forcing connection to player: ${playerId}`);
          const result = this.createInitiator(playerId);
          if (result) {
            connectedCount++;
          }
        } catch (error) {
          console.error(`[VoiceManager] Failed to create connection to player ${playerId}:`, error);
        }
      });
      
      // Show status
      setTimeout(() => {
        this.showConnectionStatus();
      }, 1000);
      
      return `Initiated ${connectedCount} connections`;
    } else {
      return 'No other players found to connect to';
    }
  }
  
  // Helper method to reinitialize microphone
  async reinitializeMicrophone() {
    console.log('[VoiceManager] Reinitializing microphone');
    
    // Stop current stream if it exists
    if (this.stream) {
      try {
        if (typeof this.stream.getTracks === 'function') {
          this.stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error('[VoiceManager] Error stopping existing tracks:', err);
      }
      this.stream = null;
    }
    
    // Request new microphone access
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('[VoiceManager] Successfully acquired new microphone stream');
      this.stream = newStream;
      
      // Update mute state
      if (this.stream && typeof this.stream.getAudioTracks === 'function') {
        this.stream.getAudioTracks().forEach(track => {
          track.enabled = !this.isMuted;
        });
      }
      
      return true;
    } catch (error) {
      console.error('[VoiceManager] Failed to get new microphone stream:', error);
      throw error;
    }
  }
  
  // Play a test sound to verify audio output is working
  playTestSound() {
    try {
      console.log('[VoiceManager] Playing test sound...');
      
      // Create audio context
      const audioContext = new AudioContext();
      
      // Create oscillator
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      
      // Create gain node to control volume
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // 10% volume
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Start oscillator
      oscillator.start();
      
      // Stop after 1 second
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        console.log('[VoiceManager] Test sound completed');
      }, 1000);
      
      return 'Playing test sound...';
    } catch (error) {
      console.error('[VoiceManager] Error playing test sound:', error);
      return `Failed to play test sound: ${error.message}`;
    }
  }

  // Debug function to dump player information
  dumpPlayerInfo() {
    console.log('[VoiceManager] Dumping player information for debugging');
    
    if (!this.multiplayerManager) {
      console.warn('[VoiceManager] No multiplayer manager available');
      return 'No multiplayer manager';
    }
    
    if (!this.multiplayerManager.players) {
      console.warn('[VoiceManager] No players collection in multiplayer manager');
      return 'No players collection';
    }
    
    console.log('[VoiceManager] Client ID:', this.clientId);
    
    // Check the type of players collection
    const playersType = Array.isArray(this.multiplayerManager.players) 
      ? 'Array' 
      : this.multiplayerManager.players instanceof Map 
        ? 'Map' 
        : 'Object';
    
    console.log(`[VoiceManager] Players collection type: ${playersType}`);
    
    // Get all player IDs and information
    const playerInfo = [];
    
    if (playersType === 'Array') {
      this.multiplayerManager.players.forEach((player, idx) => {
        playerInfo.push({
          index: idx,
          id: player?.id,
          hasId: !!player?.id,
          type: typeof player
        });
      });
    } else if (playersType === 'Map') {
      this.multiplayerManager.players.forEach((player, id) => {
        playerInfo.push({
          id: id,
          playerType: typeof player,
          isValid: !!player
        });
      });
    } else {
      Object.keys(this.multiplayerManager.players).forEach(id => {
        const player = this.multiplayerManager.players[id];
        playerInfo.push({
          id: id,
          playerType: typeof player,
          isValid: !!player
        });
      });
    }
    
    console.table(playerInfo);
    
    // Check that socket is properly connected
    if (this.socket) {
      console.log(`[VoiceManager] Socket connected: ${this.socket.connected}`);
      console.log(`[VoiceManager] Socket ID: ${this.socket.id}`);
    } else {
      console.warn('[VoiceManager] No socket available');
    }
    
    return {
      clientId: this.clientId,
      playersType,
      playerCount: playerInfo.length,
      playerInfo,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id
    };
  }

  // Test WebRTC compatibility and version info
  testWebRTCVersions() {
    console.log('[WebRTC Version Test]');
    // Test browser detection
    console.log('Browser:', navigator.userAgent);
    
    // Check adapter.js if available
    if (typeof adapter !== 'undefined') {
      console.log('adapter.js version:', adapter.browserDetails.version);
      console.log('Browser:', adapter.browserDetails.browser);
      console.log('Browser version:', adapter.browserDetails.version);
    } else {
      console.log('adapter.js not detected - this might cause WebRTC compatibility issues');
    }
    
    // Check RTCPeerConnection support
    if (typeof RTCPeerConnection !== 'undefined') {
      console.log('RTCPeerConnection is supported');
    } else {
      console.log('RTCPeerConnection is NOT supported - WebRTC will not work');
    }
    
    // Check getUserMedia support
    const getUserMedia = navigator.getUserMedia || 
                         navigator.webkitGetUserMedia || 
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia;
    
    if (getUserMedia || navigator.mediaDevices?.getUserMedia) {
      console.log('getUserMedia is supported');
    } else {
      console.log('getUserMedia is NOT supported - microphone access will not work');
    }
    
    // Check simple-peer library
    try {
      const Peer = require('simple-peer');
      console.log('simple-peer library is available, version:', Peer.version || 'unknown');
    } catch (err) {
      console.log('simple-peer library could not be loaded:', err.message);
    }
    
    return {
      status: 'completed',
      rtcSupported: typeof RTCPeerConnection !== 'undefined',
      mediaSupported: !!(getUserMedia || navigator.mediaDevices?.getUserMedia),
      adapterAvailable: typeof adapter !== 'undefined'
    };
  }

  // Setup audio unlock to handle browser autoplay policies
  setupAudioUnlock() {
    console.log('[VoiceManager] Setting up audio unlock handlers');
    
    // Browsers often require user interaction before allowing audio to play
    // We'll listen for any user interaction to unlock audio
    const unlockAudio = () => {
      if (this.audioUnlocked) return;
      
      console.log('[VoiceManager] User interaction detected, attempting to unlock audio...');
      
      try {
        // Create a silent audio context to unlock audio playback
        const audioContext = new AudioContext();
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        
        // Also try to play all audio elements
        document.querySelectorAll('audio').forEach(audio => {
          if (audio.paused) {
            audio.muted = false;
            audio.play().catch(() => {
              // Ignore any errors - we just want to try
            });
          }
        });
        
        console.log('[VoiceManager] Audio unlocked successfully');
        this.audioUnlocked = true;
        
        // Show notification
        this.showAudioEnabledNotification();
        
        // Remove event listeners since we only need to do this once
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      } catch (err) {
        console.error('[VoiceManager] Error unlocking audio:', err);
      }
    };
    
    // Listen for any user interaction
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    
    // Also attempt to unlock on stream received
    this.on('stream', () => {
      // Don't show the notification this time - just try to enable audio
      if (!this.audioUnlocked) {
        try {
          const audioContext = new AudioContext();
          const buffer = audioContext.createBuffer(1, 1, 22050);
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          source.start(0);
          
          this.audioUnlocked = true;
          console.log('[VoiceManager] Audio unlocked on stream received');
        } catch (err) {
          console.error('[VoiceManager] Failed to unlock audio on stream received:', err);
        }
      }
    });
  }
  
  // Event system for VoiceManager
  on(event, callback) {
    if (!this._eventHandlers) this._eventHandlers = {};
    if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
    this._eventHandlers[event].push(callback);
    return this;
  }
  
  emit(event, data) {
    if (!this._eventHandlers || !this._eventHandlers[event]) return;
    this._eventHandlers[event].forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[VoiceManager] Error in event handler for ${event}:`, err);
      }
    });
  }
  
  // Show a notification that audio has been enabled
  showAudioEnabledNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(33, 150, 243, 0.9);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-family: sans-serif;
      font-size: 14px;
      z-index: 9999;
      animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
      pointer-events: none;
    `;
    
    notification.textContent = '🔊 Voice chat audio enabled';
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, -20px); }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 3000);
  }

  // Try to unlock audio playback by creating a silent audio context
  tryUnlockAudio() {
    try {
      // Create silent audio buffer
      const audioContext = new AudioContext();
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      
      this.audioUnlocked = true;
      console.log('[VoiceManager] Audio unlocked programmatically');
    } catch (err) {
      console.error('[VoiceManager] Failed to unlock audio programmatically:', err);
    }
  }
}

export default VoiceManager; 
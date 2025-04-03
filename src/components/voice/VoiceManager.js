import { io } from 'socket.io-client';
import PeerConnection from './PeerConnection';

class VoiceManager {
  constructor(scene) {
    this.scene = scene;
    this.stream = null;
    this.socket = null;
    this.peers = {};
    this.audioElements = {};
    this.isMuted = false;
    this.isInitialized = false;
    
    // Reference to the existing multiplayer system
    this.clientId = null;
    this.multiplayerManager = null;
    this.characterManager = null;
  }

  setMultiplayerManager(multiplayerManager) {
    this.multiplayerManager = multiplayerManager;
  }
  
  setCharacterManager(characterManager) {
    this.characterManager = characterManager;
  }

  async init(socket, clientId) {
    try {
      // More robust MediaDevices API check
      if (!navigator.mediaDevices) {
        // Try to polyfill for older browsers
        navigator.mediaDevices = {};
      }

      // Some browsers partially support mediaDevices. We need getUserMedia
      if (!navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
          const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
          
          if (!getUserMedia) {
            throw new Error('getUserMedia is not implemented in this browser');
          }
          
          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        };
      }

      // Check if we're in an iframe
      if (window.self !== window.top) {
        throw new Error('Voice chat is not supported in iframes. Please open the page directly.');
      }

      // Check if we're on HTTPS (required for getUserMedia)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Voice chat requires a secure connection (HTTPS). Please use HTTPS or localhost.');
      }

      console.log('[VoiceManager] Requesting microphone access...');
      
      // Request microphone access with fallback options
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }, 
          video: false 
        });
        console.log('[VoiceManager] Successfully got microphone access with advanced settings');
      } catch (mediaError) {
        console.log('[VoiceManager] Falling back to basic microphone settings');
        // Try with simpler constraints if advanced ones fail
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: false 
        });
      }
      
      // Store socket and client ID
      this.socket = socket;
      this.clientId = clientId;
      
      // Set up socket listeners
      this.setupSocketListeners();
      
      this.isInitialized = true;
      console.log('[VoiceManager] Successfully initialized voice chat');
      
      // Add test audio feedback
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(this.stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.1; // Set to 10% volume for feedback
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Emit initial microphone state
      this.updateMicrophoneState();
      
      // Update local player's name label with initial state
      if (this.multiplayerManager) {
        this.multiplayerManager.updatePlayerVoiceState(this.clientId, this.isMuted);
      }
      
    } catch (error) {
      console.error('[VoiceManager] Error initializing voice chat:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to initialize voice chat. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.message.includes('HTTPS')) {
        errorMessage += 'Please use HTTPS or localhost.';
      } else if (error.message.includes('iframe')) {
        errorMessage += 'Please open the page directly in your browser, not in an iframe.';
      } else if (error.message.includes('getUserMedia')) {
        errorMessage += 'Your browser may be blocking microphone access. Please check your browser settings and try again.';
      } else {
        errorMessage += error.message;
      }
      
      // Create error notification with troubleshooting steps
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
      
      // Add troubleshooting steps
      const troubleshooting = document.createElement('div');
      troubleshooting.style.cssText = `
        margin-top: 10px;
        font-size: 12px;
        opacity: 0.9;
      `;
      troubleshooting.innerHTML = `
        <strong>Troubleshooting steps:</strong><br>
        1. Make sure you're using Chrome, Firefox, or Edge<br>
        2. Check if your microphone is connected and working<br>
        3. Look for a microphone icon in your browser's address bar<br>
        4. Try refreshing the page<br>
        5. If using an iframe, open the page directly in your browser
      `;
      
      notification.appendChild(document.createTextNode(errorMessage));
      notification.appendChild(troubleshooting);
      document.body.appendChild(notification);
      
      // Remove notification after 10 seconds
      setTimeout(() => {
        notification.remove();
      }, 10000);
      
      // Disable voice chat
      this.isInitialized = false;
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    console.log('[VoiceManager] Setting up socket listeners...');

    this.socket.on('voiceChat:join', (data) => {
      console.log('[VoiceManager] User joined voice chat:', data);
      this.createPeer(data.userId);
    });

    this.socket.on('voiceChat:signal', (data) => {
      console.log('[VoiceManager] Received signal from:', data.userId);
      const peer = this.peers[data.userId];
      if (peer) {
        peer.signal(data.signal);
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
    const peer = new PeerConnection(this.stream);
    this.peers[userId] = peer;
    
    peer.on('signal', (signal) => {
      console.log('[VoiceManager] Sending signal to:', userId);
      this.sendSignal(userId, signal);
    });
    
    peer.on('stream', (stream) => {
      console.log('[VoiceManager] Received stream from:', userId);
      this.handleStream(userId, stream);
    });
  }

  handleStream(userId, stream) {
    console.log('[VoiceManager] Handling stream for user:', userId);
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    this.audioElements[userId] = audio;
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
      this.multiplayerManager.updatePlayerVoiceState(this.clientId, this.isMuted);
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
}

export default VoiceManager; 
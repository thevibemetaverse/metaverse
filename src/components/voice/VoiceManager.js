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
      
      // Add test audio feedback
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(this.stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.1; // Set to 10% volume for feedback
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
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
}

export default VoiceManager; 
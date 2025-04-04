import Peer from 'simple-peer';

class PeerConnection {
  constructor(userId, stream, initiator, socket) {
    console.log(`[PeerConnection:${userId}] Creating peer connection, initiator: ${initiator}`);
    
    this.userId = userId;
    this.stream = stream;
    this.socket = socket;
    this.connected = false;
    this.hasRemoteStream = false;
    this.eventHandlers = {};
    this.remoteStream = null;
    this.audioElement = null;

    // Log stream info with better error handling
    if (stream) {
      try {
        // Defensive check to handle cases where stream object doesn't have getAudioTracks
        if (typeof stream.getAudioTracks === 'function') {
          const audioTracks = stream.getAudioTracks();
          console.log(`[PeerConnection:${userId}] Stream provided with ${audioTracks.length} audio tracks`);
          audioTracks.forEach((track, i) => {
            console.log(`[PeerConnection:${userId}] Track ${i}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
          });
        } else {
          console.warn(`[PeerConnection:${userId}] Stream provided doesn't have getAudioTracks method`);
          // Try to detect what type of object was provided
          console.warn(`[PeerConnection:${userId}] Stream is of type: ${typeof stream}, constructor: ${stream.constructor?.name || 'unknown'}`);
        }
      } catch (err) {
        console.error(`[PeerConnection:${userId}] Error accessing stream properties:`, err);
      }
    } else {
      console.warn(`[PeerConnection:${userId}] No stream provided!`);
    }
    
    try {
      // Check if stream is valid before proceeding
      let validStream = stream;
      if (stream && typeof stream.getAudioTracks !== 'function') {
        console.warn(`[PeerConnection:${userId}] Stream provided is not a valid MediaStream, setting to null`);
        validStream = null;
      }
      
      // Create the peer with debug enabled
      // Use a more compatible configuration to avoid issues
      this.peer = new Peer({
        initiator,
        stream: validStream,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        },
        // Add these options to ensure compatibility
        objectMode: true,
        offerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        },
        sdpTransform: (sdp) => {
          // Log SDP for debugging
          console.log(`[PeerConnection:${userId}] SDP ${initiator ? 'offer' : 'answer'} created`);
          return sdp;
        }
      });
      
      // Set up event handlers with better error handling
      this.peer.on('signal', data => {
        console.log(`[PeerConnection:${userId}] Generated signal of type: ${data.type || 'unknown'}`);
        try {
          this.sendSignal(data);
        } catch (error) {
          console.error(`[PeerConnection:${userId}] Error in signal callback:`, error);
        }
      });

      this.peer.on('connect', () => {
        console.log(`[PeerConnection:${userId}] Peer connection established!`);
        this.connected = true;
        this.emitEvent('connect');
      });

      this.peer.on('stream', stream => {
        console.log(`[PeerConnection:${userId}] Received remote stream with ${stream.getTracks().length} tracks`);
        this.hasRemoteStream = true;
        this.remoteStream = stream;
        
        // Log the remote stream's audio tracks
        if (stream && typeof stream.getAudioTracks === 'function') {
          const audioTracks = stream.getAudioTracks();
          console.log(`[PeerConnection:${userId}] Remote stream has ${audioTracks.length} audio tracks`);
          audioTracks.forEach((track, i) => {
            console.log(`[PeerConnection:${userId}] Remote track ${i}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
            
            // Ensure track is enabled
            if (!track.enabled) {
              console.log(`[PeerConnection:${userId}] Enabling disabled remote track`);
              track.enabled = true;
            }
          });
        }
        
        // Create test audio element to verify we can play audio
        this.testRemoteAudio(stream, userId);
        
        this.emitEvent('stream', stream);
      });

      this.peer.on('close', () => {
        console.log(`[PeerConnection:${userId}] Connection closed`);
        this.connected = false;
        this.emitEvent('close');
        
        // Clean up test audio if it exists
        if (this.audioElement) {
          this.audioElement.remove();
          this.audioElement = null;
        }
      });
      
      this.peer.on('track', (track, stream) => {
        console.log(`[PeerConnection:${userId}] Received track: ${track.kind}, enabled=${track.enabled}, muted=${track.muted}`);
      });
      
      this.peer.on('data', data => {
        console.log(`[PeerConnection:${userId}] Received data channel message:`, data.toString());
      });

      this.peer.on('error', err => {
        console.error(`[PeerConnection:${userId}] Peer error:`, err);
        this.emitEvent('error', err);
      });
      
      // Log connection state after a short delay
      setTimeout(() => {
        this.logState();
      }, 3000);
      
    } catch (error) {
      console.error(`[PeerConnection:${userId}] Error creating peer:`, error);
      // Try an alternative approach if the first one fails
      this.createAlternativePeer(stream, initiator, userId);
    }
  }

  // Test if audio actually plays through a test element
  testRemoteAudio(stream, userId) {
    try {
      // Clean up previous test audio if exists
      if (this.audioElement) {
        this.audioElement.remove();
      }
      
      console.log(`[PeerConnection:${userId}] Setting up test audio element to verify playback`);
      
      // Create an audio element specifically for testing
      const audio = document.createElement('audio');
      audio.id = `test-audio-${userId}`;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      audio.volume = 1.0;
      audio.style.display = 'none';
      
      // Set the stream as the source
      audio.srcObject = stream;
      
      // Add debug events
      audio.onplay = () => console.log(`[PeerConnection:${userId}] Test audio started playing`);
      audio.onpause = () => console.log(`[PeerConnection:${userId}] Test audio paused`);
      audio.onended = () => console.log(`[PeerConnection:${userId}] Test audio ended`);
      audio.onerror = (e) => console.error(`[PeerConnection:${userId}] Test audio error:`, e);
      
      // Add audio context based volume meter
      this.createAudioMeter(stream, userId);
      
      // Add to DOM
      document.body.appendChild(audio);
      this.audioElement = audio;
      
      // Force play
      audio.play().then(() => {
        console.log(`[PeerConnection:${userId}] Successfully started test audio playback`);
      }).catch(err => {
        console.error(`[PeerConnection:${userId}] Error playing test audio:`, err);
        
        // Try again with user interaction
        const forcePlayBtn = document.createElement('button');
        forcePlayBtn.textContent = 'Enable Audio';
        forcePlayBtn.style.position = 'fixed';
        forcePlayBtn.style.bottom = '10px';
        forcePlayBtn.style.left = '10px';
        forcePlayBtn.style.zIndex = '9999';
        forcePlayBtn.style.background = '#2196F3';
        forcePlayBtn.style.color = 'white';
        forcePlayBtn.style.border = 'none';
        forcePlayBtn.style.borderRadius = '4px';
        forcePlayBtn.style.padding = '8px 16px';
        
        forcePlayBtn.onclick = () => {
          audio.play().then(() => {
            console.log(`[PeerConnection:${userId}] Audio enabled by user action`);
            forcePlayBtn.remove();
          }).catch(err => {
            console.error(`[PeerConnection:${userId}] Still failed to play audio:`, err);
          });
        };
        
        document.body.appendChild(forcePlayBtn);
      });
    } catch (err) {
      console.error(`[PeerConnection:${userId}] Error in testRemoteAudio:`, err);
    }
  }
  
  // Create an audio meter to debug if audio is actually playing
  createAudioMeter(stream, userId) {
    try {
      // Create audio context
      const audioContext = new AudioContext();
      
      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create analyzer
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      // Get data array
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Periodically check audio levels
      const checkLevel = () => {
        analyzer.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Log less frequently to reduce spam (10% chance)
        if (Math.random() < 0.1) {
          console.log(`[PeerConnection:${userId}] Remote audio level: ${average.toFixed(2)}`);
          
          // If we see continuous silence, that might indicate an issue
          if (average < 1) {
            // Low audio level might indicate an issue
            console.log(`[PeerConnection:${userId}] Remote audio level very low, might not be receiving audio`);
          }
        }
        
        // Continue checking if still connected
        if (this.connected) {
          setTimeout(checkLevel, 500);
        }
      };
      
      // Start checking
      checkLevel();
      
    } catch (err) {
      console.error(`[PeerConnection:${userId}] Error creating audio meter:`, err);
    }
  }

  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
    return this;
  }

  emitEvent(event, ...args) {
    const handlers = this.eventHandlers[event];
    if (handlers && handlers.length > 0) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[PeerConnection:${this.userId}] Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  sendSignal(signal) {
    if (!this.socket) {
      console.error(`[PeerConnection:${this.userId}] Cannot send signal: socket not available`);
      return;
    }
    
    console.log(`[PeerConnection:${this.userId}] Sending signal of type: ${signal.type || 'unknown'} to user`);
    
    this.socket.emit('voiceSignal', {
      targetId: this.userId,
      signal: signal
    });
  }
  
  // Alternative peer creation method using direct RTCPeerConnection
  createAlternativePeer(stream, initiator, userId) {
    console.log(`[PeerConnection:${userId}] Trying alternative peer connection approach`);
    
    try {
      // Create direct RTCPeerConnection instead of using simple-peer
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      };
      
      const pc = new RTCPeerConnection(configuration);
      
      // Add stream to peer connection
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }
      
      // Set up ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const signal = {
            type: 'candidate',
            candidate: event.candidate
          };
          this.sendSignal(signal);
        }
      };
      
      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log(`[PeerConnection:${userId}] Received track from alternative connection`);
        this.hasRemoteStream = true;
        this.emitEvent('stream', event.streams[0]);
      };
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`[PeerConnection:${userId}] Connection state changed: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          this.connected = true;
          this.emitEvent('connect');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          this.connected = false;
          this.emitEvent('close');
        }
      };
      
      // Create offer if initiator
      if (initiator) {
        pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          const signal = {
            type: 'offer',
            sdp: pc.localDescription
          };
          this.sendSignal(signal);
        })
        .catch(err => {
          console.error(`[PeerConnection:${userId}] Error creating offer:`, err);
          this.emitEvent('error', err);
        });
      }
      
      // Store peer connection
      this.peer = pc;
      
      // Add custom signal method for this approach
      this.signalMethod = (data) => {
        try {
          if (data.type === 'offer') {
            pc.setRemoteDescription(new RTCSessionDescription(data))
              .then(() => pc.createAnswer())
              .then(answer => pc.setLocalDescription(answer))
              .then(() => {
                const signal = {
                  type: 'answer',
                  sdp: pc.localDescription
                };
                this.sendSignal(signal);
              })
              .catch(err => {
                console.error(`[PeerConnection:${userId}] Error handling offer:`, err);
                this.emitEvent('error', err);
              });
          } else if (data.type === 'answer') {
            pc.setRemoteDescription(new RTCSessionDescription(data))
              .catch(err => {
                console.error(`[PeerConnection:${userId}] Error handling answer:`, err);
                this.emitEvent('error', err);
              });
          } else if (data.type === 'candidate') {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate))
              .catch(err => {
                console.error(`[PeerConnection:${userId}] Error adding ICE candidate:`, err);
                this.emitEvent('error', err);
              });
          }
        } catch (error) {
          console.error(`[PeerConnection:${userId}] Error in alternative signal method:`, error);
          this.emitEvent('error', error);
        }
      };
    } catch (error) {
      console.error(`[PeerConnection:${userId}] Error creating alternative peer:`, error);
      this.emitEvent('error', error);
    }
  }

  signal(data) {
    if (!data) {
      console.error(`[PeerConnection:${this.userId}] Received null or undefined signal data`);
      return;
    }
    
    try {
      console.log(`[PeerConnection:${this.userId}] Received signal of type: ${data.type || 'unknown'}`);
      
      // Use alternative signaling method if exists
      if (this.signalMethod) {
        this.signalMethod(data);
      } else if (this.peer) {
        // Otherwise use simple-peer's signal method
        this.peer.signal(data);
      }
      
      // Log state after receiving a signal
      setTimeout(() => {
        this.logState();
      }, 1000);
    } catch (error) {
      console.error(`[PeerConnection:${this.userId}] Error processing signal:`, error);
      this.emitEvent('error', error);
    }
  }

  destroy() {
    console.log(`[PeerConnection:${this.userId}] Destroying peer connection`);
    try {
      if (this.peer) {
        if (typeof this.peer.destroy === 'function') {
          // simple-peer instance
          this.peer.destroy();
        } else {
          // RTCPeerConnection instance
          this.peer.close();
        }
      }
    } catch (error) {
      console.error(`[PeerConnection:${this.userId}] Error destroying peer:`, error);
    }
  }
  
  logState() {
    console.log(`[PeerConnection:${this.userId}] Connection state:`);
    console.log(`  - Connected: ${this.connected}`);
    console.log(`  - Has remote stream: ${this.hasRemoteStream}`);
    
    // Check connection state based on peer type
    if (this.peer) {
      if (this.peer._pc) {
        // simple-peer instance
        console.log(`  - ICE connection state: ${this.peer._pc.iceConnectionState}`);
        console.log(`  - ICE gathering state: ${this.peer._pc.iceGatheringState}`);
        console.log(`  - Connection state: ${this.peer._pc.connectionState}`);
        console.log(`  - Signaling state: ${this.peer._pc.signalingState}`);
      } else if (this.peer.iceConnectionState) {
        // Direct RTCPeerConnection instance
        console.log(`  - ICE connection state: ${this.peer.iceConnectionState}`);
        console.log(`  - ICE gathering state: ${this.peer.iceGatheringState}`);
        console.log(`  - Connection state: ${this.peer.connectionState}`);
        console.log(`  - Signaling state: ${this.peer.signalingState}`);
      }
    }
  }
}

export default PeerConnection; 
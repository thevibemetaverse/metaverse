import Peer from 'simple-peer';

class PeerConnection {
  constructor(stream, initiator, socketId, onSignal, onStream, onClose) {
    console.log(`[PeerConnection:${socketId}] Creating peer connection, initiator: ${initiator}`);
    
    // Log stream info
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      console.log(`[PeerConnection:${socketId}] Stream provided with ${audioTracks.length} audio tracks`);
      audioTracks.forEach((track, i) => {
        console.log(`[PeerConnection:${socketId}] Track ${i}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
      });
    } else {
      console.warn(`[PeerConnection:${socketId}] No stream provided!`);
    }
    
    // Create the peer with debug enabled
    this.peer = new Peer({
      initiator,
      stream,
      trickle: false,
      debug: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.socketId = socketId;
    this.connected = false;
    this.hasRemoteStream = false;

    this.peer.on('signal', data => {
      console.log(`[PeerConnection:${socketId}] Generated signal of type: ${data.type || 'unknown'}`);
      onSignal(data, this.socketId);
    });

    this.peer.on('connect', () => {
      console.log(`[PeerConnection:${socketId}] Peer connection established!`);
      this.connected = true;
    });

    this.peer.on('stream', stream => {
      console.log(`[PeerConnection:${socketId}] Received remote stream with ${stream.getTracks().length} tracks`);
      this.hasRemoteStream = true;
      onStream(stream, this.socketId);
    });

    this.peer.on('close', () => {
      console.log(`[PeerConnection:${socketId}] Connection closed`);
      this.connected = false;
      onClose(this.socketId);
    });
    
    this.peer.on('track', (track, stream) => {
      console.log(`[PeerConnection:${socketId}] Received track: ${track.kind}, enabled=${track.enabled}, muted=${track.muted}`);
    });

    this.peer.on('error', err => {
      console.error(`[PeerConnection:${socketId}] Peer error:`, err);
      onClose(this.socketId);
    });
    
    // Log connection state after a short delay
    setTimeout(() => {
      this.logState();
    }, 3000);
  }

  signal(data) {
    console.log(`[PeerConnection:${this.socketId}] Received signal of type: ${data.type || 'unknown'}`);
    this.peer.signal(data);
    
    // Log state after receiving a signal
    setTimeout(() => {
      this.logState();
    }, 1000);
  }

  destroy() {
    console.log(`[PeerConnection:${this.socketId}] Destroying peer connection`);
    this.peer.destroy();
  }
  
  logState() {
    console.log(`[PeerConnection:${this.socketId}] Connection state:`);
    console.log(`  - Connected: ${this.connected}`);
    console.log(`  - Has remote stream: ${this.hasRemoteStream}`);
    
    // Check if _pc (RTCPeerConnection) is available
    if (this.peer._pc) {
      console.log(`  - ICE connection state: ${this.peer._pc.iceConnectionState}`);
      console.log(`  - ICE gathering state: ${this.peer._pc.iceGatheringState}`);
      console.log(`  - Connection state: ${this.peer._pc.connectionState}`);
      console.log(`  - Signaling state: ${this.peer._pc.signalingState}`);
    }
  }
}

export default PeerConnection; 
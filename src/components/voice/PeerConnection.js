import Peer from 'simple-peer';

class PeerConnection {
  constructor(stream, initiator, socketId, onSignal, onStream, onClose) {
    this.peer = new Peer({
      initiator,
      stream,
      trickle: false
    });

    this.socketId = socketId;

    this.peer.on('signal', data => {
      onSignal(data, this.socketId);
    });

    this.peer.on('stream', stream => {
      onStream(stream, this.socketId);
    });

    this.peer.on('close', () => {
      onClose(this.socketId);
    });

    this.peer.on('error', err => {
      console.error('Peer error:', err);
      onClose(this.socketId);
    });
  }

  signal(data) {
    this.peer.signal(data);
  }

  destroy() {
    this.peer.destroy();
  }
}

export default PeerConnection; 
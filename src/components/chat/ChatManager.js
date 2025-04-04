// ChatManager.js
// Main controller for the chat system
import { ChatInput } from './ChatInput.js';
import { ChatBubble } from './ChatBubble.js';
import * as THREE from 'three';

export class ChatManager {
  constructor(scene, camera, character) {
    this.scene = scene;
    this.camera = camera;
    this.character = character;
    this.isInputActive = false;
    this.messages = [];
    this.activeBubbles = [];
    this.socket = null;
    this.multiplayer = null;
    this.playerBubbles = new Map(); // Map of player IDs to their active bubbles
    
    // Create chat input
    this.chatInput = new ChatInput(this);
    
    // Setup key listeners
    this.setupKeyListeners();
  }
  
  // Set socket connection from MultiplayerManager
  setMultiplayerManager(multiplayerManager) {
    if (!multiplayerManager) return;
    
    this.multiplayer = multiplayerManager;
    this.socket = multiplayerManager.socket;
    
    console.log('[ChatManager] Connected to MultiplayerManager');
    
    // Setup socket event listeners if socket is available
    if (this.socket) {
      this.setupSocketListeners();
    }
  }
  
  setupSocketListeners() {
    if (!this.socket) {
      console.error('[ChatManager] Cannot setup listeners, socket not available');
      return;
    }
    
    // Listen for incoming chat messages
    this.socket.on('chatMessage', (data) => {
      console.log('[ChatManager] Received chat message:', data);
      this.handleReceivedMessage(data);
    });
    
    console.log('[ChatManager] Socket listeners set up');
  }
  
  handleReceivedMessage(data) {
    // Add message to history
    this.messages.push({
      id: data.id,
      username: data.username,
      text: data.message,
      timestamp: data.timestamp
    });
    
    // If this is our own message, we already created a bubble
    if (this.multiplayer && data.id === this.multiplayer.playerId) {
      console.log('[ChatManager] Ignoring own message bubble');
      return;
    }
    
    // Create chat bubble above the player's character
    this.createRemotePlayerBubble(data.id, data.message);
  }
  
  createRemotePlayerBubble(playerId, text) {
    if (!this.multiplayer) return;
    
    // Get the player's avatar from the MultiplayerManager
    const playerObject = this.multiplayer.getPlayerById(playerId);
    if (!playerObject) {
      console.warn(`[ChatManager] No player found with ID: ${playerId}`);
      return;
    }
    
    console.log(`[ChatManager] Creating bubble for player ${playerId}:`, playerObject);
    
    // Remove existing bubble for this player if exists
    if (this.playerBubbles.has(playerId)) {
      this.removeBubble(this.playerBubbles.get(playerId));
      this.playerBubbles.delete(playerId);
    }
    
    // Get position from the player's mesh
    const position = new THREE.Vector3();
    if (playerObject.mesh && playerObject.mesh.position) {
      position.copy(playerObject.mesh.position);
    } else {
      console.warn(`[ChatManager] Player ${playerId} has no mesh or position`);
      return;
    }
    
    // Create bubble using the mesh as the character object to follow
    const bubble = new ChatBubble(this.scene, position, text, playerObject.mesh);
    this.activeBubbles.push(bubble);
    
    // Store the bubble mapped to player ID
    this.playerBubbles.set(playerId, bubble);
    
    // Set timeout to remove bubble
    setTimeout(() => {
      this.removePlayerBubble(playerId);
    }, 5000); // Bubble shows for 5 seconds
  }
  
  removePlayerBubble(playerId) {
    if (this.playerBubbles.has(playerId)) {
      const bubble = this.playerBubbles.get(playerId);
      this.removeBubble(bubble);
      this.playerBubbles.delete(playerId);
    }
  }
  
  setupKeyListeners() {
    document.addEventListener('keydown', (event) => {
      // Press 'T' to open chat
      if (event.key === 't' || event.key === 'T') {
        if (!this.isInputActive) {
          this.openChatInput();
        }
      }
      
      // Press 'Escape' to close chat
      if (event.key === 'Escape') {
        if (this.isInputActive) {
          this.closeChatInput();
        }
      }
    });
  }
  
  openChatInput() {
    this.isInputActive = true;
    this.chatInput.show();
    
    // Disable character controls while typing
    if (this.character && this.character.controls) {
      this.character.controls.enabled = false;
    }
  }
  
  closeChatInput() {
    this.isInputActive = false;
    this.chatInput.hide();
    
    // Re-enable character controls
    if (this.character && this.character.controls) {
      this.character.controls.enabled = true;
    }
  }
  
  sendMessage(text) {
    if (!text || text.trim() === '') return;
    
    // Create chat bubble above local character
    this.createChatBubble(text);
    
    // Send message to server if socket is available
    if (this.socket) {
      console.log('[ChatManager] Sending chat message to server:', text);
      this.socket.emit('chatMessage', { message: text });
    } else {
      console.warn('[ChatManager] Cannot send message, socket not available');
    }
    
    // Close input after sending
    this.closeChatInput();
  }
  
  createChatBubble(text) {
    if (!this.character) return;
    
    // Get character position for bubble placement
    const position = new THREE.Vector3();
    if (this.character.position) {
      position.copy(this.character.position);
      // Place bubble above character head (adjust y offset as needed)
      position.y += 2.0; 
    }
    
    // Create and add bubble to scene, passing the character reference
    const bubble = new ChatBubble(this.scene, position, text, this.character);
    this.activeBubbles.push(bubble);
    
    // Add to local player's message history
    this.messages.push({
      id: this.multiplayer ? this.multiplayer.playerId : 'local',
      username: this.multiplayer ? this.multiplayer.username : 'You',
      text: text,
      timestamp: Date.now()
    });
    
    // Set timeout to remove bubble
    setTimeout(() => {
      this.removeBubble(bubble);
    }, 5000); // Bubble shows for 5 seconds
  }
  
  removeBubble(bubble) {
    const index = this.activeBubbles.indexOf(bubble);
    if (index !== -1) {
      this.activeBubbles.splice(index, 1);
      bubble.remove();
    }
  }
  
  update() {
    // Update all active bubbles
    this.activeBubbles.forEach(bubble => bubble.update(this.camera));
  }
} 
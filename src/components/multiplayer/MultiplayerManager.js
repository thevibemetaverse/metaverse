import * as THREE from 'three';
import { io } from 'socket.io-client';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class MultiplayerManager {
    constructor(scene) {
        this.scene = scene;
        this.players = new Map(); // Map of player IDs to their data
        this.socket = null;
        this.playerId = null;
        this.isConnected = false;
        this.loader = new GLTFLoader();
        this.modelPath = './assets/models/metaverse-explorer.glb';
        this.nameLabelHeight = 4; // Height above player model
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.username = null; // Store username
        this.pendingAvatars = new Set(); // Track avatars being created
    }

    connect(serverUrl = '') {
        // Clean up any existing connection
        if (this.socket) {
            this.socket.disconnect();
            this.cleanupAllPlayers();
        }

        // Get username before connecting
        this.username = this.getUsername();
        console.log('[MultiplayerManager] Connecting with username:', this.username);

        // Use relative URL in development, absolute URL in production
        const url = serverUrl || (import.meta.env.DEV ? '' : 'http://localhost:8080');
        this.socket = io(url, {
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            forceNew: true // Force a new connection
        });

        this.socket.on('connect', () => {
            console.log('[MultiplayerManager] Connected to server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Clean up any existing players before joining
            this.cleanupAllPlayers();
            
            // Send initial player data with username
            this.socket.emit('join', {
                username: this.username,
                avatarUrl: this.getAvatarUrl()
            });
        });

        this.socket.on('playerId', (data) => {
            console.log('[MultiplayerManager] Received player ID:', data.id);
            
            // Update username if it was modified by the server
            if (data.username && data.username !== this.username) {
                this.username = data.username;
                console.log('[MultiplayerManager] Username updated by server:', this.username);
            }
            
            this.playerId = data.id;
            
            // Create our own avatar when we get our ID
            this.createPlayerAvatar({
                id: this.playerId,
                username: this.username,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 }
            });
        });

        this.socket.on('playerJoined', (data) => {
            console.log('[MultiplayerManager] Received playerJoined event:', data);
            
            // Skip if this is our own player
            if (data.id === this.playerId) return;
            
            // Skip if we're already creating an avatar for this player
            if (this.pendingAvatars.has(data.id)) return;
            
            // Skip if we already have this player
            if (this.players.has(data.id)) return;
            
            this.handlePlayerJoined(data);
        });

        this.socket.on('playerLeft', (data) => {
            console.log('[MultiplayerManager] Received playerLeft event:', data);
            this.handlePlayerLeft(data);
        });

        this.socket.on('playerUpdate', (data) => {
            this.handlePlayerUpdate(data);
        });

        this.socket.on('disconnect', () => {
            console.log('[MultiplayerManager] Disconnected from server');
            this.isConnected = false;
            // Clean up all players on disconnect
            this.cleanupAllPlayers();
        });

        this.socket.on('reconnect', () => {
            console.log('[MultiplayerManager] Reconnected to server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Clean up existing players before rejoining
            this.cleanupAllPlayers();
            
            // Rejoin with current username
            this.socket.emit('join', {
                username: this.username,
                avatarUrl: this.getAvatarUrl()
            });
        });

        this.socket.on('connect_error', (error) => {
            console.error('[MultiplayerManager] Connection error:', error);
            this.reconnectAttempts++;
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('[MultiplayerManager] Max reconnection attempts reached');
                this.cleanupAllPlayers();
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.dispose();
        });
    }

    handlePlayerJoined(data) {
        if (data.id === this.playerId) return;
        
        console.log(`[MultiplayerManager] Player joined: ${data.username}`);
        this.createPlayerAvatar(data);
    }

    handlePlayerLeft(data) {
        if (data.id === this.playerId) return;
        
        console.log(`[MultiplayerManager] Player left: ${data.username}`);
        this.removePlayerAvatar(data.id);
    }

    handlePlayerUpdate(data) {
        if (data.id === this.playerId) return;
        
        const player = this.players.get(data.id);
        if (player) {
            // Update player position without time window restriction
            player.mesh.position.set(data.position.x, data.position.y, data.position.z);
            player.mesh.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
            
            // Update player name label position
            if (player.nameLabel) {
                player.nameLabel.position.copy(player.mesh.position);
                player.nameLabel.position.y += this.nameLabelHeight;
            }
            
            player.lastUpdate = Date.now();
        } else if (!this.pendingAvatars.has(data.id)) {
            // If we receive an update for a player we don't have and aren't creating,
            // create their avatar
            console.log('[MultiplayerManager] Received update for unknown player:', data.id);
            this.handlePlayerJoined({
                id: data.id,
                username: `Player${data.id.slice(0, 4)}`,
                position: data.position,
                rotation: data.rotation
            });
        }
    }

    async createPlayerAvatar(data) {
        console.log('[MultiplayerManager] Creating avatar for player:', data);
        
        // Skip if we're already creating an avatar for this player
        if (this.pendingAvatars.has(data.id)) {
            console.log('[MultiplayerManager] Avatar creation already in progress for player:', data.id);
            return;
        }
        
        // Add to pending avatars
        this.pendingAvatars.add(data.id);
        
        try {
            // Load the character model
            const gltf = await this.loadModel(this.modelPath);
            const mesh = gltf.scene;
            
            // Set initial position
            mesh.position.set(data.position?.x || 0, data.position?.y || 0, data.position?.z || 0);
            mesh.rotation.set(data.rotation?.x || 0, data.rotation?.y || 0, data.rotation?.z || 0);
            
            // Setup animations
            const mixer = new THREE.AnimationMixer(mesh);
            const animations = {};
            
            if (gltf.animations && gltf.animations.length) {
                gltf.animations.forEach(animation => {
                    const action = mixer.clipAction(animation);
                    animations[animation.name] = action;
                    // Start with idle animation
                    if (animation.name.toLowerCase().includes('idle')) {
                        action.play();
                    }
                });
            }
            
            // Create name label
            const nameLabel = this.createNameLabel(data.username);
            nameLabel.position.copy(mesh.position);
            nameLabel.position.y += this.nameLabelHeight;
            nameLabel.renderOrder = 999;
            
            // Add to scene
            this.scene.add(mesh);
            this.scene.add(nameLabel);
            
            // Store player data
            this.players.set(data.id, {
                username: data.username,
                mesh: mesh,
                nameLabel: nameLabel,
                mixer: mixer,
                animations: animations,
                lastUpdate: Date.now()
            });

            console.log('[MultiplayerManager] Avatar created successfully for player:', data.username);
        } catch (error) {
            console.error('[MultiplayerManager] Error creating avatar:', error);
            // Fallback to simple cube if model loading fails
            this.createFallbackAvatar(data);
        } finally {
            // Remove from pending avatars
            this.pendingAvatars.delete(data.id);
        }
    }

    createFallbackAvatar(data) {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: data.id === this.playerId ? 0xff0000 : 0x00ff00,
            metalness: 0.5,
            roughness: 0.5
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(data.position?.x || 0, data.position?.y || 0, data.position?.z || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        const nameLabel = this.createNameLabel(data.username);
        nameLabel.position.copy(mesh.position);
        nameLabel.position.y += this.nameLabelHeight; // Use the configured height
        nameLabel.renderOrder = 999;
        
        this.scene.add(mesh);
        this.scene.add(nameLabel);
        
        this.players.set(data.id, {
            username: data.username,
            mesh: mesh,
            nameLabel: nameLabel
        });
    }

    loadModel(path) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (gltf) => resolve(gltf),
                (progress) => {
                    console.log(`[MultiplayerManager] Loading model: ${(progress.loaded / progress.total * 100)}%`);
                },
                (error) => reject(error)
            );
        });
    }

    removePlayerAvatar(playerId) {
        console.log('[MultiplayerManager] Removing avatar for player:', playerId);
        const player = this.players.get(playerId);
        if (player) {
            // Remove from scene first
            if (player.mesh && player.mesh.parent) {
                player.mesh.parent.remove(player.mesh);
            }
            if (player.nameLabel && player.nameLabel.parent) {
                player.nameLabel.parent.remove(player.nameLabel);
            }
            
            // Stop animations
            if (player.mixer) {
                player.mixer.stopAllAction();
            }
            
            // Clear from players map
            this.players.delete(playerId);
            console.log('[MultiplayerManager] Avatar removed successfully');
        }
    }

    cleanupAllPlayers() {
        console.log('[MultiplayerManager] Cleaning up all players');
        // Create a copy of player IDs to avoid modification during iteration
        const playerIds = Array.from(this.players.keys());
        playerIds.forEach(id => {
            this.removePlayerAvatar(id);
        });
        this.players.clear();
    }

    createNameLabel(username) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw background with better visibility
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text with better visibility
        context.font = 'bold 32px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(username, canvas.width / 2, canvas.height / 2);
        
        // Create sprite with better visibility
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.scale.set(2, 0.5, 1);
        return sprite;
    }

    updatePlayerPosition(position, rotation) {
        if (!this.isConnected) return;
        
        // Only send updates if position or rotation has changed significantly
        const player = this.players.get(this.playerId);
        if (player) {
            const posDiff = position.distanceTo(player.mesh.position);
            const rotDiff = Math.abs(rotation.y - player.mesh.rotation.y);
            
            if (posDiff > 0.01 || rotDiff > 0.01) {
                this.socket.emit('playerUpdate', {
                    position: position,
                    rotation: rotation
                });
            }
        }
    }

    getUsername() {
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('username');
        
        // If no username provided, generate a unique one
        if (!username) {
            const randomNum = Math.floor(Math.random() * 1000);
            return `Guest${randomNum}`;
        }
        
        return username;
    }

    getAvatarUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('avatar_url') || null;
    }

    update(deltaTime) {
        // Update animations for all players
        this.players.forEach(player => {
            if (player.mixer) {
                player.mixer.update(deltaTime);
            }
        });
    }

    dispose() {
        console.log('[MultiplayerManager] Disposing of multiplayer manager');
        if (this.socket) {
            this.socket.disconnect();
        }
        this.cleanupAllPlayers();
        this.isConnected = false;
        this.playerId = null;
    }
} 
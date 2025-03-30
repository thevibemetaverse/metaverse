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
        // Try different possible paths for the model
        this.modelPath = './assets/models/metaverse-explorer.glb';
        this.nameLabelHeight = 4; // Height above player model
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.username = null; // Store username
        this.pendingAvatars = new Set(); // Track avatars being created
        this.localPlayerModel = null; // Reference to local player's model
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
        
        try {
            let player = this.players.get(data.id);
            
            // If we don't have this player and aren't creating it, create them now
            if (!player && !this.pendingAvatars.has(data.id)) {
                console.log('[MultiplayerManager] Creating player on update:', data.id);
                this.handlePlayerJoined({
                    id: data.id,
                    username: data.username || `Player${data.id.slice(0, 4)}`,
                    position: data.position,
                    rotation: data.rotation
                });
                return; // Return and wait for next update after player is created
            }
            
            // Skip if player not fully loaded yet
            if (!player || !player.mesh) return;
            
            // Store old position for debugging
            const oldPosition = {
                x: player.mesh.position.x,
                y: player.mesh.position.y,
                z: player.mesh.position.z
            };
            
            // CRITICAL FIX: For remote players, we completely remove and re-add the mesh 
            // to force a scene graph update that ensures visibility
            if (player.mesh.parent) {
                player.mesh.parent.remove(player.mesh);
            }
            
            // Update player position directly
            player.mesh.position.x = data.position.x;
            player.mesh.position.y = data.position.y; 
            player.mesh.position.z = data.position.z;
            player.mesh.rotation.x = data.rotation.x;
            player.mesh.rotation.y = data.rotation.y;
            player.mesh.rotation.z = data.rotation.z;
            
            // Re-add to scene to force an update
            this.scene.add(player.mesh);
            
            console.log(`[MultiplayerManager] Player ${data.id} moved from (${oldPosition.x.toFixed(2)}, ${oldPosition.y.toFixed(2)}, ${oldPosition.z.toFixed(2)}) to (${data.position.x.toFixed(2)}, ${data.position.y.toFixed(2)}, ${data.position.z.toFixed(2)})`);
            
            // Critical: force visibility on
            player.mesh.visible = true;
            
            // Set frustumCulled to false to prevent Three.js from culling the mesh
            player.mesh.frustumCulled = false;
            
            // Make all children visible and not culled
            player.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.visible = true;
                    child.frustumCulled = false;
                    
                    // Ensure materials are correct
                    if (child.material) {
                        child.material.transparent = false;
                        child.material.opacity = 1;
                        child.material.needsUpdate = true;
                        child.material.depthWrite = true;
                        child.material.depthTest = true;
                    }
                }
            });
            
            // Update name label
            if (player.nameLabel) {
                // Remove and re-add name label to force update
                if (player.nameLabel.parent) {
                    player.nameLabel.parent.remove(player.nameLabel);
                }
                
                player.nameLabel.position.x = player.mesh.position.x;
                player.nameLabel.position.y = player.mesh.position.y + this.nameLabelHeight;
                player.nameLabel.position.z = player.mesh.position.z;
                player.nameLabel.visible = true;
                player.nameLabel.renderOrder = 999;
                player.nameLabel.frustumCulled = false;
                
                // Re-add label
                this.scene.add(player.nameLabel);
            }
            
            // Force update of matrix world for all objects
            this.scene.updateMatrixWorld(true);
            
            // Update last seen time
            player.lastUpdate = Date.now();
            
        } catch (error) {
            console.error('[MultiplayerManager] Error updating player:', error);
        }
    }

    // Remove unused debug marker method
    updateDebugMarker(player) {
        // This method is no longer used - keep empty for backward compatibility
    }

    async createPlayerAvatar(data) {
        console.log('[MultiplayerManager] Creating avatar for player:', data);
        
        // Skip if we're already creating an avatar for this player
        if (this.pendingAvatars.has(data.id)) {
            console.log('[MultiplayerManager] Avatar creation already in progress for player:', data.id);
            return;
        }
        
        // Skip if we already have this player
        if (this.players.has(data.id)) {
            console.log('[MultiplayerManager] Player already exists:', data.id);
            return;
        }
        
        // Add to pending avatars
        this.pendingAvatars.add(data.id);
        
        try {
            let mesh;
            // Special handling for remote players vs. local player
            const isLocalPlayer = data.id === this.playerId;
            
            if (isLocalPlayer && this.localPlayerModel) {
                console.log('[MultiplayerManager] Using local player model');
                mesh = this.localPlayerModel.clone();
            } else {
                // For remote players, load the GLB model with special adjustments
                console.log('[MultiplayerManager] Loading model from path:', this.modelPath);
                const gltf = await this.loadModel(this.modelPath);
                console.log('[MultiplayerManager] Model loaded successfully:', gltf);
                
                // For remote players, we'll make extra adjustments to ensure visibility
                mesh = gltf.scene;
                
                // Create a wrapper group for the model
                // This extra level in the scene graph helps with visibility
                const wrapperGroup = new THREE.Group();
                wrapperGroup.add(mesh);
                mesh = wrapperGroup; // Use the wrapper as the player's mesh
                
                // Set up animations
                if (gltf.animations && gltf.animations.length) {
                    const mixer = new THREE.AnimationMixer(gltf.scene);
                    const animations = {};
                    
                    console.log('[MultiplayerManager] Found animations:', gltf.animations.map(a => a.name));
                    gltf.animations.forEach(animation => {
                        const action = mixer.clipAction(animation);
                        animations[animation.name] = action;
                        // Start with idle animation
                        if (animation.name.toLowerCase().includes('idle')) {
                            action.play();
                        }
                    });
                    
                    // Save mixer and animations
                    this.players.set(data.id, {
                        mixer: mixer,
                        animations: animations
                    });
                }
            }
            
            // Set initial position
            mesh.position.x = data.position?.x || 0;
            mesh.position.y = data.position?.y || 0;
            mesh.position.z = data.position?.z || 0;
            mesh.rotation.x = data.rotation?.x || 0;
            mesh.rotation.y = data.rotation?.y || 0;
            mesh.rotation.z = data.rotation?.z || 0;
            
            // CRITICAL: disable frustum culling on the mesh and all its children
            mesh.frustumCulled = false;
            
            // Make sure the mesh is visible and properly configured
            mesh.visible = true;
            mesh.traverse((child) => {
                if (child.isMesh) {
                    child.visible = true;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.frustumCulled = false;
                    child.matrixAutoUpdate = true;  // Ensure matrix updates
                    
                    // Ensure materials are properly configured
                    if (child.material) {
                        child.material.transparent = false;
                        child.material.opacity = 1;
                        child.material.needsUpdate = true;
                        child.material.depthWrite = true;
                        child.material.depthTest = true;
                        
                        // Handle material arrays
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                mat.transparent = false;
                                mat.opacity = 1;
                                mat.needsUpdate = true;
                                mat.depthWrite = true;
                                mat.depthTest = true;
                            });
                        }
                    }
                }
            });
            
            // Create name label with proper username
            const username = data.username || `Player${data.id.slice(0, 4)}`;
            const nameLabel = this.createNameLabel(username);
            nameLabel.position.x = mesh.position.x;
            nameLabel.position.y = mesh.position.y + this.nameLabelHeight;
            nameLabel.position.z = mesh.position.z;
            nameLabel.renderOrder = 999;
            nameLabel.visible = true;
            nameLabel.frustumCulled = false;
            
            // Add to scene
            this.scene.add(mesh);
            this.scene.add(nameLabel);
            
            // Store or update player data
            const existingPlayer = this.players.get(data.id) || {};
            this.players.set(data.id, {
                ...existingPlayer,
                username: username,
                mesh: mesh,
                nameLabel: nameLabel,
                lastUpdate: Date.now(),
                isLocalPlayer: isLocalPlayer // Track if this is the local player
            });

            console.log('[MultiplayerManager] Player avatar created successfully');
            
            // Extra validation log
            const player = this.players.get(data.id);
            console.log(`[MultiplayerManager] Player ${data.id} state:`, {
                exists: !!player,
                position: player?.mesh?.position,
                visible: player?.mesh?.visible,
                inScene: !!player?.mesh?.parent,
                frustumCulled: player?.mesh?.frustumCulled,
                isLocalPlayer: player?.isLocalPlayer
            });
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
        console.log('[MultiplayerManager] Creating fallback avatar for player:', data.id);
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
        mesh.visible = true;
        
        const nameLabel = this.createNameLabel(data.username);
        nameLabel.position.copy(mesh.position);
        nameLabel.position.y += this.nameLabelHeight;
        nameLabel.renderOrder = 999;
        
        this.scene.add(mesh);
        this.scene.add(nameLabel);
        
        this.players.set(data.id, {
            username: data.username,
            mesh: mesh,
            nameLabel: nameLabel,
            lastUpdate: Date.now()
        });
        
        console.log('[MultiplayerManager] Fallback avatar created successfully');
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
        if (player && player.mesh) {
            const posDiff = position.distanceTo(player.mesh.position);
            const rotDiff = Math.abs(rotation.y - player.mesh.rotation.y);
            
            if (posDiff > 0.01 || rotDiff > 0.01) {
                // Update local position first
                player.mesh.position.copy(position);
                player.mesh.rotation.copy(rotation);
                
                // Ensure mesh and all its children are visible and properly configured
                player.mesh.visible = true;
                player.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.visible = true;
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Ensure materials are properly configured
                        if (child.material) {
                            child.material.transparent = false;
                            child.material.opacity = 1;
                            child.material.needsUpdate = true;
                            child.material.depthWrite = true;
                            child.material.depthTest = true;
                        }
                    }
                });
                
                // Update name label position
                if (player.nameLabel) {
                    player.nameLabel.position.copy(position);
                    player.nameLabel.position.y += this.nameLabelHeight;
                    player.nameLabel.visible = true;
                    player.nameLabel.renderOrder = 999;
                }
                
                // Force a render update
                if (player.mesh.parent) {
                    player.mesh.parent.updateMatrixWorld();
                }
                
                // Send update to server
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
        // Update animations and ensure visibility for all players
        this.players.forEach((player, id) => {
            // Skip if player is not fully initialized
            if (!player || !player.mesh) return;
            
            // Update animation mixer if available
            if (player.mixer) {
                player.mixer.update(deltaTime);
            }
            
            // Skip local player - it's handled differently
            if (id === this.playerId) return;
            
            // CRITICAL: Force remote player model to stay visible
            if (player.mesh) {
                // If mesh is not in scene for some reason, re-add it
                if (!player.mesh.parent) {
                    console.log(`[MultiplayerManager] Re-adding player ${id} to scene during update`);
                    this.scene.add(player.mesh);
                    
                    // Also make sure the name label is in the scene
                    if (player.nameLabel && !player.nameLabel.parent) {
                        this.scene.add(player.nameLabel);
                    }
                }
                
                // Ensure mesh is visible
                player.mesh.visible = true;
                player.mesh.frustumCulled = false;
                
                // Force all child meshes to stay visible
                player.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.visible = true;
                        child.frustumCulled = false;
                        
                        // Ensure materials are up to date
                        if (child.material) {
                            child.material.needsUpdate = true;
                            child.material.depthTest = true;
                            child.material.depthWrite = true;
                            
                            // Handle material arrays
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.needsUpdate = true;
                                    mat.depthTest = true;
                                    mat.depthWrite = true;
                                });
                            }
                        }
                    }
                });
                
                // Every few seconds, completely remove and re-add remote players to force scene graph updates
                const now = Date.now();
                if (!player.lastResetTime || now - player.lastResetTime > 5000) { // Reset every 5 seconds
                    if (player.mesh.parent) {
                        player.mesh.parent.remove(player.mesh);
                    }
                    this.scene.add(player.mesh);
                    
                    // Update last reset time
                    player.lastResetTime = now;
                }
            }
            
            // Update name label
            if (player.nameLabel) {
                player.nameLabel.visible = true;
                player.nameLabel.position.x = player.mesh.position.x;
                player.nameLabel.position.y = player.mesh.position.y + this.nameLabelHeight;
                player.nameLabel.position.z = player.mesh.position.z;
                
                // Re-add to scene if it was somehow removed
                if (!player.nameLabel.parent) {
                    this.scene.add(player.nameLabel);
                }
            }
        });
        
        // Force update of all matrix worlds
        this.scene.updateMatrixWorld(true);
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

    // Add method to set local player model
    setLocalPlayerModel(model) {
        this.localPlayerModel = model;
        console.log('[MultiplayerManager] Local player model set');
    }

    loadModel(path) {
        return new Promise((resolve, reject) => {
            console.log('[MultiplayerManager] Starting model load from:', path);
            this.loader.load(
                path,
                (gltf) => {
                    console.log('[MultiplayerManager] Model loaded successfully');
                    // Debug: Log model details
                    console.log('[MultiplayerManager] Model details:', {
                        scene: gltf.scene ? 'has scene' : 'no scene',
                        animations: gltf.animations ? gltf.animations.length : 0,
                        cameras: gltf.cameras ? gltf.cameras.length : 0,
                        asset: gltf.asset
                    });
                    resolve(gltf);
                },
                (progress) => {
                    console.log(`[MultiplayerManager] Loading model: ${(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    console.error('[MultiplayerManager] Error loading model:', error);
                    reject(error);
                }
            );
        });
    }
} 
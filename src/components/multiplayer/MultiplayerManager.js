import * as THREE from 'three';
import { io } from 'socket.io-client';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Add animation states enum to match CharacterManager
const AnimationState = {
    IDLE: 'idle',
    RUNNING: 'running',
    JUMPING: 'jumping'
};

export class MultiplayerManager {
    constructor(scene) {
        if (!scene) {
            console.error('[MultiplayerManager] No scene provided!');
            return;
        }
        
        this.scene = scene;
        this.players = new Map();
        this.pendingAvatars = new Set();
        this.explorerModelPlayers = new Set();
        this.safeReferences = new Set();  // Keep references to prevent GC
        this.logicUpdates = 0;
        this.frameCounter = 0;
        this.logFrequency = 600; // How often to log detailed visibility info (in frames)
        this.sceneChildren = [];
        this.modelResetTimer = 0;
        this.modelResetInterval = 10000; // Every 10 seconds
        this.playerDisappearanceLog = new Map();
        this.username = this.getUsername() || 'Guest';
        this.movementThreshold = 0.01; // Minimum speed to be considered "moving"
        this.explorerMovementThreshold = 0.005; // More sensitive threshold for explorer models to detect starting movement
        this.explorerStopMovementThreshold = 0.001; // Very sensitive threshold for explorer models to detect stopping
        this.nameLabelHeight = 2.5;  // Height above player for name label
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.inactivityTimeout = 10000; // 10 seconds before removing disconnected player
        this.networkTimeout = 15000;  // 15 seconds for network timeout
        this.networkCheckFrequency = 5000; // Check every 5 seconds
        this.networkMonitorRunning = false;
        
        this.debug = new URLSearchParams(window.location.search).get('debug') === 'true';
        
        // Create empty containers for the player
        this.playerId = null;
        this.socket = null;
        this.loader = new GLTFLoader();
        // Try different possible paths for the model
        this.modelPath = './assets/models/metaverse-explorer.glb';
        this.reconnectDelay = 3000;
        this.pendingAvatars = new Set(); // Track avatars being created
        this.localPlayerModel = null; // Reference to local player's model
        
        // Animation settings
        this.animationTransitionTime = 0.25; // Time in seconds for animation transitions
        this.idleAnimationNames = ['idle', 'Idle', 'IDLE', 'standing']; // Don't include mixamo.com as idle
        this.walkAnimationNames = ['walk', 'Walk', 'WALKING', 'walking', 'mixamo.com']; // Include mixamo.com as walk only
        this.runAnimationNames = ['run', 'Run', 'RUNNING', 'running']; // Don't include mixamo.com as run
        
        // Movement thresholds
        this.runThreshold = 5; // Minimum speed to consider a player running
        this.explorerMovementThreshold = 0.005; // More sensitive threshold for explorer models
        this.explorerStopMovementThreshold = 0.002; // Even more sensitive threshold for detecting stops
        
        // Idle transition setting
        this.idleTransitionTimeout = 300; // Time in ms before transitioning to idle when stationary
        
        // Visibility settings
        this.ensureVisibility = true; // Whether to force visibility in the update loop
        this.forceMatrixUpdate = true; // Whether to force matrix updates in the update loop
        
        // Player cleanup settings
        this.inactivityTimeout = 60000; // 60 seconds instead of 30 seconds for player cleanup
        
        // Animation control flags
        this.pauseAnimationsWhenStill = true; // Pause animations when player isn't moving
        
        // Tracking for disappeared players
        this.playerDisappearanceLog = new Map(); // Track visibility history
        this.sceneChildren = []; // Track scene children for comparison
        this.logFrequency = 100; // Log every N frames
        this.frameCounter = 0;

        // Prevent scene elements from being garbage collected
        this.safeReferences = new Set(); // Keep object references to prevent GC
        
        // Model recreation settings
        this.modelResetTimer = 0;         // Timer for force resetting models
        this.modelResetInterval = 30000;  // Force reset every 30 seconds
        this.placeholderGeometry = null;  // Placeholder geometry for broken models
        
        // Enhanced logging system
        this.logHistory = [];             // Keep track of recent logs
        this.logHistoryMaxSize = 1000;    // Maximum number of logs to keep
        this.logCategories = {
            VISIBILITY: 'VIS',           // Logs related to object visibility
            SCENE: 'SCN',                // Logs related to scene graph changes
            ANIMATION: 'ANI',            // Logs related to animations
            MODEL: 'MDL',                // Logs related to model loading/processing
            NETWORK: 'NET',              // Logs related to network events
            POSITION: 'POS'              // Logs related to position updates
        };
        
        // Set timestamp for monitoring
        this.startTime = Date.now();
        
        // Add console extension for filtering logs
        if (typeof window !== 'undefined' && window.console) {
            // Create global MPM_logs variable for filtering
            window.MPM_logs = this.logHistory;
            
            // Add filter methods to window for user access
            window.filterMPMLogs = (category, playerId = null) => {
                return window.MPM_logs.filter(log => {
                    if (category && !log.category.includes(category)) return false;
                    if (playerId && !log.message.includes(playerId)) return false;
                    return true;
                });
            };
            
            console.log("[SETUP] Enhanced logging system initialized. Use window.filterMPMLogs(category, playerId) to filter logs.");
            console.log("[SETUP] Available categories:", Object.values(this.logCategories).join(', '));
        }

        // Connection monitoring
        this.lastNetworkActivity = Date.now();
        this.networkMonitoringInterval = 5000; // Check network every 5 seconds
        this.networkTimeoutThreshold = 10000; // Alert after 10 seconds of no network activity
        this.playerUpdateTimeoutThreshold = 15000; // Consider player updates stale after 15 seconds
        
        // Start network monitoring
        if (typeof window !== 'undefined') {
            setInterval(() => this.monitorNetworkActivity(), this.networkMonitoringInterval);
        }

        // Add model-specific animation handling
        this.explorerModelPath = './assets/models/metaverse-explorer.glb';
        this.jumpModelPath = './assets/models/metaverse-jump.glb';
        
        // Track players using the default explorer model
        this.explorerModelPlayers = new Set();
    }

    connect(serverUrl = '') {
        if (this.socket) {
            console.log('[MultiplayerManager] Already connected, disconnecting first');
            this.socket.disconnect();
        }
        
        if (!this.username) {
            console.error('[MultiplayerManager] No username set, cannot connect');
            return;
        }
        
        const url = serverUrl || window.location.origin;
        console.log(`[MultiplayerManager] Connecting to server at ${url}`);
        
        // Connect to server
        this.socket = io(url);
        
        // Set up event handlers
        this.setupSocketEventHandlers();
        
        // Start monitoring network activity
        this.monitorNetworkActivity();
        
        return this.socket;
    }

    setupSocketEventHandlers() {
        this.socket.on('connect', () => {
            console.log('[MultiplayerManager] Connected to server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Clean up any existing players before joining
            this.cleanupAllPlayers();
            
            // Get the player's current position and rotation
            const currentPosition = this.getCurrentPosition();
            const currentRotation = this.getCurrentRotation();
            
            // Send initial player data with username, position and rotation
            this.socket.emit('join', {
                username: this.username,
                avatarUrl: this.getAvatarUrl(),
                position: currentPosition,
                rotation: currentRotation
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
                rotation: { x: 0, y: 0, z: 0 },
                avatarUrl: this.getAvatarUrl()
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
                this.logNetwork(data.id, `Creating player on update`, 'log');
                this.handlePlayerJoined({
                    id: data.id,
                    username: data.username || `Player${data.id.slice(0, 4)}`,
                    position: data.position,
                    rotation: data.rotation,
                    avatarUrl: data.avatarUrl
                });
                return;
            }
            
            // Skip if player not fully loaded yet
            if (!player || !player.mesh) return;

            // Track player updates
            player.lastUpdateReceived = Date.now();
            player.isDisconnected = false; // Reset disconnected state
            
            // If player was marked as disconnected, remove indicator
            if (player.disconnectIndicator && player.nameLabel) {
                const text = player.nameLabel.element.textContent;
                player.nameLabel.element.textContent = text.replace(' [Disconnected]', '');
                player.disconnectIndicator = false;
            }

            // Log player state before update
            this.logVisibility(data.id, `Player before update: {inScene: ${!!player.mesh.parent}, visible: ${player.mesh.visible}, childCount: ${player.mesh.children.length}}`, 'log');

            // Store previous position for movement calculation
            const prevPosition = player.mesh.position.clone();
            const prevRotation = player.mesh.rotation.clone();
            
            // Store previous position for movement direction calculation
            player.previousPosition = prevPosition;
            
            // FIXED: Update position and rotation WITHOUT removing from scene
            // IMPORTANT: Use proper rotation quaternion approach to avoid gimbal lock issues
            const newPosition = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
            
            // IMPROVED: Enhanced rotation handling to ensure consistency across platforms
            // Create a proper quaternion for rotation to ensure accurate orientation
            // We receive Euler angles from the server, so convert them to a quaternion
            const newRotation = new THREE.Euler(
                data.rotation.x,
                data.rotation.y,
                data.rotation.z,
                'YXZ' // Using YXZ order which is typical for character controls
            );
            
            // Detect the source platform if available in data
            const isIOSSafari = data.platform === 'ios-safari';
            
            // Debug rotation values
            this.logPosition(data.id, `Received rotation: (${data.rotation.x.toFixed(2)}, ${data.rotation.y.toFixed(2)}, ${data.rotation.z.toFixed(2)}) from ${isIOSSafari ? 'iOS Safari' : 'other platform'}`, 'log');
            
            // First ensure mesh is still in the scene
            if (!player.mesh.parent) {
                this.logVisibility(data.id, `Player mesh lost parent reference before position update, re-adding to scene`, 'error');
                this.scene.add(player.mesh);
            }
            
            // Force mesh to be visible
            player.mesh.visible = true;
            player.mesh.frustumCulled = false;
            
            // Store rotation values to track changes
            player.previousRotation = prevRotation;
            player.currentRotation = newRotation;
            
            // Apply position updates
            player.mesh.position.copy(newPosition);
            
            // Apply rotation updates with platform-specific handling
            if (isIOSSafari) {
                // Apply minor smoothing for iOS Safari rotation to address jittery movement
                // Use a lerp (linear interpolation) to smooth iOS Safari rotation
                if (player.previousRotation) {
                    const smoothFactor = 0.5; // Balance between responsiveness and smoothness
                    const smoothedRotationY = THREE.MathUtils.lerp(
                        player.previousRotation.y, 
                        newRotation.y, 
                        smoothFactor
                    );
                    
                    // Apply the smoothed Y rotation but keep original X and Z values
                    player.mesh.rotation.set(
                        newRotation.x,
                        smoothedRotationY,
                        newRotation.z,
                        newRotation.order
                    );
                    
                    this.logPosition(data.id, `Applied iOS Safari rotation smoothing: ${player.previousRotation.y.toFixed(4)} -> ${smoothedRotationY.toFixed(4)}`, 'log');
                } else {
                    // First update, set rotation directly
                    player.mesh.rotation.set(newRotation.x, newRotation.y, newRotation.z, newRotation.order);
                }
            } else {
                // For other platforms, apply rotation directly
                player.mesh.rotation.set(newRotation.x, newRotation.y, newRotation.z, newRotation.order);
            }
            
            // Log the rotation change
            const rotDiff = Math.abs(prevRotation.y - newRotation.y);
            if (rotDiff > 0.01) {
                this.logPosition(data.id, `Player rotation changed by ${rotDiff.toFixed(4)} radians`, 'log');
            }
            
            // Force update the matrix world to ensure position/rotation is applied
            player.mesh.updateMatrix();
            player.mesh.updateMatrixWorld(true);
            
            // Ensure rotation is applied to all children
            const childContainer = player.mesh.children[0];
            if (childContainer) {
                // The container should inherit rotation from parent, but force update to be safe
                childContainer.updateMatrix();
                childContainer.updateMatrixWorld(true);
            }
            
            // Check all child meshes and ensure they're visible too
            player.mesh.traverse(child => {
                if (child.isMesh) {
                    child.visible = true;
                    child.frustumCulled = false;
                    if (child.material) {
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Check for large position jump
            const jumpDistance = prevPosition.distanceTo(player.mesh.position);
            if (jumpDistance > 50) {
                this.logPosition(data.id, `Player made large position jump of ${jumpDistance.toFixed(2)} units`, 'error');
            }
            
            // Log movement for movement-related disappearances
            if (jumpDistance > 0.01) {
                this.logPosition(data.id, `Player moved ${jumpDistance.toFixed(4)} units`, 'log');
            }
            
            // Force scene parent check and re-add if necessary
            if (!player.mesh.parent) {
                this.logVisibility(data.id, `Player mesh lost parent reference, re-adding to scene`, 'error');
                this.scene.add(player.mesh);
                
                // Check if it was successfully added
                if (!player.mesh.parent) {
                    this.logVisibility(data.id, `FAILED to re-add player mesh during update`, 'error');
                }
            }
            
            // Calculate movement speed
            const movement = player.mesh.position.clone().sub(prevPosition);
            const speed = movement.length() / (1/60); // Assuming 60fps for animation timing
            
            // Mark this player as moving or stationary
            const wasMoving = player.isMoving;
            player.isMoving = speed > this.movementThreshold;
            player.movementSpeed = speed;
            
            // For explorer models, also check if there's any significant movement
            // This is critical to detect when they've stopped moving
            if (this.explorerModelPlayers.has(player.id)) {
                // Use a more sensitive threshold for explorer models
                const explorerThreshold = wasMoving ? this.explorerStopMovementThreshold : this.explorerMovementThreshold;
                
                // Log the speed and threshold for debugging
                this.logAnimation(player.id, `Explorer model speed: ${speed.toFixed(4)}, threshold: ${explorerThreshold}, isMoving: ${player.isMoving}`, 'log');
                
                // Override the movement detection with more sensitive thresholds for explorer models
                player.isMoving = speed > explorerThreshold;
                
                // Ensure we detect small movements for explorer models
                if (speed < this.explorerStopMovementThreshold) {
                    // If speed is very low, force it to be considered not moving
                    if (player.isMoving) {
                        this.logAnimation(player.id, `Explorer model force stopped: speed ${speed.toFixed(4)} below strict threshold`, 'log');
                        player.isMoving = false;
                    }
                }
            }
            
            // Track last movement time - this is critical
            if (player.isMoving) {
                player.lastMovementTime = Date.now();
                // Reset stale movement flag if they're moving again
                player.hasStaleMovement = false;
            }
            
            // Special handling for metaverse-explorer model
            if (this.explorerModelPlayers.has(player.id)) {
                // Use state machine approach like CharacterManager
                if (player.isMoving && (!player.animationState || player.animationState !== AnimationState.RUNNING)) {
                    this.transitionMetaverseExplorerState(player, AnimationState.RUNNING);
                } else if (!player.isMoving && player.animationState === AnimationState.RUNNING) {
                    this.transitionMetaverseExplorerState(player, AnimationState.IDLE);
                }
            } else {
                // IMPROVED: Better handling of movement state transitions for other models
                // Detect when player has stopped moving and transition to idle
                if (wasMoving && !player.isMoving) {
                    this.logAnimation(data.id, `Player stopped moving, transitioning to idle`, 'log');
                    this.transitionToIdleAnimation(player);
                }
            }
            
            // Log movement state change (important for troubleshooting animation-related issues)
            if (wasMoving !== player.isMoving) {
                this.logAnimation(data.id, `Player movement state changed: ${wasMoving ? 'moving' : 'still'} -> ${player.isMoving ? 'moving' : 'still'}`, 'log');
            }
            
            // Keep track of current frame for rendering
            player.lastRenderFrame = this.renderFrameCount || 0;
            
            // Handle animations based on movement
            if (this.explorerModelPlayers.has(player.id)) {
                // Skip standard animation update for explorer models
                // They are handled by the state machine
            } else {
                this.updatePlayerAnimation(player);
            }
            
            // Update matrix world to ensure proper rendering
            player.mesh.updateMatrixWorld(true);
            
            // Check mesh children visibility - log any changes
            let visibleChildren = 0;
            let totalChildren = 0;
            let childrenStates = [];
            
            player.mesh.traverse(child => {
                totalChildren++;
                if (child.visible) visibleChildren++;
                
                // Add detailed info about children for visibility tracking
                if (child.isMesh) {
                    childrenStates.push({
                        name: child.name || 'unnamed',
                        visible: child.visible,
                        frustumCulled: child.frustumCulled,
                        hasMaterial: !!child.material,
                        hasGeometry: !!child.geometry
                    });
                }
            });
            
            // When children counts change, log the details
            if (player.lastChildCount !== undefined && player.lastChildCount !== totalChildren) {
                this.logVisibility(data.id, `Player child count changed from ${player.lastChildCount} to ${totalChildren}`, 'warn');
                this.logVisibility(data.id, `Child states: ${JSON.stringify(childrenStates)}`, 'warn');
            }
            player.lastChildCount = totalChildren;
            
            // When visible children counts change, log the details
            if (player.lastVisibleChildCount !== undefined && player.lastVisibleChildCount !== visibleChildren) {
                this.logVisibility(data.id, `Player visible child count changed from ${player.lastVisibleChildCount} to ${visibleChildren}`, 'warn');
            }
            player.lastVisibleChildCount = visibleChildren;
            
            // Update name label position
            if (player.nameLabel) {
                player.nameLabel.position.set(
                    data.position.x,
                    data.position.y + this.nameLabelHeight,
                    data.position.z
                );
                player.nameLabel.visible = true;
                player.nameLabel.updateMatrixWorld(true);
                
                // Re-add label if not in scene
                if (!player.nameLabel.parent) {
                    this.logVisibility(data.id, `Player nameLabel lost parent reference, re-adding to scene`, 'error');
                    this.scene.add(player.nameLabel);
                }
            }
            
            // Update last seen time - CRITICAL for determining player disconnect state
            player.lastUpdate = Date.now();
            
            // Log player state after update
            this.logVisibility(data.id, `Player after update: {inScene: ${!!player.mesh.parent}, visible: ${player.mesh.visible}, visibleChildren: ${player.lastVisibleChildCount || 0}, totalChildren: ${player.lastChildCount || 0}, isMoving: ${player.isMoving}}`, 'log');
            
        } catch (error) {
            this.log('ERROR', `Error updating player ${data?.id}: ${error.message}`, 'error');
        }
    }

    // New helper method to update player animations
    updatePlayerAnimation(player) {
        if (!player || !player.mixer) return;
        
        // If no animations available, we can't animate
        if (!player.animations || Object.keys(player.animations).length === 0) {
            console.log(`[DIAGNOSTIC] Player ${player.id} has no animations available`);
            return;
        }
        
        try {
            // Get all available animations
            const animationNames = Object.keys(player.animations);
            
            // CRITICAL: Check for stale movement
            const now = Date.now();
            const timeSinceLastMovement = now - (player.lastMovementTime || 0);
            const timeSinceLastUpdate = now - (player.lastUpdate || 0);
            
            // Mark movement as stale if it's been more than 3 seconds since an update
            // but they're still marked as "moving"
            if (player.isMoving && timeSinceLastUpdate > 3000 && !player.hasStaleMovement) {
                this.logAnimation(player.id, `Detected stale movement after ${timeSinceLastUpdate}ms without updates`, 'warn');
                player.hasStaleMovement = true;
                
                // Force pause the animation since they're likely no longer moving
                if (player.currentAnimationAction) {
                    this.logAnimation(player.id, `Pausing animation due to stale movement state`, 'warn');
                    player.currentAnimationAction.paused = true;
                    
                    // FIXED: Switch to idle animation when movement becomes stale
                    this.transitionToIdleAnimation(player);
                }
                // Keep the model visible but pause animation - IMPORTANT: Do not change visibility here
                if (player.mesh) {
                    // Ensure the mesh stays visible even when animation is paused
                    player.mesh.visible = true;
                    
                    // Force matrix update to maintain position/rotation
                    player.mesh.updateMatrix();
                    player.mesh.updateMatrixWorld(true);
                }
            }
            
            // Get all available animations based on our predefined animation names
            let walkAction = null;
            let runAction = null;
            let idleAction = null;
            
            // Find matching animations from player's available animations
            for (const animName of this.walkAnimationNames) {
                if (player.animations[animName]) {
                    walkAction = player.animations[animName];
                    break;
                }
            }
            
            for (const animName of this.runAnimationNames) {
                if (player.animations[animName]) {
                    runAction = player.animations[animName];
                    break;
                }
            }
            
            for (const animName of this.idleAnimationNames) {
                if (player.animations[animName]) {
                    idleAction = player.animations[animName];
                    break;
                }
            }
            
            // If no specific idle animation, handle the special case:
            // 1. If stationary and we only have mixamo.com, pause the animation
            // 2. If moving and we only have mixamo.com, play it
            if (!idleAction && animationNames.length === 1 && animationNames[0] === 'mixamo.com') {
                // Always keep the model visible even when paused
                if (player.mesh) player.mesh.visible = true;
                
                if ((!player.isMoving || player.hasStaleMovement) && this.pauseAnimationsWhenStill) {
                    // Pause the animation if player is not moving or has stale movement
                    if (player.currentAnimationAction && !player.currentAnimationAction.paused) {
                        console.log(`[DIAGNOSTIC] Pausing mixamo animation for stationary player ${player.id}`);
                        player.currentAnimationAction.paused = true;
                        
                        // FIXED: Reset animation to first frame for better visual when stationary
                        player.currentAnimationAction.reset();
                    }
                    return;
                } else if (player.isMoving && !player.hasStaleMovement) {
                    // Resume the animation if player is moving and animation is paused and not stale
                    if (player.currentAnimationAction && player.currentAnimationAction.paused) {
                        console.log(`[DIAGNOSTIC] Resuming mixamo animation for moving player ${player.id}`);
                        player.currentAnimationAction.paused = false;
                    }
                }
            }
            
            // Determine appropriate animation based on movement state and staleness
            let newAnimation = null;
            if (player.isMoving && !player.hasStaleMovement) {
                // IMPORTANT: When running or walking, ensure the model is properly oriented in the direction of movement
                if (player.movementSpeed > this.runThreshold && runAction) {
                    newAnimation = 'run';
                    
                    // Align model's rotation with movement direction if we have position history
                    if (player.previousPosition && player.mesh) {
                        this.alignModelWithMovementDirection(player);
                    }
                } else if (walkAction) {
                    newAnimation = 'walk';
                    
                    // Also align during walking, but more gently
                    if (player.previousPosition && player.mesh) {
                        this.alignModelWithMovementDirection(player);
                    }
                }
            } else if (idleAction) {
                newAnimation = 'idle';
            }
            
            // If no appropriate animation was found based on state but we have a single animation,
            // use that for walking only (pause it when standing still)
            if (!newAnimation && animationNames.length === 1) {
                const onlyAnimName = animationNames[0];
                if (player.isMoving && !player.hasStaleMovement) {
                    // Use the only animation we have when moving
                    newAnimation = 'generic-walk';
                    // Set current animation action if not yet set
                    if (!player.currentAnimationAction) {
                        player.currentAnimationAction = player.animations[onlyAnimName];
                    }
                    // Make sure it's not paused
                    if (player.currentAnimationAction) {
                        player.currentAnimationAction.paused = false;
                    }
                } else if ((this.pauseAnimationsWhenStill || player.hasStaleMovement) && player.currentAnimationAction) {
                    // Pause the animation when still or when movement is stale
                    player.currentAnimationAction.paused = true;
                    return; // Skip the rest of the animation change logic
                }
            }
            
            // Always keep the model visible regardless of animation state
            if (player.mesh) player.mesh.visible = true;
            
            // Only change animation if needed and we found an appropriate one
            if (newAnimation && newAnimation !== player.currentAnimation && !player.hasStaleMovement) {
                console.log(`[DIAGNOSTIC] Changing player ${player.id} animation to: ${newAnimation}`);
                
                // Fade out current animation if any
                if (player.currentAnimation && player.animations[player.currentAnimation]) {
                    player.animations[player.currentAnimation].fadeOut(this.animationTransitionTime);
                } else if (player.currentAnimationAction) {
                    player.currentAnimationAction.fadeOut(this.animationTransitionTime);
                }
                
                // Start new animation
                let actionToPlay = null;
                
                if (newAnimation === 'run') {
                    actionToPlay = runAction;
                } else if (newAnimation === 'walk' || newAnimation === 'generic-walk') {
                    actionToPlay = walkAction || player.animations[animationNames[0]];
                } else { // idle
                    actionToPlay = idleAction;
                }
                    
                if (actionToPlay) {
                    // IMPROVED: Ensure proper animation reset and play for smoother transitions
                    actionToPlay.reset();
                    actionToPlay.fadeIn(this.animationTransitionTime);
                    actionToPlay.play();
                    
                    // Store the current animation state
                    player.currentAnimation = newAnimation;
                    player.currentAnimationAction = actionToPlay;
                    
                    // Ensure animation isn't paused when we explicitly start it
                    player.currentAnimationAction.paused = false;
                    
                    this.logAnimation(player.id, `Started ${newAnimation} animation`, 'log');
                }
            }
            
            // Ensure the right animation state based on movement
            if (player.currentAnimationAction) {
                if ((!player.isMoving || player.hasStaleMovement) && this.pauseAnimationsWhenStill && 
                    (player.currentAnimation === 'generic-walk' || 
                     player.currentAnimation === 'walk' && animationNames.length === 1)) {
                    // FIXED: Instead of just pausing, transition to idle if available,
                    // otherwise pause and reset to the first frame for a better visual
                    if (idleAction && player.currentAnimation !== 'idle') {
                        // If we have an idle animation but we're not using it, switch to it
                        this.transitionToIdleAnimation(player);
                    } else if (!player.currentAnimationAction.paused) {
                        // If no idle animation, pause the current one and reset to first frame
                        this.logAnimation(player.id, `Pausing animation for stationary player`, 'log');
                        player.currentAnimationAction.paused = true;
                        player.currentAnimationAction.time = 0; // Reset to first frame
                    }
                } else if (player.isMoving && !player.hasStaleMovement && player.currentAnimationAction.paused) {
                    // Unpause animations when player is moving and not stale
                    this.logAnimation(player.id, `Unpausing animation for moving player`, 'log');
                    player.currentAnimationAction.paused = false;
                }
            }
            
        } catch (error) {
            this.logAnimation(player.id, `Error updating animation: ${error.message}`, 'error');
        }
    }

    // Add a new helper method to align the model with its movement direction
    alignModelWithMovementDirection(player) {
        if (!player || !player.mesh || !player.previousPosition) return;
        
        const position = player.mesh.position;
        const prevPosition = player.previousPosition;
        
        // Calculate movement vector (in X-Z plane only)
        const movement = new THREE.Vector2(
            position.x - prevPosition.x,
            position.z - prevPosition.z
        );
        
        // Only align if there's significant movement
        if (movement.length() > 0.01) {
            // FIXED: Calculate the angle correctly - Z axis is forward in standard Three.js coordinate system
            // atan2 takes y, x but we want to calculate angle in the X-Z plane, so we use (movement.x, movement.y)
            // where movement.y contains our Z component
            const angle = Math.atan2(movement.x, movement.y);
            
            this.logPosition(player.id, `Movement vector: (${movement.x.toFixed(3)}, ${movement.y.toFixed(3)}), angle: ${angle.toFixed(3)}`, 'log');
            
            // Store current Y rotation to check if we need significant adjustment
            const currentYRotation = player.mesh.rotation.y;
            const rotationDifference = Math.abs(currentYRotation - angle);
            
            // Only make significant adjustments when needed
            if (rotationDifference > 0.1) { // About 5.7 degrees threshold
                // Smooth transition to the new rotation (interpolate)
                // This prevents snapping and makes movement look more natural
                const lerp = THREE.MathUtils.lerp(currentYRotation, angle, 0.2); // 0.2 = 20% blend per frame
                
                // Set the rotation - only modify Y axis (keep X and Z as is)
                player.mesh.rotation.y = lerp;
                
                this.logAnimation(player.id, `Aligned model rotation with movement direction: ${lerp.toFixed(2)}`, 'log');
                
                // Force update matrices to ensure rotation is applied
                player.mesh.updateMatrix();
                player.mesh.updateMatrixWorld(true);
            }
        }
        
        // Store current position for next frame
        player.previousPosition = position.clone();
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
        console.log(`[DIAGNOSTIC] Added player ${data.id} to pendingAvatars, size now: ${this.pendingAvatars.size}`);
        
        try {
            let mesh;
            let animations = {};
            let mixer = null;
            const isLocalPlayer = data.id === this.playerId;
            
            // Determine which model to load
            let modelPath = data.avatarUrl || this.modelPath;
            console.log(`[DIAGNOSTIC] Loading model for player ${data.id}, path: ${modelPath}, isLocalPlayer: ${isLocalPlayer}`);
            
            // Check if this is the explorer model - used for enhanced animation handling
            const isExplorerModel = modelPath.includes('metaverse-explorer.glb');
            if (isExplorerModel) {
                console.log(`[DIAGNOSTIC] Detected metaverse-explorer model for player ${data.id} - will use enhanced animation handling`);
            }
            
            // For local player, use the local model if available
            if (isLocalPlayer && this.localPlayerModel) {
                console.log('[DIAGNOSTIC] Using local player model');
                mesh = this.localPlayerModel.clone();
                console.log('[DIAGNOSTIC] Local model clone successful, children:', mesh.children.length);
                
                // Store this model's properties with the player
                this.safeReferences.add(mesh);
                
                // Clone animations from local player if available
                if (this.localPlayerModel.animations) {
                    console.log('[DIAGNOSTIC] Local model has animations:', this.localPlayerModel.animations.length);
                    mixer = new THREE.AnimationMixer(mesh);
                    this.localPlayerModel.animations.forEach(anim => {
                        const action = mixer.clipAction(anim);
                        animations[anim.name] = action;
                        console.log(`[DIAGNOSTIC] Added animation: ${anim.name}`);
                    });
                } else {
                    console.warn('[DIAGNOSTIC] Local player model has no animations');
                }
            } else {
                // Load the appropriate model
                console.log(`[DIAGNOSTIC] Starting remote model load for player ${data.id}`);
                try {
                    console.time(`loadModel-${data.id}`);
                    const gltf = await this.loadModel(modelPath);
                    console.timeEnd(`loadModel-${data.id}`);
                    console.log(`[DIAGNOSTIC] Model loaded for player ${data.id}:`, {
                        hasScene: !!gltf.scene,
                        animationCount: gltf.animations ? gltf.animations.length : 0,
                        sceneChildren: gltf.scene ? gltf.scene.children.length : 0
                    });
                    
                    mesh = gltf.scene;
                    
                    // Store with safe references
                    this.safeReferences.add(mesh);
                    if (gltf.animations) {
                        gltf.animations.forEach(anim => this.safeReferences.add(anim));
                    }
                    
                    // Set up animations if available
                    if (gltf.animations && gltf.animations.length) {
                        console.log(`[DIAGNOSTIC] Setting up ${gltf.animations.length} animations for player ${data.id}`);
                        mixer = new THREE.AnimationMixer(mesh);
                        
                        gltf.animations.forEach(animation => {
                            const action = mixer.clipAction(animation);
                            animations[animation.name] = action;
                            console.log(`[DIAGNOSTIC] Added animation: ${animation.name}`);
                        });
                        
                        // For single animation models like mixamo.com, initialize but pause
                        if (gltf.animations.length === 1) {
                            const animName = gltf.animations[0].name;
                            console.log(`[DIAGNOSTIC] Initializing single animation ${animName} for player ${data.id}`);
                            
                            // Create the action but pause it if player is not moving
                            const action = animations[animName];
                            action.play(); // Initialize the animation
                            action.paused = true; // Pause it initially (will be unpaused when moving)
                            
                            // Store as current animation
                            let player = this.players.get(data.id) || {};
                            player.currentAnimation = 'generic-walk'; // Mark as generic walk
                            player.currentAnimationAction = action;
                            player.isMoving = false; // Initially not moving
                            player.movementSpeed = 0;
                            this.players.set(data.id, player);
                        } else {
                            // Try to find an idle animation for models with multiple animations
                            let foundIdleAnimation = false;
                            for (const animName of this.idleAnimationNames) {
                                if (animations[animName]) {
                                    console.log(`[DIAGNOSTIC] Playing initial ${animName} animation for player ${data.id}`);
                                    animations[animName].play();
                                    foundIdleAnimation = true;
                                    
                                    // Store as current animation
                                    let player = this.players.get(data.id) || {};
                                    player.currentAnimation = animName;
                                    player.currentAnimationAction = animations[animName];
                                    player.isMoving = false;
                                    player.movementSpeed = 0;
                                    this.players.set(data.id, player);
                                    break;
                                }
                            }
                            
                            if (!foundIdleAnimation) {
                                console.warn(`[DIAGNOSTIC] No idle animation found for player ${data.id}`);
                            }
                        }
                    } else {
                        console.warn(`[DIAGNOSTIC] No animations found in model for player ${data.id}`);
                    }
                } catch (error) {
                    console.error(`[DIAGNOSTIC] Error loading model for player ${data.id}:`, error);
                    return this.createFallbackAvatar(data);
                }
            }
            
            // Create a container group to help with visibility and transformations
            const container = new THREE.Group();
            container.add(mesh);
            mesh = container; // Use the container as the player mesh
            
            // Add to safe references
            this.safeReferences.add(container);
            
            // Ensure mesh is properly configured
            mesh.visible = true;
            mesh.frustumCulled = false;
            
            // Count meshes before traverse
            let meshCount = 0;
            mesh.traverse(child => {
                if (child.isMesh) meshCount++;
            });
            console.log(`[DIAGNOSTIC] Player ${data.id} model has ${meshCount} mesh objects`);
            
            // IMPROVED: Ensure all meshes and materials are properly configured 
            // to prevent disappearance during movement/rotation
            mesh.traverse((child) => {
                if (child.isMesh) {
                    child.visible = true;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.frustumCulled = false; // Critical to prevent disappearance
                    
                    // Store in safe references to prevent GC
                    this.safeReferences.add(child);
                    
                    console.log(`[DIAGNOSTIC] Configured mesh '${child.name}' for player ${data.id}`);
                    
                    if (child.material) {
                        const configureMaterial = (material) => {
                            material.transparent = false;
                            material.opacity = 1;
                            material.needsUpdate = true;
                            material.depthWrite = true;
                            material.depthTest = true;
                            
                            // Store in safe references
                            this.safeReferences.add(material);
                        };
                        
                        // Handle both single materials and material arrays
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => configureMaterial(mat));
                        } else {
                            configureMaterial(child.material);
                        }
                    }
                    
                    // Ensure geometry is stored in safe references
                    if (child.geometry) {
                        this.safeReferences.add(child.geometry);
                    }
                }
            });
            
            // Set initial position and rotation
            mesh.position.set(data.position?.x || 0, data.position?.y || 0, data.position?.z || 0);
            mesh.rotation.set(data.rotation?.x || 0, data.rotation?.y || 0, data.rotation?.z || 0);
            
            // Create and position name label for all players (including local)
            const username = data.username || `Player${data.id.slice(0, 4)}`;
            const nameLabel = this.createNameLabel(username);
            nameLabel.position.set(
                mesh.position.x,
                mesh.position.y + this.nameLabelHeight,
                mesh.position.z
            );
            nameLabel.renderOrder = 999;
            nameLabel.visible = true;
            nameLabel.frustumCulled = false;
            
            // Add to safe references
            this.safeReferences.add(nameLabel);
            
            // Add to scene
            this.scene.add(nameLabel);
            
            // Add mesh to scene
            console.log(`[DIAGNOSTIC] Adding player ${data.id} mesh to scene`);
            this.scene.add(mesh);
            
            // Store or update player data
            const existingPlayer = this.players.get(data.id) || {};
            this.players.set(data.id, {
                ...existingPlayer,
                id: data.id, // Store ID for error tracing
                username,
                mesh,
                nameLabel,
                modelPath,
                avatarUrl: data.avatarUrl, // Store the avatarUrl with the player
                mixer,
                animations,
                lastUpdate: Date.now(),
                lastMovementTime: Date.now(), // Initialize lastMovementTime
                hasStaleMovement: false,      // Track if movement is stale
                isLocalPlayer,
                isMoving: false, // Not moving initially
                movementSpeed: 0,
                lastRenderFrame: 0 // Track last render frame
            });
            
            // Mark explorer model players for special handling
            if (isExplorerModel) {
                this.explorerModelPlayers.add(data.id);
                
                // Initialize animation state for explorer models
                const player = this.players.get(data.id);
                if (player) {
                    player.animationState = AnimationState.IDLE;
                    player.previousAnimationState = AnimationState.IDLE;
                    player.lastIdleTime = Date.now(); // Track when we last were idle
                    player.lastRunningTime = 0; // Track when we last were running
                    this.logAnimation(data.id, `Initialized explorer model animation state to IDLE`, 'log');
                    
                    // Force idle state for consistency
                    this.handleExplorerIdleTransition(player);
                }
            }
            
            // Force an initial matrix update
            mesh.updateMatrixWorld(true);
            nameLabel.updateMatrixWorld(true);
            
            console.log(`[DIAGNOSTIC] Player ${data.id} avatar complete. In scene: ${!!mesh.parent}, visible: ${mesh.visible}`);
            
        } catch (error) {
            console.error(`[DIAGNOSTIC] Fatal error creating avatar for player ${data.id}:`, error);
            return this.createFallbackAvatar(data);
        } finally {
            this.pendingAvatars.delete(data.id);
            console.log(`[DIAGNOSTIC] Removed player ${data.id} from pendingAvatars, size now: ${this.pendingAvatars.size}`);
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
        
        // Create username label for all players
        const nameLabel = this.createNameLabel(data.username);
        nameLabel.position.copy(mesh.position);
        nameLabel.position.y += this.nameLabelHeight;
        nameLabel.renderOrder = 999;
        
        this.scene.add(mesh);
        this.scene.add(nameLabel);
        
        const isLocalPlayer = data.id === this.playerId;
        
        this.players.set(data.id, {
            username: data.username,
            mesh: mesh,
            nameLabel: nameLabel,
            isLocalPlayer: isLocalPlayer,
            avatarUrl: data.avatarUrl, // Store the avatarUrl with the player
            lastUpdate: Date.now()
        });
        
        console.log('[MultiplayerManager] Fallback avatar created successfully');
    }

    removePlayerAvatar(playerId) {
        console.log('[MultiplayerManager] Removing avatar for player:', playerId);
        const player = this.players.get(playerId);
        if (player) {
            // Log removal to help diagnosing disappearances
            console.error(`[CRITICAL] Explicitly removing player ${playerId} from scene`);
            console.error(`[CRITICAL] Player state at removal: ${JSON.stringify({
                hasParent: player.mesh && !!player.mesh.parent,
                parentType: player.mesh && player.mesh.parent ? player.mesh.parent.type : 'none',
                visible: player.mesh && player.mesh.visible,
                position: player.mesh && {...player.mesh.position},
                childCount: player.mesh && player.mesh.children.length
            })}`);
            
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
            
            // Clean up any explorer model tracking
            if (this.explorerModelPlayers.has(playerId)) {
                this.explorerModelPlayers.delete(playerId);
                console.log(`[MultiplayerManager] Removed player ${playerId} from explorer model tracking`);
            }
            
            // Clear from players map
            this.players.delete(playerId);
            
            // Remove from disappearance log
            this.playerDisappearanceLog.delete(playerId);
            
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
                // Store previous position to detect large jumps
                const prevPos = player.mesh.position.clone();
                
                // Update local position first
                player.mesh.position.copy(position);
                player.mesh.rotation.copy(rotation);
                
                // Check for large position jump
                const jumpDistance = prevPos.distanceTo(position);
                if (jumpDistance > 50) {
                    console.error(`[CRITICAL] Local player made large position jump of ${jumpDistance.toFixed(2)} units`);
                }
                
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
                
                // Log rotation for debugging
                this.logPosition(this.playerId, `Sending rotation: (${rotation.x.toFixed(2)}, ${rotation.y.toFixed(2)}, ${rotation.z.toFixed(2)})`, 'log');
                
                // Ensure all children update their matrices
                const childContainer = player.mesh.children[0];
                if (childContainer) {
                    childContainer.updateMatrix();
                    childContainer.updateMatrixWorld(true);
                }
                
                // Detect platform to send with update
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
                const platform = isIOS && isSafari ? 'ios-safari' : 
                                 isIOS ? 'ios-other' :
                                 /Android/i.test(navigator.userAgent) ? 'android' :
                                 /Chrome/i.test(navigator.userAgent) ? 'chrome' : 'other';
                
                // Send update to server with properly formatted rotation
                // Make sure we're sending the actual rotation values from the mesh
                this.socket.emit('playerUpdate', {
                    position: {
                        x: player.mesh.position.x,
                        y: player.mesh.position.y,
                        z: player.mesh.position.z
                    },
                    rotation: {
                        x: player.mesh.rotation.x,
                        y: player.mesh.rotation.y,
                        z: player.mesh.rotation.z
                    },
                    avatarUrl: this.getAvatarUrl(), // Add avatarUrl to player updates
                    platform: platform // Add platform information
                });
            }
        }
    }

    getUsername() {
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('username');
        
        if (!username) {
            console.error('[MultiplayerManager] No username found in URL parameters');
            return null;
        }
        
        return username;
    }

    getAvatarUrl() {
        // If we have a custom avatar URL from the local player model, use that first
        if (this.customAvatarUrl) {
            return this.customAvatarUrl;
        }
        
        // Fall back to URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('avatar_url') || null;
    }

    // Get the current player position
    getCurrentPosition() {
        const player = this.players.get(this.playerId);
        if (player && player.mesh) {
            return {
                x: player.mesh.position.x,
                y: player.mesh.position.y,
                z: player.mesh.position.z
            };
        }
        
        // Default position if player not yet created
        return { x: 0, y: 0, z: 0 };
    }

    // Get the current player rotation
    getCurrentRotation() {
        const player = this.players.get(this.playerId);
        if (player && player.mesh) {
            return {
                x: player.mesh.rotation.x,
                y: player.mesh.rotation.y,
                z: player.mesh.rotation.z
            };
        }
        
        // Default rotation if player not yet created
        return { x: 0, y: 0, z: 0 };
    }

    update(deltaTime) {
        // Increment render frame counter for tracking
        this.renderFrameCount = (this.renderFrameCount || 0) + 1;
        this.frameCounter++;
        
        // Model reset timer 
        this.modelResetTimer += deltaTime * 1000; // Convert to ms
        const shouldResetModels = this.modelResetTimer >= this.modelResetInterval;
        if (shouldResetModels) {
            this.log('SYS', `Running scheduled model reset check`, 'log');
            this.modelResetTimer = 0;
        }
        
        // Only run detailed scene tracking on specified frames to avoid performance hit
        if (this.frameCounter % this.logFrequency === 0) {
            // Log scene graph size
            const sceneChildCount = this.scene.children.length;
            
            // Compare with previous frame to detect disappearances
            if (this.sceneChildren.length > 0 && sceneChildCount < this.sceneChildren.length) {
                this.logScene(`Scene children decreased from ${this.sceneChildren.length} to ${sceneChildCount}. Something is being removed!`, 'error');
                
                // Find what was removed
                const previousIds = this.sceneChildren.map(child => child.id);
                const currentIds = this.scene.children.map(child => child.id);
                const removedIds = previousIds.filter(id => !currentIds.includes(id));
                
                if (removedIds.length > 0) {
                    this.logScene(`Objects removed from scene - IDs: ${removedIds.join(', ')}`, 'error');
                    
                    // Check if any of these belong to players
                    this.players.forEach((player, playerId) => {
                        if (player.mesh && removedIds.includes(player.mesh.id)) {
                            this.logVisibility(playerId, `Player mesh was removed from scene! ID: ${player.mesh.id}`, 'error');
                            
                            // ADDED: Immediately attempt to re-add player to scene
                            this.scene.add(player.mesh);
                            player.mesh.updateMatrix();
                            player.mesh.updateMatrixWorld(true);
                        }
                        if (player.nameLabel && removedIds.includes(player.nameLabel.id)) {
                            this.logVisibility(playerId, `Player nameLabel was removed from scene! ID: ${player.nameLabel.id}`, 'error');
                            
                            // ADDED: Immediately attempt to re-add nameLabel to scene
                            this.scene.add(player.nameLabel);
                            player.nameLabel.updateMatrix();
                            player.nameLabel.updateMatrixWorld(true);
                        }
                    });
                }
            }
            
            // Store current scene children for next comparison
            this.sceneChildren = [...this.scene.children];
            
            // Log scene composition
            const objectTypes = {};
            this.scene.traverse(child => {
                const type = child.type || 'Unknown';
                objectTypes[type] = (objectTypes[type] || 0) + 1;
            });
            this.logScene(`Scene composition: ${JSON.stringify(objectTypes)}`, 'log');
        }
        
        // ADDED: Always check for players that should be in scene but aren't
        // This ensures players are always visible, even after scene manipulations
        this.players.forEach((player, id) => {
            if (player.mesh && !player.mesh.parent) {
                this.logVisibility(id, `Player mesh not in scene during update loop, re-adding`, 'warn');
                this.scene.add(player.mesh);
                player.mesh.visible = true;
                player.mesh.updateMatrix();
                player.mesh.updateMatrixWorld(true);
            }
            
            if (player.nameLabel && !player.nameLabel.parent) {
                this.logVisibility(id, `Player nameLabel not in scene during update loop, re-adding`, 'warn');
                this.scene.add(player.nameLabel);
                player.nameLabel.visible = true;
                player.nameLabel.updateMatrix();
                player.nameLabel.updateMatrixWorld(true);
            }
        });
        
        // Check if any players have an invisible mesh but visible nameLabel or vice versa
        this.players.forEach((player, id) => {
            if (player.mesh && player.nameLabel && (player.mesh.visible !== player.nameLabel.visible)) {
                this.logVisibility(id, `Player has mismatched visibility: mesh=${player.mesh.visible}, nameLabel=${player.nameLabel.visible}`, 'warn');
                
                // ADDED: Force both to be visible
                player.mesh.visible = true;
                player.nameLabel.visible = true;
            }
        });
        
        // Update animations and ensure visibility for all players
        this.players.forEach((player, id) => {
            // Skip if player is not fully initialized
            if (!player || !player.mesh) return;
            
            // Check for disconnected players that should be removed
            const now = Date.now();
            const timeSinceLastUpdate = now - (player.lastUpdate || 0);
            
            // Remove players after inactivity timeout instead of just marking them as disconnected
            if (timeSinceLastUpdate > this.inactivityTimeout && !player.isDisconnected) {
                this.logVisibility(id, `Player hasn't been updated in ${this.inactivityTimeout/1000} seconds, removing`, 'warn');
                
                // Remove disconnected player completely
                this.removePlayerAvatar(id);
                
                // Skip the rest of the update for this player since they're removed
                return;
            }
            
            // Check for stale movement based on time since last update
            // If no movement updates for 3 seconds but still marked as moving, mark movement as stale
            if (player.isMoving && timeSinceLastUpdate > 3000 && !player.hasStaleMovement) {
                this.logAnimation(id, `Marking movement as stale after ${timeSinceLastUpdate}ms without updates`, 'warn');
                player.hasStaleMovement = true;
                
                // Force animation pause
                if (player.currentAnimationAction && !player.currentAnimationAction.paused) {
                    this.logAnimation(id, `Pausing animation due to stale movement in update loop`, 'warn');
                    player.currentAnimationAction.paused = true;
                }
            }
            
            // Update animation with deltaTime if not paused
            if (player.mixer) {
                if (this.explorerModelPlayers.has(id)) {
                    // Special handling for explorer models
                    // Always update the mixer, but only if we're in the RUNNING state
                    if (player.animationState === AnimationState.RUNNING) {
                        player.mixer.update(deltaTime);
                    }
                    
                    // Double-check movement state during update loop
                    // If player hasn't moved in the specified time but is still in RUNNING state, force idle
                    const timeSinceLastMovement = now - (player.lastMovementTime || 0);
                    if (player.animationState === AnimationState.RUNNING && timeSinceLastMovement > this.idleTransitionTimeout && !player.forcingIdle) {
                        this.logAnimation(id, `Explorer model force idle due to ${timeSinceLastMovement}ms without movement`, 'log');
                        player.forcingIdle = true;
                        // Force transition to idle
                        this.transitionMetaverseExplorerState(player, AnimationState.IDLE);
                        // Reset forcing flag after a short delay
                        setTimeout(() => {
                            player.forcingIdle = false;
                        }, 500);
                    }
                } else {
                    // Standard handling for other models
                    if (player.currentAnimationAction && !player.currentAnimationAction.paused && !player.hasStaleMovement) {
                        player.mixer.update(deltaTime);
                    }
                }
            }
            
            // Force model recreation if scheduled reset time or if model is broken
            const modelIsBroken = !player.mesh.parent || !player.mesh.visible || 
                                 (player.mixer && player.animations && 
                                  Object.keys(player.animations).length > 0 && 
                                  !player.currentAnimation);
                                  
            if ((shouldResetModels && id !== this.playerId) || modelIsBroken) {
                // Only reset if truly broken (avoid unnecessary resets)
                if (modelIsBroken) {
                    this.logVisibility(id, `Force recreating broken model for player. inScene=${!!player.mesh.parent}, visible=${player.mesh.visible}, hasAnimation=${!!(player.currentAnimation)}`, 'error');
                    
                    // Log the full state of the player for debugging
                    this.logModel(id, `Player state before recreation: ${JSON.stringify({
                        inScene: !!player.mesh.parent,
                        visible: player.mesh.visible,
                        childCount: player.mesh.children.length,
                        hasAnimations: player.animations ? Object.keys(player.animations).length : 0,
                        currentAnimation: player.currentAnimation || 'none',
                        isMoving: player.isMoving
                    })}`, 'warn');
                    
                    // Store current transform
                    const position = player.mesh.position.clone();
                    const rotation = player.mesh.rotation.clone();
                    
                    // Remove from players map but keep in pendingAvatars to avoid duplicate creation
                    this.pendingAvatars.add(id);
                    
                    // Clean up old mesh first
                    if (player.mesh.parent) {
                        player.mesh.parent.remove(player.mesh);
                    }
                    if (player.nameLabel && player.nameLabel.parent) {
                        player.nameLabel.parent.remove(player.nameLabel);
                    }
                    
                    // Reset timers and monitors
                    this.playerDisappearanceLog.delete(id);
                    
                    // Force delay with setTimeout to avoid multiple recreation attempts
                    setTimeout(() => {
                        // Create new avatar at same position
                        this.createPlayerAvatar({
                            id: id,
                            username: player.username || `Player${id.slice(0, 4)}`,
                            position: position,
                            rotation: rotation,
                            avatarUrl: player.modelPath
                        });
                        
                        this.logModel(id, `Player model recreation completed`, 'log');
                    }, 500); // 0.5 second delay to avoid recursion
                    
                    // Skip the rest of updates for this player
                    return;
                }
            }
            
            // Update player ID for error tracing
            player.id = id;
            
            // Add to safe references to prevent garbage collection
            this.safeReferences.add(player.mesh);
            if (player.nameLabel) this.safeReferences.add(player.nameLabel);
            
            // Add all child meshes to safe references too
            player.mesh.traverse(child => {
                if (child.isMesh) {
                    this.safeReferences.add(child);
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => this.safeReferences.add(mat));
                        } else {
                            this.safeReferences.add(child.material);
                        }
                    }
                    if (child.geometry) {
                        this.safeReferences.add(child.geometry);
                    }
                }
            });
            
            // Track visibility history for detecting disappearances
            if (!this.playerDisappearanceLog.has(id)) {
                this.playerDisappearanceLog.set(id, []);
            }
            
            // Check if player was previously visible and is now gone
            const wasInScene = player.mesh.parent === this.scene;
            const isVisible = player.mesh.visible;
            const visibilityHistory = this.playerDisappearanceLog.get(id);
            
            // Add current state to history (keep only last 10 entries)
            visibilityHistory.push({
                frame: this.renderFrameCount,
                inScene: wasInScene,
                visible: isVisible,
                hasParent: !!player.mesh.parent,
                parentType: player.mesh.parent ? player.mesh.parent.type : 'none',
                position: {...player.mesh.position},
                childCount: player.mesh.children.length
            });
            
            if (visibilityHistory.length > 10) {
                visibilityHistory.shift(); // Remove oldest entry
            }
            
            // Detect disappearance (was in scene, now not in scene)
            const previousState = visibilityHistory[visibilityHistory.length - 2];
            if (previousState && previousState.inScene && !wasInScene) {
                this.logVisibility(id, `Player disappeared from scene between frames ${previousState.frame} and ${this.renderFrameCount}`, 'error');
                this.logVisibility(id, `Previous state: ${JSON.stringify(previousState)}`, 'error');
                this.logVisibility(id, `Current state: inScene=${wasInScene}, visible=${isVisible}, hasParent=${!!player.mesh.parent}, parentType=${player.mesh.parent ? player.mesh.parent.type : 'none'}`, 'error');
                this.logVisibility(id, `Re-adding player to scene`, 'error');
                
                // Force re-add to scene
                this.scene.add(player.mesh);
                
                // Verify it was added successfully
                this.logVisibility(id, `Player re-add success: ${player.mesh.parent === this.scene}`, 'error');
            }
            
            // Skip local player - it's handled differently
            if (id === this.playerId) return;
            
            // Check player state periodically (only log every 5 seconds to avoid spam)
            if (!player.lastDiagnosticTime || now - player.lastDiagnosticTime > 5000) {
                this.logVisibility(id, `Player state: inScene=${!!player.mesh.parent}, visible=${player.mesh.visible}, childCount=${player.mesh.children.length}, hasAnimations=${player.animations ? Object.keys(player.animations).length : 0}, currentAnimation=${player.currentAnimation || 'none'}, timeSinceLastUpdate=${now - player.lastUpdate}ms, isMoving=${player.isMoving}`, 'log');
                player.lastDiagnosticTime = now;
            }
            
            // Force mesh to be visible ALWAYS, regardless of animation state
            player.mesh.visible = true;
            
            // Ensure name label is in scene and visible
            if (player.nameLabel) {
                const wasLabelVisible = player.nameLabel.visible;
                player.nameLabel.visible = true;
                
                if (!wasLabelVisible) {
                    this.logVisibility(id, `Player nameLabel was invisible, forcing visibility`, 'error');
                }
                
                if (!player.nameLabel.parent) {
                    this.logVisibility(id, `Player nameLabel not in scene! Re-adding.`, 'error');
                    this.scene.add(player.nameLabel);
                    
                    // Check if it was successfully added
                    if (!player.nameLabel.parent) {
                        this.logVisibility(id, `FAILED to re-add player nameLabel to scene!`, 'error');
                    }
                }
                
                // Update name label position
                player.nameLabel.position.set(
                    player.mesh.position.x,
                    player.mesh.position.y + this.nameLabelHeight,
                    player.mesh.position.z
                );
                player.nameLabel.updateMatrixWorld(true);
            }
            
            // Update model matrix
            player.mesh.updateMatrixWorld(true);
            
            // Check if player hasn't been updated in a while (use inactivityTimeout)
            if (now - player.lastUpdate > this.inactivityTimeout) {
                this.logVisibility(id, `Player hasn't been updated in ${this.inactivityTimeout/1000} seconds, removing`, 'warn');
                this.removePlayerAvatar(id);
            }
        });
    }

    dispose() {
        console.log('[MultiplayerManager] Disposing of multiplayer manager');
        if (this.socket) {
            this.socket.disconnect();
        }
        this.restoreSceneMethods();
        this.cleanupAllPlayers();
        this.isConnected = false;
        this.playerId = null;
        
        // Clear safe references
        this.safeReferences.clear();
    }

    // Enhanced method to set local player model
    setLocalPlayerModel(model) {
        // Store the model for future use
        this.localPlayerModel = model;
        
        // Extract and store the avatarUrl from the model's userData
        if (model && model.userData) {
            if (model.userData.avatarUrl) {
                console.log('[MultiplayerManager] Local player using custom avatar URL:', model.userData.avatarUrl);
                this.customAvatarUrl = model.userData.avatarUrl;
            } else if (model.userData.modelPath) {
                console.log('[MultiplayerManager] Local player using model path:', model.userData.modelPath);
                this.customAvatarUrl = model.userData.modelPath;
            }
        }
        
        // If the model doesn't have animations attached directly, but they exist in the characterManager,
        // we need to make sure they're accessible when the local player is created
        // This is handled by obtaining animations from the CharacterManager
        
        console.log('[MultiplayerManager] Local player model set successfully');
    }

    loadModel(path) {
        return new Promise((resolve, reject) => {
            console.log('[MultiplayerManager] Starting model load from:', path);
            
            // Check if path is accessible via HEAD request
            fetch(path, { method: 'HEAD' })
                .then(response => {
                    if (!response.ok) {
                        console.error(`[DIAGNOSTIC] Model path not accessible: ${path}, status: ${response.status}`);
                    } else {
                        console.log(`[DIAGNOSTIC] Model path is accessible: ${path}`);
                    }
                })
                .catch(error => {
                    console.error(`[DIAGNOSTIC] Error checking model path: ${path}`, error);
                });
            
            // Use a unique loader instance each time to avoid conflicts
            const loader = new GLTFLoader();
            
            loader.load(
                path,
                (gltf) => {
                    console.log('[MultiplayerManager] Model loaded successfully');
                    
                    // DIAGNOSTIC: Add detailed checks
                    if (!gltf.scene) {
                        console.error(`[DIAGNOSTIC] Loaded GLTF has no scene!`);
                    } else if (gltf.scene.children.length === 0) {
                        console.error(`[DIAGNOSTIC] Loaded GLTF scene has no children!`);
                    }
                    
                    // Apply some optimizations to the loaded model
                    const scene = gltf.scene;
                    
                    // DIAGNOSTIC: Check scene before processing
                    let meshesBeforeProcess = 0;
                    scene.traverse(child => {
                        if (child.isMesh) meshesBeforeProcess++;
                    });
                    console.log(`[DIAGNOSTIC] Model has ${meshesBeforeProcess} meshes before processing`);
                    
                    // Process the model to ensure it works properly
                    scene.traverse(child => {
                        if (child.isMesh) {
                            // Enable shadows
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Disable frustum culling (prevents disappearance)
                            child.frustumCulled = false;
                            
                            // Ensure material settings are correct
                            if (child.material) {
                                child.material.transparent = false;
                                child.material.opacity = 1;
                                child.material.needsUpdate = true;
                                child.material.depthWrite = true;
                                child.material.depthTest = true;
                                console.log(`[DIAGNOSTIC] Configured material for mesh: ${child.name}`);
                            } else {
                                console.error(`[DIAGNOSTIC] Mesh has no material: ${child.name}`);
                            }
                        }
                    });
                    
                    // Store animations with the scene for easier access
                    if (gltf.animations && gltf.animations.length > 0) {
                        scene.animations = gltf.animations;
                        console.log('[DIAGNOSTIC] Found animations:', 
                            gltf.animations.map(a => a.name).join(', '));
                    }
                    
                    // Debug: Log model details
                    console.log('[DIAGNOSTIC] Model details:', {
                        scene: gltf.scene ? 'has scene' : 'no scene',
                        animations: gltf.animations ? gltf.animations.length : 0,
                        animationNames: gltf.animations ? gltf.animations.map(a => a.name) : [],
                        cameras: gltf.cameras ? gltf.cameras.length : 0,
                        asset: gltf.asset,
                        fileUrl: path
                    });
                    
                    resolve(gltf);
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(2);
                    console.log(`[DIAGNOSTIC] Loading model: ${percent}%, loaded: ${progress.loaded}, total: ${progress.total}`);
                },
                (error) => {
                    console.error(`[DIAGNOSTIC] Error loading model from ${path}:`, error);
                    
                    // Additional error diagnosis
                    if (error.message && error.message.includes('Unexpected token')) {
                        console.error('[DIAGNOSTIC] Model file appears to be invalid or corrupted');
                    } else if (error.message && error.message.includes('NetworkError')) {
                        console.error('[DIAGNOSTIC] Network error loading model, check URL and CORS settings');
                    }
                    
                    reject(error);
                }
            );
        });
    }

    // Protect the scene from clearing by overriding methods
    protectSceneFromClearing() {
        // Store original methods
        if (!this.scene._mpm_original_clear) {
            this.scene._mpm_original_clear = this.scene.clear;
            this.scene._mpm_original_remove = this.scene.remove;
            
            // Replace with protected versions
            this.scene.clear = () => {
                console.error("[CRITICAL] Scene.clear() was called - this would remove player models! Operation prevented.");
                // Instead of clearing everything, we'll manually remove non-player objects
                const nonPlayerObjects = [];
                this.scene.children.forEach(child => {
                    let isPlayerObject = false;
                    this.players.forEach(player => {
                        if (player.mesh === child || player.nameLabel === child) {
                            isPlayerObject = true;
                        }
                    });
                    if (!isPlayerObject) {
                        nonPlayerObjects.push(child);
                    }
                });
                
                // Only remove non-player objects
                nonPlayerObjects.forEach(obj => {
                    this.scene._mpm_original_remove.call(this.scene, obj);
                });
                
                console.log(`[DIAGNOSTIC] Protected scene clear - kept ${this.players.size * 2} player objects`);
                return this.scene;
            };
            
            // Protect remove to prevent player objects from being removed
            this.scene.remove = function(...objects) {
                const playerManager = this._playerManager;
                if (!playerManager) {
                    // If no player manager registered, use original
                    return this._mpm_original_remove.apply(this, objects);
                }
                
                // Check each object
                objects.forEach(obj => {
                    let isPlayerObject = false;
                    playerManager.players.forEach(player => {
                        if (player.mesh === obj || player.nameLabel === obj) {
                            console.error(`[CRITICAL] Attempt to remove player object prevented: ${obj.type}`);
                            isPlayerObject = true;
                        }
                    });
                    
                    if (!isPlayerObject) {
                        // Only remove if not a player object
                        this._mpm_original_remove.call(this, obj);
                    }
                });
                
                return this;
            };
            
            // Register player manager with scene
            this.scene._playerManager = this;
            
            console.log("[DIAGNOSTIC] Scene protected from accidental clearing");
        }
    }
    
    // Restore original scene methods
    restoreSceneMethods() {
        if (this.scene._mpm_original_clear) {
            this.scene.clear = this.scene._mpm_original_clear;
            this.scene.remove = this.scene._mpm_original_remove;
            delete this.scene._mpm_original_clear;
            delete this.scene._mpm_original_remove;
            delete this.scene._playerManager;
            console.log("[DIAGNOSTIC] Scene protection removed");
        }
    }

    // Enhanced logging method with categorization
    log(category, message, level = 'log') {
        // Create timestamp relative to start
        const timeSinceStart = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const prefix = `[${timeSinceStart}s][${category}]`;
        
        // Store in log history with frame counter if available
        const frameInfo = this.renderFrameCount ? `F${this.renderFrameCount}` : '';
        const fullMessage = frameInfo ? `${prefix}${frameInfo} ${message}` : `${prefix} ${message}`;
        
        // Store log entry
        const logEntry = {
            time: Date.now(),
            frame: this.renderFrameCount || 0,
            timeSinceStart: parseFloat(timeSinceStart),
            category,
            level,
            message: fullMessage
        };
        
        // Add to history with size limit
        this.logHistory.push(logEntry);
        if (this.logHistory.length > this.logHistoryMaxSize) {
            this.logHistory.shift();
        }
        
        // Output to console
        if (level === 'error') {
            console.error(fullMessage);
        } else if (level === 'warn') {
            console.warn(fullMessage);
        } else {
            console.log(fullMessage);
        }
        
        return logEntry;
    }

    // Combined category method for visibility-related events
    logVisibility(playerId, message, level = 'log') {
        // Combine VISIBILITY with PLAYER ID for more specific filtering
        return this.log(`${this.logCategories.VISIBILITY}-${playerId}`, message, level);
    }

    // Method for scene-related events
    logScene(message, level = 'log') {
        return this.log(this.logCategories.SCENE, message, level);
    }

    // Method for animation-related events
    logAnimation(playerId, message, level = 'log') {
        return this.log(`${this.logCategories.ANIMATION}-${playerId}`, message, level);
    }

    // Method for model-related events
    logModel(playerId, message, level = 'log') {
        return this.log(`${this.logCategories.MODEL}-${playerId}`, message, level);
    }

    // Method for network-related events
    logNetwork(playerId, message, level = 'log') {
        return this.log(`${this.logCategories.NETWORK}-${playerId}`, message, level);
    }

    // Method for position-related events
    logPosition(playerId, message, level = 'log') {
        return this.log(`${this.logCategories.POSITION}-${playerId}`, message, level);
    }

    // Network monitoring to detect connection issues
    monitorNetworkActivity() {
        if (this.networkMonitorRunning) return;
        this.networkMonitorRunning = true;
        
        // Check all players for network inactivity
        setInterval(() => {
            // Skip if not connected to the server
            if (!this.isConnected) return;
            
            // Check each player for inactivity
            this.players.forEach((player, id) => {
                // Never mark local player as inactive
                if (player.isLocalPlayer) return;
                
                // Get time since last update
                const now = Date.now();
                const lastUpdate = player.lastUpdate || 0;
                const timeSinceLastUpdate = now - lastUpdate;
                
                // Force visibility for all players
                if (player.mesh) {
                    player.mesh.visible = true;
                }
                
                // Network timeout handling - proper disconnection
                if (timeSinceLastUpdate > this.networkTimeout && !player.isDisconnected) {
                    this.logNetwork(id, `Player ${id} network timeout, removing player after ${timeSinceLastUpdate}ms without updates`, 'warn');
                    
                    // Remove the player entirely after timeout
                    this.removePlayerAvatar(id);
                }
            });
        }, this.networkCheckFrequency);
    }

    // New helper method to transition to idle animation
    transitionToIdleAnimation(player) {
        if (!player || !player.mixer || !player.animations) return;
        
        // Find an idle animation
        let idleAction = null;
        for (const animName of this.idleAnimationNames) {
            if (player.animations[animName]) {
                idleAction = player.animations[animName];
                break;
            }
        }
        
        // If we found an idle animation and it's different from the current one
        if (idleAction && player.currentAnimation !== 'idle') {
            // Fade out current animation if any
            if (player.currentAnimationAction) {
                player.currentAnimationAction.fadeOut(this.animationTransitionTime);
            }
            
            // Play idle animation
            idleAction.reset().fadeIn(this.animationTransitionTime).play();
            player.currentAnimation = 'idle';
            player.currentAnimationAction = idleAction;
            
            this.logAnimation(player.id, `Transitioned to idle animation`, 'log');
        }
    }

    // Add more category-specific methods as needed

    // Add specialized transition method for metaverse-explorer model
    transitionMetaverseExplorerState(player, newState) {
        // Skip if we're already in this state
        if (newState === player.animationState) {
            return;
        }
        
        this.logAnimation(player.id, `Transitioning metaverse-explorer from ${player.animationState} to ${newState}`, 'log');
        
        // Store previous state for potential return
        player.previousAnimationState = player.animationState;
        player.animationState = newState;
        
        // Update state timing
        if (newState === AnimationState.IDLE) {
            player.lastIdleTime = Date.now();
        } else if (newState === AnimationState.RUNNING) {
            player.lastRunningTime = Date.now();
        }
        
        // Handle different state transitions
        switch (newState) {
            case AnimationState.RUNNING:
                this.handleExplorerRunningTransition(player);
                break;
                
            case AnimationState.IDLE:
                this.handleExplorerIdleTransition(player);
                break;
        }
    }
    
    // Special handling for metaverse-explorer idle transitions
    handleExplorerIdleTransition(player) {
        // Stop and cleanup all animations - mimics CharacterManager behavior
        if (player.mixer) {
            this.logAnimation(player.id, `Stopping all animations for explorer model idle transition`, 'log');
            player.mixer.stopAllAction();
            player.mixer.update(0);
            
            // Disable all animations but keep them stored
            Object.values(player.animations).forEach(action => {
                action.stop();
                action.setEffectiveWeight(0);
                action.enabled = false;
                action.reset();
            });
            
            // Clear current animation tracking
            player.currentAnimation = null;
            player.currentAnimationAction = null;
            
            this.logAnimation(player.id, `Metaverse explorer idle transition complete - all animations stopped`, 'log');
        }
    }
    
    // Special handling for metaverse-explorer running transitions
    handleExplorerRunningTransition(player) {
        if (!player.mixer) return;
        
        // Try to find the running animation (similar to CharacterManager)
        const runAnimName = Object.keys(player.animations).find(name => 
            name.toLowerCase().includes('run') || 
            name.toLowerCase().includes('running') ||
            name.toLowerCase().includes('mixamo.com')
        );
        
        // First, stop and reset all animations
        Object.values(player.animations).forEach(action => {
            action.stop();
            action.setEffectiveWeight(0);
            action.enabled = false;
            action.reset();
        });

        // Force update the mixer to ensure all animations are stopped
        player.mixer.stopAllAction();
        player.mixer.update(0);
        
        const runAction = player.animations[runAnimName];
        if (runAction) {
            // Setup running animation
            runAction.reset();
            runAction.time = 0;
            runAction.setEffectiveTimeScale(1.0);
            runAction.setEffectiveWeight(1);
            runAction.loop = THREE.LoopRepeat;
            runAction.enabled = true;
            runAction.play();
            
            // Update tracking
            player.currentAnimation = 'running';
            player.currentAnimationAction = runAction;
            
            // Force update the mixer again after starting the running animation
            player.mixer.update(0);
            
            this.logAnimation(player.id, `Metaverse explorer running animation started: ${runAnimName}`, 'log');
        }
    }

    removePlayer(playerId) {
        // ... existing code ...
        // Remove from explorer model tracking if present
        if (this.explorerModelPlayers.has(playerId)) {
            this.explorerModelPlayers.delete(playerId);
        }
        // ... existing code ...
    }
} 
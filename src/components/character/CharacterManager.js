import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import CharacterControls from './CharacterControls';

// Animation states enum for better code readability
const AnimationState = {
    IDLE: 'idle',
    RUNNING: 'running',
    JUMPING: 'jumping'
};

export default class CharacterManager {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
        this.loader = new GLTFLoader();
        
        // Model paths
        this.modelPaths = {
            default: './assets/models/metaverse-explorer.glb',
            jump: './assets/models/metaverse-jump.glb'
        };
        
        // Character properties
        this.character = null;
        this.characterMixer = null;
        this.username = 'Guest';
        this.characterControls = null;
        this.camera = null;
        this.portalManager = null;
        this.playerState = {};
        
        // Portal collision properties
        this.lastPortalCheck = 0;
        this.portalCheckInterval = 100;
        this.lastPortalCollision = null;
        this.portalCheckEnabled = false; // Add flag to track if checks are enabled
        
        console.log('[CharacterManager] Initialized with scene and domElement');
        
        // Animation properties
        this.animations = {};
        this.currentState = AnimationState.IDLE;
        this.previousState = AnimationState.IDLE;
        this.transitionInProgress = false;
        this.transitionTimeout = null;
        this.jumpAnimationStarted = false;
        
        // Jump properties
        this.jumpHeight = 2.0; // Maximum jump height in units
        this.jumpDuration = 0.6; // Duration of jump in seconds
        this.jumpProgress = 0; // Current progress of jump (0 to 1)
        this.initialJumpY = 0; // Initial Y position when jump starts
        
        // Bind methods
        this.transitionToState = this.transitionToState.bind(this);

        // State variable to track the last logged update state
        this._lastLoggedUpdateState = null;
    }

    async initialize() {
        // Parse URL parameters to get username and avatar URL
        this.parseUrlParameters();
        
        // Load character model
        await this.loadCharacterModel();
        
        // Setup initial character controls AFTER model is loaded
        if (this.character && this.camera) {
            this.updateCharacterControls(); // This will create and set up listeners
        } else {
            console.warn('[Manager] Character or Camera not ready for initial controls setup.');
        }
        
        // We no longer create username label for local player
        // It will be handled by MultiplayerManager only
        
        // Add separate listener for non-movement keys like Jump
        window.addEventListener('keydown', this.handleManagerKeyDown.bind(this));
        
        // Return the character for further use
        return this.character;
    }

    // Separate key handler for manager-level actions (e.g., Jump)
    handleManagerKeyDown(event) {
        // Jump on space bar press if not already jumping
        if (event.code === 'Space' && this.currentState !== AnimationState.JUMPING) {
            console.log('[Manager] Space pressed - attempting to jump');
            this.transitionToState(AnimationState.JUMPING);
        }
        // Add other manager-level keybindings here if needed
    }

    async transitionToState(newState) {
        // Skip if we're already in this state or transitioning
        if (newState === this.currentState || this.transitionInProgress) {
            // Allow transition from RUNNING to IDLE even if in progress (quick stop)
            if (!(this.currentState === AnimationState.RUNNING && newState === AnimationState.IDLE && this.transitionInProgress)) {
                 console.log(`[Manager] Skipping transition - already in ${newState} or transition in progress`);
                 return;
            }
        }
        
        console.log(`[Manager] Transitioning from ${this.previousState} to ${newState}`);
        
        // Store previous state for potential return
        this.previousState = this.currentState;
        this.currentState = newState;
        this.transitionInProgress = true; // Mark transition as started
        
        // Clear any existing transition timeout (if used)
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        
        // Handle different state transitions
        switch (newState) {
            case AnimationState.JUMPING:
                await this.handleJumpTransition();
                break;
                
            case AnimationState.RUNNING:
                this.handleRunningTransition();
                // Running transition is fast, mark as finished
                this.transitionInProgress = false; 
                break;
                
            case AnimationState.IDLE:
                this.handleIdleTransition();
                // Idle transition is fast, mark as finished
                this.transitionInProgress = false; 
                break;
        }
    }
    
    async handleJumpTransition() {
        console.log('[Manager] Starting jump transition');
        
        // Store camera state before model swap
        const cameraState = this.preserveCameraState();
        
        // Log the state right before capture
        console.log('[Manager] Jump - State right before capture:', 
            this.characterControls ? { 
                moveForward: this.characterControls.moveForward, 
                isMoving: this.characterControls.isMoving()
            } : 'no controls'
        );

        // Capture current movement state BEFORE swapping controls
        const currentMovementState = this.characterControls ? {
            moveForward: this.characterControls.moveForward,
            moveBackward: this.characterControls.moveBackward,
            moveLeft: this.characterControls.moveLeft,
            moveRight: this.characterControls.moveRight,
            rotateLeft: this.characterControls.rotateLeft,
            rotateRight: this.characterControls.rotateRight
        } : null;
        console.log('[Manager] Jump - Captured movement state:', currentMovementState);

        // Store current position and rotation before model swap
        const currentPosition = this.character.position.clone();
        const currentRotation = this.character.rotation.clone();
        
        // Store initial Y position for jump
        this.initialJumpY = currentPosition.y;
        this.jumpProgress = 0;
        
        // Clean up old character (listeners are removed in updateCharacterControls)
        this.scene.remove(this.character);
        
        // Use preloaded jump model if available, otherwise load it
        let gltf;
        if (this.preloadedJumpModel) {
            console.log('[Manager] Using preloaded jump model');
            gltf = this.preloadedJumpModel;
        } else {
            console.log('[Manager] Loading jump model:', this.modelPaths.jump);
            gltf = await this.loadModel(this.modelPaths.jump);
        }
        
        // Setup new character, which includes updating controls and listeners
        // Pass true to indicate this is NOT the initial load
        this.setupNewCharacter(gltf, currentPosition, currentRotation, currentMovementState, false);
        
        // Restore camera state after model swap
        this.restoreCameraState(cameraState);
        
        // Setup jump animation
        const jumpAnimName = Object.keys(this.animations)[0]; // Assume first animation is jump
        if (jumpAnimName && this.animations[jumpAnimName]) {
            console.log(`[Manager] Setting up jump animation: ${jumpAnimName}`);
            const jumpAction = this.animations[jumpAnimName];
            jumpAction.reset();
            jumpAction.setEffectiveTimeScale(1.2); // Slightly faster jump
            jumpAction.setEffectiveWeight(1);
            jumpAction.loop = THREE.LoopOnce;
            jumpAction.clampWhenFinished = true; // Stop at the end
            
            this.jumpAnimationStarted = true;
            jumpAction.play();
        } else {
            console.warn('[Manager] No jump animation found in model');
            // Reset state if no animation found
            this.transitionInProgress = false;
            this.currentState = this.previousState; // Revert to previous state
        }
    }
    
    handleRunningTransition() {
        // Try to find the running animation
        const runAnimName = Object.keys(this.animations).find(name => 
            name.toLowerCase().includes('run') || 
            name.toLowerCase().includes('running') ||
            name.toLowerCase().includes('mixamo.com')
        );
        
        // First, stop and reset all animations
        Object.values(this.animations).forEach(action => {
            action.stop();
            action.setEffectiveWeight(0);
            action.enabled = false;
            action.reset();
        });

        // Force update the mixer to ensure all animations are stopped
        if (this.characterMixer) {
            this.characterMixer.stopAllAction();
            this.characterMixer.update(0);
        }
        
        const runAction = this.animations[runAnimName];
        if (runAction) {
            // Setup running animation
            runAction.reset();
            runAction.time = 0;
            runAction.setEffectiveTimeScale(1.0);
            runAction.setEffectiveWeight(1);
            runAction.loop = THREE.LoopRepeat;
            runAction.enabled = true;
            runAction.play();
            
            // Force update the mixer again after starting the running animation
            if (this.characterMixer) {
                this.characterMixer.update(0);
            }
        }
    }
    
    handleIdleTransition() {
        // Stop and cleanup all animations
        if (this.characterMixer) {
            this.characterMixer.stopAllAction();
            this.characterMixer.update(0);
            
            // Disable all animations but keep them stored
            Object.values(this.animations).forEach(action => {
                action.stop();
                action.setEffectiveWeight(0);
                action.enabled = false;
                action.reset();
            });
        }
    }
    
    async returnToDefaultModel(nextState) {
        console.log(`[Manager] Returning to default model, next state: ${nextState}`);
        // Store camera state before model swap
        const cameraState = this.preserveCameraState();
        
        // Capture current movement state BEFORE swapping controls
        const currentMovementState = this.characterControls ? {
            moveForward: this.characterControls.moveForward,
            moveBackward: this.characterControls.moveBackward,
            moveLeft: this.characterControls.moveLeft,
            moveRight: this.characterControls.moveRight,
            rotateLeft: this.characterControls.rotateLeft,
            rotateRight: this.characterControls.rotateRight
        } : null;
        console.log('[Manager] ReturnToDefault - Captured movement state:', currentMovementState);

        // Store current position and rotation
        const currentPosition = this.character.position.clone();
        const currentRotation = this.character.rotation.clone();
        
        // Load default model first, before removing the current one
        let gltf;
        if (this.preloadedDefaultModel) {
            console.log('[Manager] Using preloaded default model');
            gltf = this.preloadedDefaultModel;
        } else {
            console.log('[Manager] Loading default model');
            gltf = await this.loadModel(this.modelPaths.default);
        }
        
        // Only remove the current character after the new one is loaded
        // Listeners are removed when controls are updated in setupNewCharacter
        this.scene.remove(this.character);
        
        // Setup the new character, passing the captured movement state
        this.setupNewCharacter(gltf, currentPosition, currentRotation, currentMovementState);
        
        // Restore camera state after model swap
        this.restoreCameraState(cameraState);
        
        // Set next animation state (currentState will be updated by transitionToState)
        console.log(`[Manager] Default model loaded, transitioning to: ${nextState}`);
        
        // Stop all animations first
        Object.values(this.animations).forEach(action => {
            action.stop();
            action.setEffectiveWeight(0);
            action.enabled = false;
        });
        
        // Force update the mixer to ensure the transition takes effect
        if (this.characterMixer) {
            this.characterMixer.update(0);
        }
        
        // Reset transition state to allow immediate transition
        this.transitionInProgress = false;
        
        // Use transitionToState to handle the animation correctly
        this.transitionToState(nextState);
    }
    
    // Modified to accept optional movement state to restore
    setupNewCharacter(gltf, position, rotation, movementStateToRestore = null) {
        console.log('[Manager] Setting up new character. Movement state to restore:', movementStateToRestore);
            
        // Set up the character
        this.character = gltf.scene;
        this.character.name = 'playerCharacter';
        
        // Set initial position and rotation
        this.character.position.set(0, 0, 0); // Spawn at origin
        this.character.rotation.y = Math.PI - (15 * Math.PI / 180); // 180 degrees minus 15 degrees clockwise
        
        // Center the model and set scale
        this.character.scale.set(1, 1, 1);
        
        // Store the model path for later reference
        this.character.userData.modelPath = gltf.userData?.modelPath || this.modelPaths.default;
        
        // Apply position and rotation
        this.character.position.copy(position);
        this.character.rotation.copy(rotation);
        
        // Setup animations
        this.setupAnimations(gltf);
        
        // Add character to scene
        this.scene.add(this.character);
        
        // Update character controls, passing the movement state
        this.updateCharacterControls(movementStateToRestore);
        
        // Update camera's reference to the character if it exists
        this.updateCameraReference();
        
        // Recreate username label
        this.createUsernameLabel();
        
        console.log('[Manager] Finished setting up new character, final controls state:', 
            this.characterControls ? {
                moveForward: this.characterControls.moveForward,
                moveBackward: this.characterControls.moveBackward,
                moveLeft: this.characterControls.moveLeft,
                moveRight: this.characterControls.moveRight
            } : 'no controls');
    }
    
    setupAnimations(gltf) {
        // Clear existing animations and mixer
        if (this.characterMixer) {
            this.characterMixer.stopAllAction();
            this.characterMixer.uncacheRoot(this.character);
        }
        this.animations = {};
        
        // Setup new animations if available
        if (gltf.animations && gltf.animations.length) {
            // Create new mixer
            this.characterMixer = new THREE.AnimationMixer(this.character);
            
            // Always store animations but keep them disabled by default
            gltf.animations.forEach(animation => {
                const action = this.characterMixer.clipAction(animation);
                this.animations[animation.name] = action;
                
                // Stop and reset the animation immediately
                action.stop();
                action.setEffectiveWeight(0);
                action.enabled = false;
                action.reset();
            });

            // Start with idle animation
            const idleAnimName = Object.keys(this.animations).find(name => 
                name.toLowerCase().includes('idle')
            );
            if (idleAnimName && this.animations[idleAnimName]) {
                const idleAction = this.animations[idleAnimName];
                idleAction.reset();
                idleAction.setEffectiveTimeScale(1.0);
                idleAction.setEffectiveWeight(1);
                idleAction.loop = THREE.LoopRepeat;
                idleAction.enabled = true;
                idleAction.play();
            }
        } else {
            this.characterMixer = null;
        }
    }
    
    // Modified to accept optional movement state to restore
    updateCharacterControls(movementStateToRestore = null) {
        if (this.camera && this.character) {
            console.log('[Manager] Updating character controls. Restoring state:', movementStateToRestore);
            // Store camera state BEFORE potentially changing controls/character
            const cameraOffset = new THREE.Vector3().subVectors(
                this.camera.position,
                this.character.position
            );
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // --- Listener Management --- 
            // Remove listeners from the OLD controls instance, if it exists
            if (this.characterControls) {
                console.log('[Manager] Removing listeners from old controls');
                window.removeEventListener('keydown', this.characterControls.handleKeyDown);
                window.removeEventListener('keyup', this.characterControls.handleKeyUp);
                // Add mobile listener removal if applicable
            }
            
            // Create NEW controls instance
            this.characterControls = new CharacterControls(this.character, this.camera, this.domElement);
            console.log('[Manager] New controls instance created.');
            
            // Restore previous movement state if provided
            if (movementStateToRestore) {
                Object.assign(this.characterControls, movementStateToRestore);
                console.log('[Manager] Restored provided movement state:', movementStateToRestore);
            } else {
                 console.log('[Manager] No movement state provided to restore, using defaults.');
            }
            
             // --- Listener Management --- 
            // Add listeners for the NEW controls instance
            console.log('[Manager] Adding listeners for new controls');
            window.addEventListener('keydown', this.characterControls.handleKeyDown, false);
            window.addEventListener('keyup', this.characterControls.handleKeyUp, false);
            // Add mobile listener addition if applicable

            // Restore camera relative position and orientation AFTER controls are set
            this.camera.position.copy(this.character.position).add(cameraOffset);
            const lookAtPoint = new THREE.Vector3()
                .copy(this.character.position)
                .add(cameraDirection.multiplyScalar(10)); 
            this.camera.lookAt(lookAtPoint);
            
            // Initialization call if needed by controls (though listener setup is main part now)
            if (this.characterControls.initialize) {
                this.characterControls.initialize();
            }
        } else {
            console.warn('[Manager] Cannot update controls: Camera or Character missing.');
        }
    }

    setCamera(camera) {
        console.log('[Manager] Setting camera');
        this.camera = camera;
        // Update controls now that the camera is set (if character exists)
        if (this.character) {
            this.updateCharacterControls(); 
        } else {
            console.warn('[Manager] Camera set, but character not yet loaded. Controls will be updated later.')
        }
    }

    parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Get username from URL or use default
        this.username = urlParams.get('username') || 'metaverse-explorer';
        
        // Update playerState
        this.playerState = {
            username: this.username,
            color: urlParams.get('color') || 'blue',
            speed: parseFloat(urlParams.get('speed')) || 5,
            avatarUrl: urlParams.get('avatar_url') || 'https://metaverse-delta.vercel.app/assets/models/metaverse-explorer.glb',
            team: urlParams.get('team') || null
        };
        
        // Set avatarUrl for model loading
        this.avatarUrl = this.playerState.avatarUrl;
        
        // Update portal manager's playerState if it exists
        if (this.portalManager) {
            this.portalManager.playerState = this.playerState;
        }
    }

    async loadCharacterModel() {
        try {
            // Determine which model to load
            const modelUrl = this.avatarUrl || this.modelPaths.default;
            console.log('Loading model from:', modelUrl);
            
            // Load the model
            const gltf = await this.loadModel(modelUrl);
            
            // Store the full GLTF object for multiplayer use
            this.gltfData = gltf;
            
            // Set up the character
            this.character = gltf.scene;
            this.character.name = 'playerCharacter';
          
            // Store the model URL with the character for multiplayer use
            this.character.userData.modelPath = modelUrl;
            this.character.userData.avatarUrl = this.avatarUrl;
          
            // Set initial position and rotation
            this.character.position.set(0, 0, 60); // Spawn at origin
            this.character.rotation.y = Math.PI - (15 * Math.PI / 180); // 180 degrees minus 15 degrees clockwise
            
            // Center the model and set scale
            this.character.scale.set(1, 1, 1);
            
            // Make sure the mesh is visible and properly configured
            this.character.visible = true;
            this.character.traverse((child) => {
                if (child.isMesh) {
                    child.visible = true;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Ensure materials are properly configured
                    if (child.material) {
                        child.material.transparent = false;
                        child.material.opacity = 1;
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Setup animations if available
            this.setupAnimations(gltf);
            
            // Add character to scene
            this.scene.add(this.character);
            
            console.log('Character model loaded successfully');

            // Preload jump model in the background
            this.preloadJumpModel();
        } catch (error) {
            console.error('Error loading character model:', error);
            
            // Create a fallback cube character
            this.createFallbackCharacter();
        }
    }

    createFallbackCharacter() {
        // Create a simple cube character
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.character = new THREE.Mesh(geometry, material);
        this.character.name = 'playerCharacter';
        this.character.position.set(0, 1, -50); // Place on ground with y=1 for height
        this.character.rotation.y = Math.PI - (15 * Math.PI / 180); // 180 degrees minus 15 degrees clockwise
        this.character.castShadow = true;
        
        // Add to scene
        this.scene.add(this.character);
        
        console.log('Created fallback cube character');
    }

    async loadModel(url) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    // Store the model path in the gltf userData
                    gltf.userData = { modelPath: url };
                    resolve(gltf);
                },
                (xhr) => console.log(`Loading model: ${(xhr.loaded / xhr.total) * 100}% loaded`),
                (error) => {
                    console.error('Error loading model:', error);
                    reject(error);
                }
            );
        });
    }

    preloadJumpModel() {
        // Load both models in the background
        this.loader.load(
            this.modelPaths.jump,
            (gltf) => {
                console.log('Jump model preloaded successfully');
                this.preloadedJumpModel = gltf;
            },
            (xhr) => console.log(`Preloading jump model: ${(xhr.loaded / xhr.total) * 100}% loaded`),
            (error) => console.error('Error preloading jump model:', error)
        );
        
        // Also preload the default model for smoother transitions back
        this.loader.load(
            this.modelPaths.default,
            (gltf) => {
                console.log('Default model preloaded successfully');
                this.preloadedDefaultModel = gltf;
            },
            (xhr) => console.log(`Preloading default model: ${(xhr.loaded / xhr.total) * 100}% loaded`),
            (error) => console.error('Error preloading default model:', error)
        );
    }

    createUsernameLabel() {
        // This method is now a no-op to prevent local username label creation
        // Username labels for all players (including local) are handled by MultiplayerManager
        console.log('[CharacterManager] Skipping username label creation for local player');
        return;
    }

    update(deltaTime) {
        // Update character animations
        if (this.characterMixer) {
            this.characterMixer.update(deltaTime);
            
            // Check for jump animation completion
            if (this.currentState === AnimationState.JUMPING && this.jumpAnimationStarted) {
                const jumpAnimName = Object.keys(this.animations)[0]; // Assume first is jump
                const jumpAction = this.animations[jumpAnimName];
                
                // Update jump progress and position
                if (jumpAction) {
                    // Calculate jump progress based on animation time
                    const progress = jumpAction.time / jumpAction.getClip().duration;
                    this.jumpProgress = Math.min(progress, 1.0);
                    
                    // Calculate vertical position using a parabolic curve
                    const jumpCurve = 4 * this.jumpProgress * (1 - this.jumpProgress); 
                    const newY = this.initialJumpY + (this.jumpHeight * jumpCurve);
                    
                    // Update character's vertical position
                    this.character.position.y = newY;
                    
                    // Check for jump completion (slightly before the end)
                    if (!jumpAction.isRunning() || jumpAction.time >= jumpAction.getClip().duration * 0.98) { 
                        this.jumpAnimationStarted = false; // Reset flag
                        this.jumpProgress = 0;
                        this.character.position.y = this.initialJumpY; // Ensure landed correctly
                        
                        // Check current movement input state to determine return state
                        const isStillMoving = this.characterControls && this.characterControls.isMoving();
                        const returnState = isStillMoving ? AnimationState.RUNNING : AnimationState.IDLE;
                        
                        // Reset transition state to allow immediate transition
                        this.transitionInProgress = false;
                        
                        // Return to appropriate state using the specific method
                        this.returnToDefaultModel(returnState); // Will handle transition
                    }
                }
            }
        }
        
        // Update character controls (applies movement/rotation)
        if (this.characterControls) {
            this.characterControls.update(deltaTime);
            
            // Check portal collision if portal manager exists and checks are enabled
            if (this.portalCheckEnabled && this.portalManager && this.character) {
                const currentTime = Date.now();
                if (currentTime - this.lastPortalCheck >= this.portalCheckInterval) {
                    this.lastPortalCheck = currentTime;
                    
                    const playerPosition = this.character.position;
                    console.log('[CharacterManager] Portal check cycle:', {
                        time: currentTime,
                        playerPosition: playerPosition.toArray(),
                        hasPortalManager: !!this.portalManager,
                        portalCount: this.portalManager.portals.length
                    });
                    
                    const portal = this.portalManager.checkCollision(playerPosition);
                    
                    if (portal) {
                        // Only trigger if it's a new portal collision
                        if (this.lastPortalCollision !== portal.portalId) {
                            console.log('[CharacterManager] New portal collision detected:', portal.portalId);
                            this.lastPortalCollision = portal.portalId;
                            
                            // Get the destination URL from the portal
                            const destinationURL = portal.prepareDestinationURL(this.playerState);
                            console.log('[CharacterManager] Redirecting to:', destinationURL);
                            
                            // Add a small delay before redirecting to ensure smooth transition
                            setTimeout(() => {
                                window.location.href = destinationURL;
                            }, 500);
                        }
                    } else {
                        // Reset last portal collision if no collision detected
                        this.lastPortalCollision = null;
                    }
                }
            } else if (!this.portalCheckEnabled) {
                console.log('[CharacterManager] Portal checks disabled. State:', {
                    hasPortalManager: !!this.portalManager,
                    hasCharacter: !!this.character,
                    portalCheckEnabled: this.portalCheckEnabled
                });
            }
            
            // Check if currently moving based on controls state
            const isMoving = this.characterControls.isMoving();
            
            // Prepare current state object for comparison
            const currentUpdateState = {
                isMoving,
                currentState: this.currentState,
                modelPath: this.character.userData?.modelPath || 'Unknown',
                canTransition: this.currentState !== AnimationState.JUMPING
            };

            // Compare current state to last logged state
            const stateChanged = JSON.stringify(currentUpdateState) !== JSON.stringify(this._lastLoggedUpdateState);

            // Update state if changed
            if (stateChanged) {
                this._lastLoggedUpdateState = { ...currentUpdateState }; // Store a copy
            }

            // Update animation state based on movement (only if not jumping)
            if (currentUpdateState.canTransition) {
                if (currentUpdateState.isMoving && currentUpdateState.currentState !== AnimationState.RUNNING) {
                    // Reset transition state to allow immediate transition
                    this.transitionInProgress = false;
                    this.transitionToState(AnimationState.RUNNING);
                } else if (!currentUpdateState.isMoving && currentUpdateState.currentState === AnimationState.RUNNING) {
                    // Reset transition state to allow immediate transition
                    this.transitionInProgress = false;
                    this.transitionToState(AnimationState.IDLE);
                }
            }
        }
    }

    // Method to manually play a specific animation
    playAnimation(name) {
        if (!this.animations[name]) {
            console.log(`Animation not found: ${name}`);
            return false;
        }
        
        // Stop all current animations
        for (const anim in this.animations) {
            this.animations[anim].stop();
        }
        
        // Play requested animation
        console.log(`Playing animation: ${name}`);
        const action = this.animations[name];
        action.reset();
        action.setEffectiveTimeScale(1.0);
        action.setEffectiveWeight(1);
        action.loop = THREE.LoopRepeat;
        action.play();
        
        return true;
    }
    
    // Clean up method to remove event listeners
    dispose() {
        console.log('[Manager] Disposing CharacterManager');
        window.removeEventListener('keydown', this.handleManagerKeyDown);
        
        // Also remove listeners from the current controls instance
        if (this.characterControls) {
             console.log('[Manager] Removing listeners from final controls instance during dispose');
             window.removeEventListener('keydown', this.characterControls.handleKeyDown);
             window.removeEventListener('keyup', this.characterControls.handleKeyUp);
             // Add mobile listener removal if applicable
        }
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
    }

    // Add a method to handle camera state preservation during model swaps
    preserveCameraState() {
        if (this.camera && this.character) {
            const state = {
                offset: new THREE.Vector3().subVectors(
                    this.camera.position,
                    this.character.position
                ),
                direction: new THREE.Vector3().copy(
                    this.camera.getWorldDirection(new THREE.Vector3())
                )
                // controls state is handled explicitly now
            };
            return state;
        }
        return null;
    }
    
    // Add a method to restore camera state after model swaps
    restoreCameraState(state) {
        if (this.camera && this.character && state) {
            // Restore camera position relative to character
            this.camera.position.copy(this.character.position).add(state.offset);
            
            // Restore camera orientation
            const lookAtPoint = new THREE.Vector3()
                .copy(this.character.position)
                .add(state.direction.multiplyScalar(10));
            this.camera.lookAt(lookAtPoint);
            // controls state is handled explicitly now
        }
    }

    updateCameraReference() {
        if (this.camera && this.camera.userData && this.camera.userData.followCamera) {
            this.camera.userData.followCamera.player = this.character;
        }
    }

    // Update the setPortalManager method
    setPortalManager(portalManager) {
        console.log('[CharacterManager] Setting portal manager:', portalManager);
        this.portalManager = portalManager;
        this.portalCheckEnabled = true;
        
        // Share playerState with portal manager
        if (portalManager) {
            portalManager.playerState = this.playerState;
            
            // Log initial portal state
            console.log('[CharacterManager] Portal manager state:', {
                hasPortals: portalManager.portals.length > 0,
                portalCount: portalManager.portals.length,
                playerState: this.playerState,
                portals: portalManager.portals.map(p => ({
                    id: p.portalId,
                    position: p.mesh?.position,
                    isActive: p.isActive
                }))
            });
        }
    }
} 
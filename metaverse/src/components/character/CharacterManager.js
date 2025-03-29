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
        
        // Animation properties
        this.animations = {};
        this.currentState = AnimationState.IDLE;
        this.previousState = AnimationState.IDLE;
        this.transitionInProgress = false;
        this.transitionTimeout = null;
        this.jumpAnimationStarted = false;
        
        // Bind methods
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.transitionToState = this.transitionToState.bind(this);
    }

    async initialize() {
        // Parse URL parameters to get username and avatar URL
        this.parseUrlParameters();
        
        // Load character model
        await this.loadCharacterModel();
        
        // Create username label
        this.createUsernameLabel();
        
        // Add keyboard event listeners
        window.addEventListener('keydown', this.handleKeyPress);
        window.addEventListener('keyup', this.handleKeyUp);
        
        // Return the character for further use
        return this.character;
    }

    handleKeyPress(event) {
        // Jump on space bar press if not already jumping
        if (event.code === 'Space' && this.currentState !== AnimationState.JUMPING) {
            console.log('Space pressed - attempting to jump');
            this.transitionToState(AnimationState.JUMPING);
        }
    }
    
    handleKeyUp(event) {
        // We could handle additional key up events here if needed
    }

    async transitionToState(newState) {
        // Skip if we're already in this state or transitioning
        if (newState === this.currentState || this.transitionInProgress) {
            console.log(`Skipping transition - already in ${newState} or transition in progress`);
            return;
        }
        
        // Store previous state for potential return
        this.previousState = this.currentState;
        this.currentState = newState;
        this.transitionInProgress = true;
        
        // Clear any existing transition timeout
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        
        console.log(`Transitioning from ${this.previousState} to ${newState}`);
        
        // Handle different state transitions
        switch (newState) {
            case AnimationState.JUMPING:
                await this.handleJumpTransition();
                break;
                
            case AnimationState.RUNNING:
                this.handleRunningTransition();
                break;
                
            case AnimationState.IDLE:
                this.handleIdleTransition();
                break;
        }
    }
    
    async handleJumpTransition() {
        console.log('Starting jump transition');
        
        // Store camera state before model swap
        const cameraState = this.preserveCameraState();
        
        // Store current position and rotation before model swap
        const currentPosition = this.character.position.clone();
        const currentRotation = this.character.rotation.clone();
        
        // Clean up old character
        this.scene.remove(this.character);
        
        // Use preloaded jump model if available, otherwise load it
        let gltf;
        if (this.preloadedJumpModel) {
            console.log('Using preloaded jump model');
            gltf = this.preloadedJumpModel;
        } else {
            console.log('Loading jump model:', this.modelPaths.jump);
            gltf = await this.loadModel(this.modelPaths.jump);
        }
        
        this.setupNewCharacter(gltf, currentPosition, currentRotation);
        
        // Restore camera state after model swap
        this.restoreCameraState(cameraState);
        
        // Setup jump animation
        if (this.animations['mixamo.com']) {
            console.log('Setting up jump animation');
            const jumpAction = this.animations['mixamo.com'];
            jumpAction.reset();
            jumpAction.setEffectiveTimeScale(1.2); // Slightly faster jump
            jumpAction.setEffectiveWeight(1);
            jumpAction.loop = THREE.LoopOnce;
            jumpAction.clampWhenFinished = true;
            
            // Set up a finished callback
            jumpAction.reset();
            this.jumpAnimationStarted = true;
            jumpAction.play();
        } else {
            console.warn('No jump animation found in model');
            // Reset state if no animation found
            this.transitionInProgress = false;
            this.currentState = this.previousState;
        }
    }
    
    handleRunningTransition() {
        if (this.animations['mixamo.com']) {
            const runAction = this.animations['mixamo.com'];
            
            // Smoothly transition to running
            runAction.reset();
            runAction.setEffectiveTimeScale(1.0);
            runAction.setEffectiveWeight(1);
            runAction.loop = THREE.LoopRepeat;
            runAction.play();
        }
        
        this.transitionInProgress = false;
    }
    
    handleIdleTransition() {
        if (this.animations['mixamo.com']) {
            // For idle, we stop the animation and reset to initial pose
            const idleAction = this.animations['mixamo.com'];
            idleAction.setEffectiveWeight(0);
            idleAction.stop();
            
            // Reset to first frame
            this.characterMixer.setTime(0);
        }
        
        this.transitionInProgress = false;
    }
    
    async returnToDefaultModel(nextState) {
        // Store camera state before model swap
        const cameraState = this.preserveCameraState();
        
        // Store current position and rotation
        const currentPosition = this.character.position.clone();
        const currentRotation = this.character.rotation.clone();
        
        // Load default model first, before removing the current one
        let gltf;
        if (this.preloadedDefaultModel) {
            console.log('Using preloaded default model');
            gltf = this.preloadedDefaultModel;
        } else {
            console.log('Loading default model');
            gltf = await this.loadModel(this.modelPaths.default);
        }
        
        // Only remove the current character after the new one is loaded
        this.scene.remove(this.character);
        
        // Setup the new character
        this.setupNewCharacter(gltf, currentPosition, currentRotation);
        
        // Restore camera state after model swap
        this.restoreCameraState(cameraState);
        
        // Set next animation state
        this.currentState = nextState;
        
        // Apply the appropriate animation
        if (nextState === AnimationState.RUNNING) {
            this.handleRunningTransition();
        } else {
            this.handleIdleTransition();
        }
    }
    
    setupNewCharacter(gltf, position, rotation) {
        // Set up the character
        this.character = gltf.scene;
        this.character.name = 'playerCharacter';
        
        // Apply position and rotation
        this.character.position.copy(position);
        this.character.rotation.copy(rotation);
        
        // Setup animations
        this.setupAnimations(gltf);
        
        // Add character to scene
        this.scene.add(this.character);
        
        // Update character controls
        this.updateCharacterControls();
        
        // Update camera's reference to the character if it exists
        this.updateCameraReference();
        
        // Recreate username label
        this.createUsernameLabel();
    }
    
    setupAnimations(gltf) {
        // Clear existing animations
        this.animations = {};
        
        // Setup new animations if available
        if (gltf.animations && gltf.animations.length) {
            console.log('Found animations:', gltf.animations.map(anim => anim.name));
            this.characterMixer = new THREE.AnimationMixer(this.character);
            
            // Store animations by name
            gltf.animations.forEach(animation => {
                const action = this.characterMixer.clipAction(animation);
                action.setEffectiveTimeScale(1.0);
                action.setEffectiveWeight(0);
                this.animations[animation.name] = action;
            });
        } else {
            console.warn('No animations found in model');
            this.characterMixer = null;
        }
    }
    
    updateCharacterControls() {
        if (this.camera) {
            // Store the relative offset between camera and character
            const cameraOffset = new THREE.Vector3().subVectors(
                this.camera.position,
                this.character.position
            );
            
            // Store camera orientation
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // Create new controls
            this.characterControls = new CharacterControls(this.character, this.camera, this.domElement);
            
            // Restore camera relative position and orientation
            this.camera.position.copy(this.character.position).add(cameraOffset);
            
            // Calculate a look-at point that maintains the same viewing angle
            const lookAtPoint = new THREE.Vector3()
                .copy(this.character.position)
                .add(cameraDirection.multiplyScalar(10)); // Look 10 units ahead in the same direction
            
            this.camera.lookAt(lookAtPoint);
            
            // Ensure the controls are properly initialized with the restored camera state
            if (this.characterControls.initialize) {
                this.characterControls.initialize();
            }
        }
    }

    setCamera(camera) {
        this.camera = camera;
        // Initialize character controls with the camera
        this.characterControls = new CharacterControls(this.character, this.camera, this.domElement);
    }

    parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Get username from URL or use default
        this.username = urlParams.get('username') || 'Guest';
        
        // Get custom avatar URL if provided
        this.avatarUrl = urlParams.get('avatar_url') || null;
    }

    async loadCharacterModel() {
        try {
            // Determine which model to load
            const modelUrl = this.avatarUrl || this.modelPaths.default;
            console.log('Loading model from:', modelUrl);
            
            // Load the model
            const gltf = await this.loadModel(modelUrl);
            
            // Set up the character
            this.character = gltf.scene;
            this.character.name = 'playerCharacter';
            
            // Center the model and set scale
            this.character.scale.set(1, 1, 1);
            
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
        this.character.position.y = 1; // Place on ground
        this.character.castShadow = true;
        
        // Add to scene
        this.scene.add(this.character);
        
        console.log('Created fallback cube character');
    }

    loadModel(url) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => resolve(gltf),
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
        if (!this.character) {
            console.warn('Cannot create username label: character is null');
            return;
        }

        // Create canvas for username
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Style the canvas
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'bold 28px Arial';
        context.textAlign = 'center';
        context.fillStyle = 'white';
        context.fillText(this.username, canvas.width / 2, canvas.height / 2 + 8);
        
        // Create sprite with canvas texture
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        
        // Position the sprite above the character
        sprite.position.y = 3.5;
        sprite.scale.set(2, 0.5, 1);
        
        // Make the sprite always face the camera
        sprite.material.depthWrite = false;
        sprite.renderOrder = 999;
        
        this.character.add(sprite);
    }

    update(deltaTime) {
        // Update character animations
        if (this.characterMixer) {
            this.characterMixer.update(deltaTime);
            
            // Check for jump animation completion
            if (this.currentState === AnimationState.JUMPING && this.jumpAnimationStarted) {
                const jumpAction = this.animations['mixamo.com'];
                if (jumpAction && jumpAction.time >= jumpAction.getClip().duration * 0.95) { // 95% complete
                    this.jumpAnimationStarted = false; // Reset flag
                    
                    // Handle jump completion
                    const finalCameraState = this.preserveCameraState();
                    
                    // Determine which state to return to based on movement
                    const returnState = this.characterControls && this.characterControls.isMoving() 
                        ? AnimationState.RUNNING 
                        : AnimationState.IDLE;
                    
                    console.log('Jump animation complete, returning to:', returnState);
                    
                    // Reset flags
                    this.transitionInProgress = false;
                    
                    // Return to previous state
                    this.returnToDefaultModel(returnState).then(() => {
                        // Restore camera state after returning to default model
                        this.restoreCameraState(finalCameraState);
                    });
                }
            }
        }
        
        // Update character controls
        if (this.characterControls) {
            this.characterControls.update(deltaTime);
            
            // Handle movement state changes
            const isMoving = this.characterControls.isMoving();
            
            // Transition between idle and running based on movement
            if (!this.transitionInProgress && this.currentState !== AnimationState.JUMPING) {
                if (isMoving && this.currentState !== AnimationState.RUNNING) {
                    this.transitionToState(AnimationState.RUNNING);
                } else if (!isMoving && this.currentState !== AnimationState.IDLE) {
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
        window.removeEventListener('keydown', this.handleKeyPress);
        window.removeEventListener('keyup', this.handleKeyUp);
        
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
            };
            
            // Only try to get controls state if the method exists
            if (this.characterControls && typeof this.characterControls.getState === 'function') {
                try {
                    state.controls = this.characterControls.getState();
                } catch (error) {
                    console.warn('Failed to get character controls state:', error);
                    state.controls = null;
                }
            } else {
                state.controls = null;
            }
            
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
            
            // Only try to restore controls state if the method exists
            if (state.controls && 
                this.characterControls && 
                typeof this.characterControls.setState === 'function') {
                try {
                    this.characterControls.setState(state.controls);
                } catch (error) {
                    console.warn('Failed to restore character controls state:', error);
                }
            }
        }
    }

    updateCameraReference() {
        // If we have a camera and it's a FollowCamera instance
        if (this.camera && this.camera.userData && this.camera.userData.followCamera) {
            this.camera.userData.followCamera.player = this.character;
        }
    }
} 
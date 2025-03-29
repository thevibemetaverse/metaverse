import * as THREE from 'three';

export class Portal {
    constructor({
        position = new THREE.Vector3(0, 0, 0),
        rotation = new THREE.Euler(0, 0, 0),
        scale = new THREE.Vector3(1, 1, 1),
        destination = "https://example.com",
        portalId = "portal-default",
        title = "Default Portal",
        description = "A portal to another world",
        modelPath = '/assets/models/portal/portal-new.gltf'
    }) {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.destination = destination;
        this.portalId = portalId;
        this.title = title;
        this.description = description;
        this.modelPath = modelPath;
        this.usageCount = 0;
        this.mesh = null;
        this.isActive = true;
        this.effects = [];
        this.animationMixer = null;
        this.animations = {};
    }

    async load(loadingManager) {
        console.log(`[Portal] Starting to load portal model from: ${this.modelPath}`);
        // Import the GLTFLoader only when needed
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader(loadingManager);
        
        return new Promise((resolve, reject) => {
            loader.load(
                this.modelPath,
                (gltf) => {
                    console.log(`[Portal] Model loaded successfully for portal: ${this.portalId}`);
                    this.mesh = gltf.scene;
                    this.mesh.position.copy(this.position);
                    this.mesh.rotation.copy(this.rotation);
                    this.mesh.scale.copy(this.scale);
                    
                    // Add a user data reference back to this portal object
                    this.mesh.userData.portalRef = this;
                    
                    // Allow collision detection
                    this.mesh.traverse((child) => {
                        if (child.isMesh) {
                            child.userData.portalRef = this;
                        }
                    });
                    
                    // Setup animations if available
                    if (gltf.animations && gltf.animations.length) {
                        console.log(`[Portal] Found ${gltf.animations.length} animations for portal: ${this.portalId}`);
                        this.animationMixer = new THREE.AnimationMixer(this.mesh);
                        gltf.animations.forEach(animation => {
                            const action = this.animationMixer.clipAction(animation);
                            this.animations[animation.name] = action;
                            action.play();
                        });
                    }
                    
                    this.setupEffects();
                    console.log(`[Portal] Portal setup complete for: ${this.portalId}`);
                    resolve(this.mesh);
                },
                (xhr) => {
                    console.log(`[Portal] Loading progress for ${this.portalId}: ${(xhr.loaded / xhr.total) * 100}% loaded`);
                },
                (error) => {
                    console.error(`[Portal] Error loading portal model for ${this.portalId}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    setupEffects() {
        // Add a glowing effect to the portal
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                // Create a glowing material
                const glowMaterial = new THREE.MeshStandardMaterial({
                    color: 0x00ffff,
                    emissive: 0x00ffff,
                    emissiveIntensity: 0.5,
                    transparent: true,
                    opacity: 0.8
                });
                
                // Add the glow material to the mesh
                child.material = glowMaterial;
                
                // Add a pulsing effect
                const pulseEffect = {
                    intensity: 0.5,
                    speed: 2,
                    update: (deltaTime) => {
                        const pulse = Math.sin(Date.now() * 0.001 * pulseEffect.speed) * 0.5 + 0.5;
                        child.material.emissiveIntensity = pulseEffect.intensity * pulse;
                    }
                };
                
                this.effects.push(pulseEffect);
            }
        });
    }
    
    activate() {
        this.usageCount++;
        // Trigger visual effects
        return this.destination;
    }
    
    prepareDestinationURL(playerState) {
        const url = new URL(this.destination);
        
        // Add required parameters from spec
        url.searchParams.set('username', playerState.username || 'guest');
        url.searchParams.set('color', playerState.color || 'blue');
        url.searchParams.set('speed', playerState.speed || 5);
        url.searchParams.set('ref', window.location.href);
        url.searchParams.set('portal', 'true');
        
        // Add optional parameters if available
        if (playerState.avatarUrl) url.searchParams.set('avatar_url', playerState.avatarUrl);
        if (playerState.team) url.searchParams.set('team', playerState.team);
        
        return url.toString();
    }
    
    update(deltaTime) {
        // Update animations
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
        
        // Update effects
        this.effects.forEach(effect => effect.update(deltaTime));
    }
} 
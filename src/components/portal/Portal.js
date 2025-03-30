import * as THREE from 'three';

export class Portal {
    constructor({
        position = new THREE.Vector3(0, 0, 0),
        rotation = new THREE.Euler(0, 0, 0),
        scale = new THREE.Vector3(2.5, 2.5, 2.5),
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
                    
                    // Set up materials and collision detection
                    this.mesh.traverse((child) => {
                        if (child.isMesh) {
                            child.userData.portalRef = this;
                            // Create basic materials for portal textures
                            if (child.material.name === 'Material.002' || child.material.name === 'Cube002_3') {
                                const basicMaterial = new THREE.MeshBasicMaterial({
                                    transparent: true,
                                    opacity: 1.0,
                                    side: THREE.DoubleSide
                                });
                                basicMaterial.name = child.material.name;
                                child.material = basicMaterial;
                                
                                console.log(`[Portal] Applied flat material to ${this.portalId}:`, {
                                    meshName: child.name,
                                    materialName: basicMaterial.name,
                                    isBasicMaterial: basicMaterial instanceof THREE.MeshBasicMaterial,
                                    properties: {
                                        transparent: basicMaterial.transparent,
                                        opacity: basicMaterial.opacity,
                                        side: basicMaterial.side
                                    }
                                });
                            }
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

    updateTexture(materialName, texturePath) {
        if (!this.mesh) {
            console.warn(`[Portal] Cannot update texture for ${this.portalId}: mesh not loaded`);
            return;
        }

        console.log(`[Portal] Starting texture update for ${this.portalId}:`, {
            materialName,
            texturePath,
            meshChildren: this.mesh.children.length
        });

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            texturePath,
            (texture) => {
                // Basic texture settings
                texture.encoding = THREE.sRGBEncoding;
                texture.flipY = false;
                
                console.log(`[Portal] Texture loaded successfully for ${this.portalId}:`, {
                    imageWidth: texture.image.width,
                    imageHeight: texture.image.height,
                    textureType: texture.type,
                    encoding: texture.encoding,
                    flipY: texture.flipY
                });
                let materialFound = false;
                
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material && child.material.name === materialName) {
                        console.log(`[Portal] Found matching material ${materialName} in ${this.portalId}:`, {
                            meshName: child.name,
                            materialName: child.material.name,
                            isBasicMaterial: child.material instanceof THREE.MeshBasicMaterial,
                            currentProperties: {
                                transparent: child.material.transparent,
                                opacity: child.material.opacity,
                                side: child.material.side,
                                hasTexture: !!child.material.map
                            }
                        });
                        
                        // Update the texture on the existing basic material
                        child.material.map = texture;
                        child.material.needsUpdate = true;
                        materialFound = true;
                        
                        console.log(`[Portal] Applied texture to flat material ${materialName} in ${this.portalId}:`, {
                            meshName: child.name,
                            materialName: child.material.name,
                            textureApplied: !!child.material.map,
                            materialUpdated: child.material.needsUpdate
                        });
                    }
                });

                if (!materialFound) {
                    console.warn(`[Portal] No material named "${materialName}" found in portal ${this.portalId}`);
                }
            },
            (progress) => {
                console.log(`[Portal] Loading texture for ${this.portalId}: ${(progress.loaded / progress.total * 100)}%`);
            },
            (error) => {
                console.error(`[Portal] Error loading texture for ${this.portalId}:`, error);
            }
        );
    }
} 
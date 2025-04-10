import * as THREE from 'three';

// Ripple effect shader
const rippleVertexShader = `
uniform float time;
uniform vec4 uniqueOffset;
varying vec2 vUv;
varying vec3 vNormal;

// Simple pseudo-random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vUv = uv;
    vNormal = normal;
    
    // Create 3D displacement
    float displacement = 0.0;
    vec3 pos = position;
    
    // Add extremely subtle vertex displacement for 3D effect
    float freq1 = 1.5 + random(vec2(1.0 + uniqueOffset.x, 1.0)) * 0.5;
    float wave1 = sin(freq1 * position.x + (time + uniqueOffset.x) * 0.3) * 
                 sin(freq1 * position.y + (time + uniqueOffset.y) * 0.3) * 0.002;
                 
    float freq2 = 2.0 + random(vec2(2.0 + uniqueOffset.y, 2.0)) * 0.5;
    float wave2 = sin(freq2 * position.y + (time + uniqueOffset.y) * 0.2) * 
                 sin(freq2 * position.z + (time + uniqueOffset.z) * 0.2) * 0.001;
    
    displacement = wave1 + wave2;
    
    // Add distance-based fade for displacement
    float distanceFromCenter = length(position.xy);
    float fadeOut = smoothstep(0.8, 0.0, distanceFromCenter);
    pos += normal * displacement * fadeOut;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const rippleFragmentShader = `
uniform sampler2D baseTexture;
uniform sampler2D portalDepthTexture;
uniform float time;
uniform vec4 uniqueOffset;
varying vec2 vUv;
varying vec3 vNormal;

// Simple pseudo-random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5);
    vec2 centeredUV = uv - center;
    float distanceFromCenter = length(centeredUV);
    
    // Simplified depth effect
    float zoomFactor = 2.0 + sin(time * 0.5) * 0.1;
    vec2 rotatedUV = centeredUV / zoomFactor + center;
    
    // Sample depth texture
    vec4 depthColor = texture2D(portalDepthTexture, rotatedUV);
    
    // Single simplified ripple effect
    float freq = 2.0 + random(vec2(1.0 + uniqueOffset.x, 1.0)) * 0.5;
    float speed = 0.7 + random(vec2(2.0, 2.0 + uniqueOffset.y)) * 0.3;
    float ripple = sin(freq * distanceFromCenter * 8.0 - time * speed) * 0.003;
    
    // Simplified distortion
    vec2 finalUV = uv + vec2(ripple) * (1.0 - distanceFromCenter * 0.5);
    
    // Sample base texture with distortions
    vec4 baseColor = texture2D(baseTexture, finalUV);
    
    // Simplified depth blend
    vec4 finalColor = baseColor;
    if (depthColor.a > 0.0) {
        finalColor = mix(baseColor, depthColor * baseColor, distanceFromCenter * 0.5);
    }
    
    // Combined glow effect
    float glowStrength = 0.1 + sin(time * 0.5) * 0.02;
    vec3 glowColor = vec3(0.2, 0.4, 0.8);
    vec3 glow = glowColor * (1.0 - distanceFromCenter) * glowStrength;
    
    // Final color composition
    gl_FragColor = finalColor + vec4(glow, 0.0);
}
`;

// Simplified vertex shader for mobile devices
const simplifiedVertexShader = `
uniform float time;
uniform vec4 uniqueOffset;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
    vUv = uv;
    vNormal = normal;
    
    // Simplified vertex displacement for better performance
    vec3 pos = position;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// Simplified fragment shader for mobile devices
const simplifiedFragmentShader = `
uniform sampler2D baseTexture;
uniform float time;
uniform vec4 uniqueOffset;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5);
    vec2 centeredUV = uv - center;
    float distanceFromCenter = length(centeredUV);
    
    // Simplified distortion for better performance
    float ripple = sin(distanceFromCenter * 10.0 - time * 0.7) * 0.002;
    vec2 finalUV = uv + vec2(ripple);
    
    // Sample base texture with simplified distortions
    vec4 baseColor = texture2D(baseTexture, finalUV);
    
    // Simple glow effect
    vec3 glowColor = vec3(0.2, 0.4, 0.8);
    vec3 glow = glowColor * (1.0 - distanceFromCenter) * 0.1;
    
    gl_FragColor = baseColor + vec4(glow, 0.0);
}
`;

// Portal class with instancing support
export class Portal {
    constructor({
        position = new THREE.Vector3(0, 0, 0),
        rotation = new THREE.Euler(0, 0, 0),
        scale = new THREE.Vector3(2.5, 2.5, 2.5),
        destination = "https://example.com",
        portalId = "portal-default",
        title = "Default Portal",
        description = "A portal to another world",
        modelPath = '/assets/models/portal/portal-new.gltf',
        multiplayer = false,
        avatarTeleport = false
    }) {
        this.position = position.clone();
        this.rotation = rotation.clone();
        this.scale = scale.clone();
        this.destination = destination;
        this.portalId = portalId;
        this.title = title;
        this.description = description;
        this.modelPath = modelPath;
        this.multiplayer = multiplayer;
        this.avatarTeleport = avatarTeleport;
        this.usageCount = 0;
        this.mesh = null;
        this.isActive = true;
        this.effects = [];
        this.animationMixer = null;
        this.animations = {};
        
        // Flag for performance optimization on mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            typeof navigator !== 'undefined' ? navigator.userAgent : ''
        );
        
        // Generate unique random offsets for this portal instance
        this.uniqueOffset = new THREE.Vector4(
            Math.random() * 10,
            Math.random() * 10,
            Math.random() * 10,
            Math.random() * 10
        );
        
        // Store references to materials for texture updates
        this.shaderMaterials = new Map();
    }

    // Static method to create portal geometry instances
    static createPortalInstances(scene, configs, loadingManager) {
        console.log('[Portal] Creating portal instances for', configs.length, 'portals');
        
        return new Promise(async (resolve, reject) => {
            // Load and create template geometry
            const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
            const loader = new GLTFLoader(loadingManager);
            
            const modelPath = configs[0].modelPath || '/assets/models/portal/portal-new.gltf';
            console.log('[Portal] Loading template model from:', modelPath);
            
            // Create portals array
            const portals = [];
            
            try {
                // Load the template model
                loader.load(
                    modelPath,
                    (gltf) => {
                        console.log('[Portal] Template model loaded successfully');
                        const templateScene = gltf.scene;
                        
                        // Find meshes in the template to use for instancing
                        const meshes = [];
                        const geometries = [];
                        const originalMaterials = [];
                        
                        templateScene.traverse((child) => {
                            if (child.isMesh) {
                                meshes.push(child);
                                geometries.push(child.geometry.clone());
                                originalMaterials.push({
                                    name: child.material.name,
                                    material: child.material.clone()
                                });
                            }
                        });
                        
                        console.log('[Portal] Found', meshes.length, 'meshes in template model');
                        
                        // Create shader materials for the portal effects
                        const shaderMaterials = new Map();
                        
                        // Create instances for each portal config
                        configs.forEach((config, index) => {
                            // Create a new portal instance
                            const portal = new Portal(config);
                            
                            // Create a group to hold the portal meshes
                            const portalGroup = new THREE.Group();
                            portalGroup.position.copy(portal.position);
                            portalGroup.rotation.copy(portal.rotation);
                            portalGroup.scale.copy(portal.scale);
                            
                            // Store reference to this portal
                            portalGroup.userData.portalRef = portal;
                            
                            // Clone and add each mesh from the template
                            geometries.forEach((geometry, meshIndex) => {
                                const originalMaterial = originalMaterials[meshIndex];
                                
                                // Create a new material, either shader or standard
                                let material;
                                
                                if (originalMaterial.name === 'Material.002' || originalMaterial.name === 'Cube002_3') {
                                    // Use shader material for portal surface
                                    material = new THREE.ShaderMaterial({
                                        uniforms: {
                                            baseTexture: { value: null },
                                            portalDepthTexture: { value: null },
                                            time: { value: 0 },
                                            uniqueOffset: { value: portal.uniqueOffset }
                                        },
                                        vertexShader: portal.isMobile ? simplifiedVertexShader : rippleVertexShader,
                                        fragmentShader: portal.isMobile ? simplifiedFragmentShader : rippleFragmentShader,
                                        transparent: true,
                                        side: THREE.DoubleSide
                                    });
                                    
                                    // Save reference to this material for texture updates
                                    portal.shaderMaterials.set(originalMaterial.name, material);
                                    
                                    console.log(`[Portal] Created ${portal.isMobile ? 'simplified' : 'standard'} shader material for ${portal.portalId}`);
                                } else {
                                    // Use the original material for other parts
                                    material = originalMaterial.material.clone();
                                }
                                
                                material.name = originalMaterial.name;
                                
                                // Create the mesh with geometry and material
                                const mesh = new THREE.Mesh(geometry, material);
                                mesh.userData.portalRef = portal;
                                
                                // Add to portal group
                                portalGroup.add(mesh);
                            });
                            
                            // Save the mesh reference
                            portal.mesh = portalGroup;
                            
                            // Add portal group to scene
                            scene.add(portalGroup);
                            
                            // Add to portals array
                            portals.push(portal);
                            
                            console.log(`[Portal] Added portal ${portal.portalId} to scene`);
                        });
                        
                        console.log(`[Portal] Successfully created ${portals.length} portal instances`);
                        resolve(portals);
                    },
                    (xhr) => {
                        console.log(`[Portal] Loading template model: ${(xhr.loaded / xhr.total) * 100}% loaded`);
                    },
                    (error) => {
                        console.error('[Portal] Error loading template model:', error);
                        reject(error);
                    }
                );
            } catch (error) {
                console.error('[Portal] Failed to create portal instances:', error);
                reject(error);
            }
        });
    }

    // Legacy load method for backward compatibility
    async load(loadingManager) {
        console.log(`[Portal] Using legacy loading for portal: ${this.portalId}`);
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
                            // Create ripple shader material for portal textures
                            if (child.material.name === 'Material.002' || child.material.name === 'Cube002_3') {
                                // Choose simplified shader for mobile devices
                                const shaderMaterial = new THREE.ShaderMaterial({
                                    uniforms: {
                                        baseTexture: { value: null },
                                        portalDepthTexture: { value: null },
                                        time: { value: 0 },
                                        uniqueOffset: { value: this.uniqueOffset }
                                    },
                                    vertexShader: this.isMobile ? simplifiedVertexShader : rippleVertexShader,
                                    fragmentShader: this.isMobile ? simplifiedFragmentShader : rippleFragmentShader,
                                    transparent: true,
                                    side: THREE.DoubleSide
                                });
                                shaderMaterial.name = child.material.name;
                                child.material = shaderMaterial;
                                
                                // Store reference for texture updates
                                this.shaderMaterials.set(child.material.name, shaderMaterial);
                                
                                console.log(`[Portal] Applied ${this.isMobile ? 'simplified' : 'standard'} ripple shader material to ${this.portalId}:`, {
                                    meshName: child.name,
                                    materialName: shaderMaterial.name,
                                    isShaderMaterial: shaderMaterial instanceof THREE.ShaderMaterial,
                                    isMobile: this.isMobile
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
        
        // Add optional parameters if available to pass the character model 
        if (!url.searchParams.has('avatar_url')) {
            url.searchParams.set('avatar_url', playerState.avatarUrl || 'https://metaverse-delta.vercel.app/assets/models/metaverse-explorer.glb');
        }
        if (playerState.team) url.searchParams.set('team', playerState.team);
        
        return url.toString();
    }
    
    update(deltaTime) {
        // Update animations
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
        
        // Update ripple effect - use smaller time steps on mobile for smoother animation
        if (this.mesh) {
            const timeIncrement = this.isMobile ? deltaTime * 0.5 : deltaTime;
            
            // Update all shader materials with new time
            this.shaderMaterials.forEach((material) => {
                if (material.uniforms && material.uniforms.time) {
                    material.uniforms.time.value += timeIncrement;
                }
            });
        }
        
        // Update effects
        if (!this.isMobile || this.effects.length < 3) { // Limit effects on mobile
            this.effects.forEach(effect => effect.update(deltaTime));
        }
    }

    updateTexture(materialName, texturePath) {
        if (!this.mesh) {
            console.warn(`[Portal] Cannot update texture for ${this.portalId}: mesh not loaded`);
            return;
        }

        console.log(`[Portal] Starting texture update for ${this.portalId}:`, {
            materialName,
            texturePath
        });

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            texturePath,
            (texture) => {
                // Basic texture settings
                texture.encoding = THREE.sRGBEncoding;
                texture.flipY = false;
                
                console.log(`[Portal] Texture loaded successfully for ${this.portalId}`);
                
                // Check if we have a cached shader material with this name
                const material = this.shaderMaterials.get(materialName);
                
                if (material && material.uniforms) {
                    material.uniforms.baseTexture.value = texture;
                    material.needsUpdate = true;
                    console.log(`[Portal] Applied texture to shader material ${materialName} in ${this.portalId}`);
                } else {
                    // If not found in cache, traverse the mesh
                    let materialFound = false;
                    
                    this.mesh.traverse((child) => {
                        if (child.isMesh && child.material && child.material.name === materialName) {
                            if (child.material instanceof THREE.ShaderMaterial) {
                                child.material.uniforms.baseTexture.value = texture;
                                child.material.needsUpdate = true;
                                materialFound = true;
                                
                                // Cache for future updates
                                this.shaderMaterials.set(materialName, child.material);
                                
                                console.log(`[Portal] Applied texture to shader material ${materialName} in ${this.portalId}`);
                            }
                        }
                    });

                    if (!materialFound) {
                        console.warn(`[Portal] No material named "${materialName}" found in portal ${this.portalId}`);
                    }
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
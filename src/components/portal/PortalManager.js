import * as THREE from 'three';
import { Portal, rippleVertexShader, rippleFragmentShader, simplifiedVertexShader, simplifiedFragmentShader, ultraSimplifiedVertexShader, ultraSimplifiedFragmentShader } from './Portal.js';
import { PieterPortal } from './PieterPortal.js';
import config from '../../config.js';

export class PortalManager {
    constructor(scene, camera, playerState) {
        // Store references
        this.scene = scene;
        this.camera = camera;
        this.playerState = playerState;
        
        // Initialize portals array
        this.portals = [];
        
        // Initialize raycaster for portal collision detection
        this.raycaster = new THREE.Raycaster();
        this.clickRaycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.touchPosition = new THREE.Vector2();
        
        // Create loading manager for asset loading
        this.loadingManager = new THREE.LoadingManager();
        
        // Track liked portals (using portal IDs as keys)
        this.portalLikes = new Map();
        
        // Store the authenticated user ID if available
        this.userId = null;
        
        // Store selected button reference for hover/click
        this.selectedButton = null;
        
        // Setup UI groups for organization
        this.uiGroups = {
            likeButtons: new THREE.Group(),
            nameplates: new THREE.Group(),
            infoSigns: new THREE.Group(),
            particles: new THREE.Group()
        };
        
        // Add UI groups to scene
        for (const groupName in this.uiGroups) {
            this.scene.add(this.uiGroups[groupName]);
        }
        
        // Create collections for UI elements (as Maps instead of arrays)
        this.likeButtonMeshes = new Map();
        this.portalLikeButtons = new Map();
        this.likeTextMeshes = new Map();
        this.likedPortals = new Set();
        this.nameplateMeshes = [];
        
        // Initialize socket for real-time updates
        this.socket = null;
        
        // Initialize shared resources object
        this.sharedResources = {
            // Shared geometries
            geometries: {},
            // Shared materials
            materials: {},
            // Cache for text textures
            textTextureCache: new Map()
        };
        
        // Cache common geometries and materials for UI elements
        this._initSharedResources();
        
        // Setup performance levels (default to auto)
        this.configurePerformance('auto');
        
        // Initialize shared materials for distant portals
        this.sharedLowDetailMaterials = {};
        
        // FPS monitoring for auto-balancing
        this.fpsHistory = [];
        this.lastFrameTime = 0;
        this.fpsUpdateInterval = 500; // ms between FPS calculations
        this.lastFpsUpdate = 0;
        this.currentFps = 60;
        this.targetFps = 60;
        this.balancingEnabled = true;
        this.maxVisibilityDistance = this.lodLevels.far; // Initial max visibility distance
        this.distanceAdjustmentStep = 10; // Distance adjustment per step
        this.distanceAdjustmentCooldown = 0; // Cooldown for distance adjustments
        this.lastDistanceAdjustment = 0;
        
        console.log('[PortalManager] Initialized');
    }
    
    _initSharedResources() {
        // Create shared geometries
        this.sharedResources.geometries.likeButton = new THREE.PlaneGeometry(3, 3);
        this.sharedResources.geometries.nameplate = new THREE.PlaneGeometry(5, 3);
        this.sharedResources.geometries.infoSign = new THREE.PlaneGeometry(3.5, 4);
        this.sharedResources.geometries.textPlane = new THREE.PlaneGeometry(4.5, 2.5);
        
        // Create shared texture loader
        const textureLoader = new THREE.TextureLoader(this.loadingManager);
        
        // Load shared textures - use the same loader to benefit from caching
        const counterTexture = textureLoader.load('/assets/images/counter.png');
        const nameplateTexture = textureLoader.load('/assets/images/name.png');
        const infoTexture = textureLoader.load('/assets/images/info.png');
        
        // Create shared materials with the textures
        this.sharedResources.materials.likeButton = new THREE.MeshBasicMaterial({
            map: counterTexture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.sharedResources.materials.nameplate = new THREE.MeshBasicMaterial({
            map: nameplateTexture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.sharedResources.materials.infoSign = new THREE.MeshBasicMaterial({
            map: infoTexture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        // Create a shared material for text that will be updated with different canvases
        this.sharedResources.materials.text = new THREE.MeshBasicMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        // Initialize texture atlas system
        this.textureAtlases = [];
        this.portalTextureMap = new Map(); // Maps portalId to atlas coordinates
        
        // Initialize empty texture arrays for atlas creation
        this.pendingTextures = [];
        
        // Initialize instancedMesh containers for UI elements
        this.instancedMeshes = {
            likeButtons: null,
            likeButtonsCount: 0,
            likeButtonMatrices: [],
            buttonMapping: new Map() // Map portal IDs to instance indices
        };
        
        console.log('[PortalManager] Shared resources initialized');
    }
    
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Check if mouse is over a like button
        this.checkButtonHover();
    }
    
    // Save the current set of liked portals to localStorage - now empty for compatibility
    saveLikedPortalsToStorage() {
        // No longer saving to local storage
        // This method remains for compatibility with existing code
    }
    
    onMouseClick(event) {
        // Check if a button is clicked
        if (this.selectedButton) {
            const portalId = this.selectedButton.portalId;
            this.likePortal(portalId);
        }
    }
    
    onTouchStart(event) {
        // Skip if game is not in playing state
        if (window.gameStateManager && !window.gameStateManager.isPlaying()) {
            return;
        }
        
        // Prevent default behavior (scrolling, zooming)
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Track that we're in a touch interaction
            this.touchInteracting = true;
            this.updateTouchPosition(event.touches[0]);
            this.checkButtonHover(); // Check for button intersection
        }
    }
    
    onTouchMove(event) {
        // Skip if game is not in playing state
        if (window.gameStateManager && !window.gameStateManager.isPlaying()) {
            return;
        }
        
        // Prevent default behavior (scrolling, zooming)
        event.preventDefault();
        
        if (event.touches.length === 1 && this.touchInteracting) {
            this.updateTouchPosition(event.touches[0]);
            this.checkButtonHover(); // Update button hover state
        }
    }
    
    onTouchEnd(event) {
        // Skip if game is not in playing state
        if (window.gameStateManager && !window.gameStateManager.isPlaying()) {
            return;
        }
        
        // Prevent default behavior
        event.preventDefault();
        
        // If we were touching a button, trigger a like
        if (this.touchInteracting && this.selectedButton) {
            const portalId = this.selectedButton.portalId;
            this.likePortal(portalId);
        }
        
        // Reset touch state
        this.touchInteracting = false;
        this.selectedButton = null;
        
        // Reset cursor when touch ends
        document.body.style.cursor = 'default';
    }
    
    updateTouchPosition(touch) {
        // Convert touch coordinates to normalized device coordinates (-1 to +1)
        this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        
        // Store the last touch position
        this.lastTouchPosition.x = touch.clientX;
        this.lastTouchPosition.y = touch.clientY;
    }
    
    checkButtonHover() {
        if (!this.camera) return;
        
        // Update the raycaster with the camera and mouse position
        this.clickRaycaster.setFromCamera(this.mouse, this.camera);
        
        // Create a list of all visible interactive elements
        const clickableMeshes = [];
        
        // Only check visible buttons to reduce unnecessary processing
        this.uiGroups.likeButtons.traverse(child => {
            if (child.visible && child.isMesh && child.userData && child.userData.portalId) {
                clickableMeshes.push(child);
            }
        });
        
        // Reset all button star materials to their original color
        this.likeButtonMeshes.forEach((mesh, portalId) => {
            if (mesh.visible && mesh.material) {
                // Default color is white if no original color is stored
                const originalColor = mesh.material.userData?.originalColor || 0xFFFFFF;
                mesh.material.color.set(originalColor);
            }
        });
        
        // Clear selected button
        this.selectedButton = null;
        document.body.style.cursor = 'default';
        
        // If no clickable meshes, exit early
        if (clickableMeshes.length === 0) return;
        
        // Check for intersections
        const intersects = this.clickRaycaster.intersectObjects(clickableMeshes);
        
        // Handle hover state
        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const portalId = clickedMesh.userData.portalId;
            
            // Highlight the star button for this portal
            const starMesh = this.likeButtonMeshes.get(portalId);
            if (starMesh && starMesh.visible) {
                // Store original color if not already saved
                if (!starMesh.material.userData) {
                    starMesh.material.userData = {};
                }
                if (!starMesh.material.userData.originalColor) {
                    starMesh.material.userData.originalColor = starMesh.material.color.getHex();
                }
                
                starMesh.material.color.set(0xFFFF00); // Bright yellow hover color
                this.selectedButton = { portalId: portalId };
                document.body.style.cursor = 'pointer';
            }
        }
    }
    
    // Set socket reference from multiplayer manager
    setSocket(socket) {
        this.socket = socket;
        
        // Set up socket event listeners for likes
        if (this.socket) {
            this.socket.on('portalLikeUpdate', (data) => {
                this.updatePortalLikeCount(data.portalId, data.likeCount);
            });
            
            this.socket.on('initialPortalLikes', (likesData) => {
                Object.entries(likesData).forEach(([portalId, count]) => {
                    this.updatePortalLikeCount(portalId, count);
                });
            });
            
            // Handle previously liked portals from server
            this.socket.on('playerLikedPortals', (likedPortals) => {
                console.log(`[PortalManager] Received liked portals from server:`, likedPortals);
                if (Array.isArray(likedPortals)) {
                    // Clear existing likes and use only server data
                    this.likedPortals.clear();
                    likedPortals.forEach(portalId => this.likedPortals.add(portalId));
                    
                    // Update UI for portals that have been liked
                    this.portals.forEach(portal => {
                        this.updateLikeButtonAppearance(portal.portalId);
                    });
                }
            });
            
            // Request initial like counts from server
            this.socket.emit('getPortalLikes');
        }
    }
    
    // Initialize portal likes from config
    initializePortalLikes() {
        // First ensure all portals have a default count of 0
        this.portals.forEach(portal => {
            if (!this.portalLikes.has(portal.portalId)) {
                this.portalLikes.set(portal.portalId, 0);
            }
        });
        
        // Then apply overrides from config
        if (config.portals && config.portals.initialLikes) {
            Object.entries(config.portals.initialLikes).forEach(([portalId, count]) => {
                this.portalLikes.set(portalId, count);
                this.updateLikeButtonText(portalId);
            });
        }
        
        // Update UI for all portals
        this.portals.forEach(portal => {
            this.updateLikeButtonText(portal.portalId);
            this.updateLikeButtonAppearance(portal.portalId);
        });
    }
    
    async addPortal(portalConfig) {
        console.log('[PortalManager] Adding portal:', portalConfig);
        const portal = new Portal(portalConfig);
        try {
            console.log('[PortalManager] Loading portal model from:', portalConfig.modelPath);
            const portalMesh = await portal.load(this.loadingManager);
            console.log('[PortalManager] Portal model loaded successfully, adding to scene');
            
            // Set position and rotation explicitly
            portalMesh.position.copy(portalConfig.position);
            portalMesh.rotation.copy(portalConfig.rotation);
            
            this.scene.add(portalMesh);
            this.portals.push(portal);
            
            // Check if we need to create instanced meshes
            if (this.portals.length > 0 && !this.instancedMeshes.likeButtons) {
                this.createInstancedUIElements();
            }
            
            // Create 3D like button for this portal
            this.create3DLikeButton(portal);
            
            // Initialize like count for this portal (from config or default to 0)
            if (!this.portalLikes.has(portalConfig.portalId)) {
                this.portalLikes.set(portalConfig.portalId, 0);
            }
            
            // Apply config override if exists
            if (config.portals && config.portals.initialLikes && config.portals.initialLikes[portalConfig.portalId]) {
                this.portalLikes.set(portalConfig.portalId, config.portals.initialLikes[portalConfig.portalId]);
            }
            
            // Update button text with initial count
            this.updateLikeButtonText(portalConfig.portalId);
            
            // Use a placeholder texture to prevent flickering
            const placeholderTexture = new THREE.Texture();
            placeholderTexture.image = new Image();
            placeholderTexture.image.src = '/assets/images/placeholder.png';
            placeholderTexture.needsUpdate = true;
            
            // Update texture with placeholder first
            console.log(`[PortalManager] Setting placeholder texture for portal ${portalConfig.portalId}`);
            ['Material.002', 'Cube002_3'].forEach(materialName => {
                portal.updateTexture(materialName, '/assets/images/placeholder.png');
            });
            
            // Then load the actual texture after a delay
            setTimeout(() => {
                console.log(`[PortalManager] Updating texture for portal ${portalConfig.portalId}`);
                let portalImageUrl;
                if (portalConfig.portalId === 'enter') {
                    portalImageUrl = '/assets/images/portal.jpg';
                } else {
                    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 10);
                    portalImageUrl = `https://thevibemetaverse.vercel.app/assets/images/${portalConfig.portalId}.png?uid=${uniqueId}`;
                }
                
                console.log(`[PortalManager] Setting texture for ${portalConfig.portalId} to:`, portalImageUrl);
                ['Material.002', 'Cube002_3'].forEach(materialName => {
                    portal.updateTexture(materialName, portalImageUrl);
                });
            }, 500 + Math.floor(Math.random() * 100)); // Increased delay to ensure placeholder is shown first
            
            return portal;
        } catch (error) {
            console.error("[PortalManager] Failed to add portal:", error);
            return null;
        }
    }
    
    // Create 3D like button for a portal
    create3DLikeButton(portal) {
        if (!portal || !portal.mesh) return;
        
        try {
            // Get position above the portal
            const position = portal.mesh.position.clone();
            position.y += 10; // Adjusted height above portal
            
            // Check if we're using instancing
            if (this.instancedMeshes.likeButtons) {
                // Assign an instance to this portal
                const instanceIndex = this.instancedMeshes.likeButtonsCount++;
                this.instancedMeshes.buttonMapping.set(portal.portalId, instanceIndex);
                
                // Update the matrix for this instance
                const matrix = this.instancedMeshes.likeButtonMatrices[instanceIndex];
                const dummy = new THREE.Object3D();
                dummy.position.copy(position);
                dummy.scale.set(1.5, 1.5, 1.5); // Default button size
                dummy.updateMatrix();
                
                // Update the instance matrix
                matrix.copy(dummy.matrix);
                this.instancedMeshes.likeButtons.setMatrixAt(instanceIndex, matrix);
                this.instancedMeshes.likeButtons.instanceMatrix.needsUpdate = true;
                
                // For text, we'll still use individual meshes (text needs to be readable)
                const buttonText = this.createTextMesh("Like", "Arial");
                buttonText.position.copy(position);
                buttonText.position.y += 2; // Position text above button
                buttonText.userData.portalId = portal.portalId;
                buttonText.userData.isLikeText = true;
                
                // Add to the nameplates group for management
                this.uiGroups.nameplates.add(buttonText);
                
                console.log(`[PortalManager] Added instanced like button for portal ${portal.portalId}`);
                return;
            }
            
            // Fallback to original method if instancing is not set up
            // ... existing code for creating individual button meshes ...
        } catch (error) {
            console.error(`[PortalManager] Error creating like button for portal ${portal.portalId}:`, error);
        }
    }
    
    // Create name image for a portal
    createPortalName(portal) {
        // Create name image using shared resources
        const nameMesh = new THREE.Mesh(
            this.sharedResources.geometries.nameplate,
            this.sharedResources.materials.nameplate
        );
        
        // Position the name mesh relative to the portal
        const portalPosition = portal.position.clone();
        nameMesh.position.copy(portalPosition);
        nameMesh.position.y += 6; // Position above the portal
        
        // Create a direction vector pointing forward from the portal
        const forwardVector = new THREE.Vector3(0, 0, 1);
        forwardVector.applyEuler(portal.rotation);
        
        // Move the name mesh in front of the portal
        nameMesh.position.add(forwardVector.multiplyScalar(0.22));
        
        // Set the rotation to match the portal's Y rotation - FIXED to not follow camera
        nameMesh.rotation.y = portal.rotation.y;
        
        // Create text mesh for the portal's title
        const textMesh = this.createTextMesh(portal.title);
        textMesh.position.z = 0.01; // Place slightly in front of the name image
        nameMesh.add(textMesh); // Add text as a child of the name mesh
        
        // Store metadata for LOD
        nameMesh.userData = {
            portalId: portal.portalId,
            type: 'nameplate',
            distanceFromCamera: 0
        };
        
        // Add name mesh to the nameplate group instead of directly to the scene
        this.uiGroups.nameplates.add(nameMesh);

        // Create info sign on the ground using shared resources
        const infoMesh = new THREE.Mesh(
            this.sharedResources.geometries.infoSign,
            this.sharedResources.materials.infoSign
        );
        
        // Position the info sign relative to the portal
        const infoPosition = portal.position.clone();
        
        // Calculate the right vector relative to the portal's orientation
        const rightVector = new THREE.Vector3(1, 0, 0);
        rightVector.applyEuler(portal.rotation);
        
        // Move the info sign to the side of the portal
        const sideOffset = 6; // Distance from portal
        infoPosition.add(rightVector.multiplyScalar(-sideOffset)); // Negative to place on left side
        
        // Add slight height offset
        infoPosition.y += 1.9;
        
        infoMesh.position.copy(infoPosition);
        
        // Set the rotation to match the portal's Y rotation
        infoMesh.rotation.y = portal.rotation.y;
        
        // Store metadata for LOD
        infoMesh.userData = {
            portalId: portal.portalId,
            type: 'infoSign',
            distanceFromCamera: 0
        };
        
        // Create and add multiplayer status emoji
        const multiplayerBool = this.createTextMesh(portal.multiplayer ? "✅" : "❌");
        multiplayerBool.position.x = -1.2;
        multiplayerBool.position.z = -.01;
        multiplayerBool.position.y = 1.2;
        multiplayerBool.scale.set(0.6, 0.6, 0.6);
        infoMesh.add(multiplayerBool);

        const multiplayerText = this.createTextMesh("Multiplayer");
        multiplayerText.position.x = 0.15;
        multiplayerText.position.z = 0.01;
        multiplayerText.position.y = 1.2;
        multiplayerText.scale.set(0.6, 0.6, 0.6);
        infoMesh.add(multiplayerText);
        
        // Create and add avatar teleport status emoji
        const avatarBool = this.createTextMesh(portal.avatarTeleport ? "✅" : "❌");
        avatarBool.position.x = -1.2;
        avatarBool.position.z = -.01;
        avatarBool.position.y = .6;
        avatarBool.scale.set(0.6, 0.6, 0.6);
        infoMesh.add(avatarBool);

        const avatarText = this.createTextMesh("Avatar teleport");
        avatarText.position.x = .15;
        avatarText.position.z = 0.01;
        avatarText.position.y = 0.6;
        avatarText.scale.set(0.6, 0.6, 0.6);
        infoMesh.add(avatarText);
        
        // Add info mesh to the info signs group instead of directly to the scene
        this.uiGroups.infoSigns.add(infoMesh);
        
        return {
            nameMesh: nameMesh,
            infoMesh: infoMesh
        };
    }
    
    // Create text mesh for showing the count
    createTextMesh(text, fontFamily = 'Arial') {
        // Check if we already have a cached texture for this text
        const cacheKey = `${text}_${fontFamily}`;
        
        let texture;
        
        // Try to get from cache first
        if (this.sharedResources.textTextureCache.has(cacheKey)) {
            texture = this.sharedResources.textTextureCache.get(cacheKey);
        } else {
            // Create a new canvas texture if not in cache
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { alpha: true });
            canvas.width = 512;
            canvas.height = 256;
            
            // Clear the canvas to ensure transparency
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Start with a large font size
            let fontSize = 72;
            let textWidth;
            
            // Keep reducing font size until text fits
            do {
                context.font = `bold ${fontSize}px ${fontFamily}`;
                textWidth = context.measureText(text).width;
                fontSize -= 10;
            } while (textWidth > canvas.width * 0.9 && fontSize > 20); // Leave 10% margin on each side
            
            // Draw text on transparent background
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = '#000000';
            context.fillText(text, canvas.width / 2, canvas.height / 2);
            
            texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // Cache the texture for future use
            this.sharedResources.textTextureCache.set(cacheKey, texture);
        }
        
        // Create material with the texture
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.01,
            depthWrite: false
        });
        
        // Always use the same geometry to benefit from batching
        const mesh = new THREE.Mesh(this.sharedResources.geometries.textPlane, material);
        
        return mesh;
    }
    
    // Update button text for a specific portal
    updateLikeButtonText(portalId) {
        const count = this.portalLikes.get(portalId) || 0;
        const textGroup = this.likeTextMeshes.get(portalId);
        
        if (textGroup) {
            // Remove all previous children first
            while (textGroup.children.length > 0) {
                const child = textGroup.children[0];
                textGroup.remove(child);
                if (child.material) {
                    child.material.dispose();
                }
                if (child.geometry) {
                    child.geometry.dispose();
                }
            }
            
            // Create new text mesh
            const textMesh = this.createTextMesh(count.toString());
            textMesh.position.z = 0.01; // Place slightly in front of background
            textGroup.add(textMesh);
        }
    }
    
    // Update the appearance of a like button based on whether it's been liked
    updateLikeButtonAppearance(portalId) {
        // Check if using instanced meshes
        if (this.instancedMeshes.likeButtons && this.instancedMeshes.buttonMapping.has(portalId)) {
            const instanceIndex = this.instancedMeshes.buttonMapping.get(portalId);
            const isLiked = this.likedPortals.has(portalId);
            
            // Update the instanced mesh color
            const colors = this.instancedMeshes.likeButtons.instanceColor || 
                           new THREE.InstancedBufferAttribute(new Float32Array(this.portals.length * 3), 3);
            
            if (!this.instancedMeshes.likeButtons.instanceColor) {
                this.instancedMeshes.likeButtons.instanceColor = colors;
            }
            
            // Set color based on like status
            const color = isLiked ? new THREE.Color(0xff3366) : new THREE.Color(0x2196F3);
            colors.setXYZ(instanceIndex, color.r, color.g, color.b);
            colors.needsUpdate = true;
            
            // Update the instance scale for hover effect
            if (this.hoveredPortalId === portalId) {
                const matrix = this.instancedMeshes.likeButtonMatrices[instanceIndex];
                const dummy = new THREE.Object3D();
                dummy.scale.set(1.8, 1.8, 1.8); // Larger for hover effect
                dummy.position.setFromMatrixPosition(matrix);
                dummy.updateMatrix();
                this.instancedMeshes.likeButtons.setMatrixAt(instanceIndex, dummy.matrix);
                this.instancedMeshes.likeButtons.instanceMatrix.needsUpdate = true;
            }
            
            return;
        }
        
        // Fallback to original method if instancing is not set up
        // ... existing code for updating individual button meshes ...
    }
    
    // Handle portal like
    likePortal(portalId) {
        // Check if user has already liked this portal
        if (this.likedPortals.has(portalId)) {
            console.log(`[PortalManager] Portal ${portalId} already liked by this user`);
            return;
        }
        
        // Play like animation
        this.playLikeAnimation(portalId);
        
        // Update local count temporarily for responsive UI
        const currentCount = this.portalLikes.get(portalId) || 0;
        this.portalLikes.set(portalId, currentCount + 1);
        this.updateLikeButtonText(portalId);
        
        // Mark this portal as liked by the user
        this.likedPortals.add(portalId);
        
        // Update button appearance to show it's been liked
        this.updateLikeButtonAppearance(portalId);
        
        // Send like event to server if socket connection exists
        if (this.socket) {
            this.socket.emit('likePortal', { portalId });
        }
    }
    
    // Play animation when a portal is liked
    playLikeAnimation(portalId) {
        const starMesh = this.likeButtonMeshes.get(portalId);
        const buttonGroup = this.portalLikeButtons.get(portalId);
        
        if (!starMesh || !buttonGroup) return;
        
        // Skip complex animations for distant portals
        const distance = buttonGroup.userData.distanceFromCamera || 0;
        const isClose = distance < this.lodLevels.close / 2;
        
        // Store original properties
        const originalScale = starMesh.scale.clone();
        const originalColor = starMesh.material.color.clone();
        const duration = 0.8; // seconds
        let time = 0;
        
        // Only create particles for close portals
        if (isClose) {
            this.createLikeParticles(buttonGroup.position, portalId, distance);
        }
        
        // Animate the star
        const animate = () => {
            time += 0.016; // ~60fps
            
            if (time < duration) {
                const progress = time / duration;
                
                // Scale animation - pulse effect
                const scale = 1 + Math.sin(progress * Math.PI) * 0.6;
                starMesh.scale.set(
                    originalScale.x * scale,
                    originalScale.y * scale,
                    originalScale.z * scale
                );
                
                // Color animation - flash effect
                const colorFactor = Math.sin(progress * Math.PI * 2);
                // Make it flash between gold and bright yellow
                const color = new THREE.Color().lerpColors(
                    new THREE.Color(0xFFD700), // Gold
                    new THREE.Color(0xFFFF00), // Bright yellow
                    Math.abs(colorFactor)
                );
                starMesh.material.color.copy(color);
                
                requestAnimationFrame(animate);
            } else {
                // Reset to original scale and color
                starMesh.scale.copy(originalScale);
                starMesh.material.color.copy(originalColor);
            }
        };
        
        animate();
    }
    
    // Create particles effect when liking a portal - with LOD
    createLikeParticles(position, portalId, distance = 0) {
        // Adjust particle count based on distance
        let particleCount = 12; // Default
        
        // Reduce particles based on distance
        if (distance > this.lodLevels.close / 3) {
            particleCount = 6;
        }
        
        // Skip particles on mobile devices
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            typeof navigator !== 'undefined' ? navigator.userAgent : ''
        );
        
        if (isMobile) {
            particleCount = Math.max(4, particleCount / 2);
        }
        
        // Create a group for particles
        const particleGroup = new THREE.Group();
        particleGroup.position.copy(position);
        
        // Use a simpler geometry for better performance
        const starGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        
        // Create a simple 5-point star shape
        const outerRadius = 0.5;
        const innerRadius = 0.2;
        const numPoints = 5;
        
        for (let i = 0; i < numPoints * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI / numPoints) * i;
            const x = Math.sin(angle) * radius;
            const y = Math.cos(angle) * radius;
            
            vertices.push(x, y, 0);
            colors.push(1, 0.84, 0); // Gold color
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Create particles
        const particles = [];
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = starGeometry.clone();
            
            const particle = new THREE.Points(particleGeometry, particleMaterial);
            
            // Set initial position
            particle.position.set(0, 0, 0);
            
            // Set random scale (smaller than the main star)
            const scale = 0.15 + Math.random() * 0.15;
            particle.scale.set(scale, scale, scale);
            
            // Set random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.08, // x velocity
                Math.random() * 0.08,          // y velocity (upward biased)
                (Math.random() - 0.5) * 0.08  // z velocity
            );
            
            // Store velocity with the particle
            particle.userData.velocity = velocity;
            
            // Add to group
            particleGroup.add(particle);
            particles.push(particle);
        }
        
        // Add particle group to the scene
        this.scene.add(particleGroup);
        
        // Animate particles
        const duration = 1.5; // seconds
        let time = 0;
        
        const animateParticles = () => {
            time += 0.016; // ~60fps
            
            if (time < duration) {
                const progress = time / duration;
                
                // Update particle positions and rotations
                particles.forEach(particle => {
                    // Apply velocity
                    const velocity = particle.userData.velocity;
                    particle.position.x += velocity.x;
                    particle.position.y += velocity.y;
                    particle.position.z += velocity.z;
                    
                    // Fade out over time
                    if (progress > 0.7) {
                        const opacity = 0.8 * (1 - (progress - 0.7) / 0.3);
                        particle.material.opacity = opacity;
                    }
                });
                
                requestAnimationFrame(animateParticles);
            } else {
                // Cleanup particles
                this.scene.remove(particleGroup);
                particles.forEach(particle => {
                    if (particle.geometry) particle.geometry.dispose();
                });
                if (particleMaterial) particleMaterial.dispose();
            }
        };
        
        animateParticles();
    }
    
    // Update portal like count (used when receiving server updates)
    updatePortalLikeCount(portalId, count) {
        this.portalLikes.set(portalId, count);
        this.updateLikeButtonText(portalId);
    }
    
    update(deltaTime) {
        // Monitor FPS for auto-balancing visibility distance
        this.monitorFps();
        
        // Only update LOD visibility every 10 frames for performance
        this.frameCounter = (this.frameCounter || 0) + 1;
        if (this.frameCounter % 10 === 0) {
            this.updateLODVisibility();
            
            // Log stats occasionally for debugging (once every ~5 seconds)
            if (this.frameCounter % 300 === 0) {
                this.logPerformanceStats();
            }
            
            // Adjust visibility distance based on performance if enabled
            if (this.balancingEnabled && this.frameCounter % 30 === 0) {
                this.autoBalanceVisibilityDistance();
            }
        }
        
        // Check if player is hovering over a like button
        this.checkButtonHover();
        
        // Determine update frequency based on performance
        let updateFrequency = 1; // Default to update every frame
        if (this.emergencyModeActive) {
            updateFrequency = this.emergencyUpdateFrequency || 5; // Throttle heavily in emergency mode
        } else if (this.currentFps < this.targetFps * 0.6) {
            updateFrequency = 3; // Moderate throttling if FPS is below 60% of target
        } else if (this.currentFps < this.targetFps * 0.8) {
            updateFrequency = 2; // Light throttling if FPS is below 80% of target
        }
        
        // Update portal animations with adaptive frequency
        this.portals.forEach(portal => {
            if (portal.mesh && portal.mesh.visible) {
                // For distant portals or low FPS, update less frequently to save resources
                if (portal.distanceFromCamera > this.lodLevels.medium) {
                    if (this.frameCounter % (3 * updateFrequency) === 0) {
                        portal.update(deltaTime, this.camera);
                    }
                } else if (this.frameCounter % updateFrequency === 0) {
                    portal.update(deltaTime, this.camera);
                }
            }
        });
        
        // Rotate like buttons to face camera, throttle based on performance
        if (this.frameCounter % updateFrequency === 0) {
            this.uiGroups.likeButtons.children.forEach(buttonGroup => {
                if (buttonGroup.visible && !buttonGroup.userData.skipUpdate) {
                    buttonGroup.lookAt(this.camera.position);
                }
            });
            
            // Removed rotation for nameplates to fix orientation issue
            // Nameplates now maintain portal orientation
        }
        
        // Update instanced UI elements efficiently
        if (this.instancedMeshes.likeButtons) {
            // Only update instance matrix if we need to
            let needsMatrixUpdate = false;
            
            // Throttle updates for instanced meshes based on performance
            if (this.frameCounter % updateFrequency === 0) {
                // Find all instances that need updating
                this.instancedMeshes.buttonMapping.forEach((instanceIndex, portalId) => {
                    // Find the portal for this instance
                    const portal = this.portals.find(p => p.portalId === portalId);
                    if (!portal || !portal.mesh) return;
                    
                    // Skip updating if beyond visibility distance
                    if (portal.distanceFromCamera > this.lodLevels.medium) {
                        return;
                    }
                    
                    // Update matrix for this instance
                    const matrix = this.instancedMeshes.likeButtonMatrices[instanceIndex];
                    const dummy = new THREE.Object3D();
                    
                    // Get position from portal
                    const position = portal.mesh.position.clone();
                    position.y += 10; // Position above portal
                    
                    dummy.position.copy(position);
                    
                    // Apply scale based on hover state
                    const isHovered = this.hoveredPortalId === portalId;
                    const baseScale = 1.5;
                    const hoverScale = 1.8;
                    const scale = isHovered ? hoverScale : baseScale;
                    
                    // Apply pulse animation to liked portals
                    const isLiked = this.likedPortals.has(portalId);
                    if (isLiked) {
                        const pulse = Math.sin(Date.now() * 0.004) * 0.1 + 1.0;
                        dummy.scale.set(
                            scale * pulse,
                            scale * pulse, 
                            scale * pulse
                        );
                    } else {
                        dummy.scale.set(scale, scale, scale);
                    }
                    
                    // Update matrix
                    dummy.updateMatrix();
                    if (!matrix.equals(dummy.matrix)) {
                        this.instancedMeshes.likeButtons.setMatrixAt(instanceIndex, dummy.matrix);
                        matrix.copy(dummy.matrix);
                        needsMatrixUpdate = true;
                    }
                });
                
                // Only update the instance matrix buffer if something changed
                if (needsMatrixUpdate) {
                    this.instancedMeshes.likeButtons.instanceMatrix.needsUpdate = true;
                }
            }
        }
    }
    
    // Monitor FPS for auto-balancing
    monitorFps() {
        const now = performance.now();
        
        // Calculate instantaneous FPS
        if (this.lastFrameTime > 0) {
            const instantFps = 1000 / (now - this.lastFrameTime);
            this.fpsHistory.push(instantFps);
            
            // Keep history limited to last 60 frames
            if (this.fpsHistory.length > 60) {
                this.fpsHistory.shift();
            }
        }
        
        this.lastFrameTime = now;
        
        // Update average FPS periodically
        if (now - this.lastFpsUpdate > this.fpsUpdateInterval && this.fpsHistory.length > 10) {
            // Calculate average FPS from history
            const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
            this.currentFps = sum / this.fpsHistory.length;
            
            // Reset for next update
            this.lastFpsUpdate = now;
            
            // Log FPS occasionally for debugging
            if (this.frameCounter % 300 === 0) {
                console.log(`[PortalManager] Current FPS: ${this.currentFps.toFixed(1)}, Max visibility distance: ${this.maxVisibilityDistance.toFixed(1)}`);
            }
        }
    }
    
    // Auto-balance visibility distance based on current FPS
    autoBalanceVisibilityDistance() {
        if (!this.balancingEnabled || this.fpsHistory.length < 10) return;
        
        const now = performance.now();
        
        // Enforce cooldown between adjustments
        if (now - this.lastDistanceAdjustment < this.distanceAdjustmentCooldown) {
            return;
        }
        
        // Analyze current performance
        const fpsMargin = 5; // Allow some fluctuation
        const lowFpsThreshold = this.targetFps - fpsMargin;
        const highFpsThreshold = this.targetFps + fpsMargin;
        
        // Calculate average FPS over the last 10 samples for stability
        const recentFps = this.fpsHistory.slice(-10);
        const avgRecentFps = recentFps.reduce((sum, fps) => sum + fps, 0) / recentFps.length;
        
        // Track consecutive low FPS counts for detecting severely throttled environments
        this.consecutiveLowFpsCount = (avgRecentFps < this.targetFps / 2) 
            ? (this.consecutiveLowFpsCount || 0) + 1 
            : 0;
            
        // Check if we need to switch to minimal mode due to severely throttled environment
        // (FPS consistently less than 50% of target for 5+ consecutive checks)
        if (this.consecutiveLowFpsCount >= 5 && avgRecentFps < this.targetFps / 2) {
            // Switch to minimal mode if not already there
            if (this.maxVisibilityDistance > 50) {
                console.log(`[PortalManager] Severely throttled environment detected (FPS: ${avgRecentFps.toFixed(1)}), switching to minimal mode`);
                this.configurePerformance('minimal');
                this.consecutiveLowFpsCount = 0;
                return;
            }
        }
        
        // Enhance emergency mode activation for critically low FPS
        if (avgRecentFps < this.targetFps * 0.3 && !this.emergencyModeActive) {
            console.log(`[PortalManager] Critically low FPS detected (${avgRecentFps.toFixed(1)}), activating emergency mode`);
            this.enableEmergencyMode(true);
            return;
        } else if (this.emergencyModeActive && avgRecentFps > this.targetFps * 0.8) {
            console.log(`[PortalManager] FPS recovered (${avgRecentFps.toFixed(1)}), disabling emergency mode`);
            this.enableEmergencyMode(false);
        }
        
        // Determine if adjustment is needed, with less aggressive reduction
        if (this.currentFps < lowFpsThreshold) {
            // FPS is too low, reduce visibility distance less aggressively
            // Only reduce if FPS is consistently low over multiple checks
            if (this.consecutiveLowFpsCount >= 2) {
                this.maxVisibilityDistance = Math.max(
                    this.lodLevels.close * 0.8, // Ensure we don't go below 80% of close distance
                    this.maxVisibilityDistance - this.distanceAdjustmentStep * 0.5 // Reduce step size
                );
                this.lastDistanceAdjustment = now;
                this.distanceAdjustmentCooldown = 1500; // Longer cooldown for reduction
                
                console.log(`[PortalManager] Performance balancing: Reduced visibility distance to ${this.maxVisibilityDistance.toFixed(1)} (FPS: ${this.currentFps.toFixed(1)})`);
            }
        } 
        else if (this.currentFps > highFpsThreshold && this.maxVisibilityDistance < this.lodLevels.far * 2.0) {
            // FPS is high, increase visibility distance more aggressively up to 200% of base far distance
            this.maxVisibilityDistance = Math.min(
                this.lodLevels.far * 2.0,
                this.maxVisibilityDistance + this.distanceAdjustmentStep
            );
            this.lastDistanceAdjustment = now;
            this.distanceAdjustmentCooldown = 1000; // Shorter cooldown for increases to recover faster
            
            console.log(`[PortalManager] Performance balancing: Increased visibility distance to ${this.maxVisibilityDistance.toFixed(1)} (FPS: ${this.currentFps.toFixed(1)})`);
        }
    }
    
    dispose() {
        // Clean up portals
        this.removeAllPortals();
        
        // Clean up UI groups and their contents
        Object.values(this.uiGroups).forEach(group => {
            // Remove from scene
            this.scene.remove(group);
            
            // Dispose of geometries and materials for all children
            group.traverse(child => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            
            // Clear the group
            while (group.children.length > 0) {
                group.remove(group.children[0]);
            }
        });
        
        // Clear all Map collections
        if (this.portalLikeButtons) this.portalLikeButtons.clear();
        if (this.likeButtonMeshes) this.likeButtonMeshes.clear();
        if (this.likeTextMeshes) this.likeTextMeshes.clear();
        if (this.portalLikes) this.portalLikes.clear();
        if (this.portalTextures) this.portalTextures.clear();
        
        // Clear Set collections
        if (this.likedPortals) this.likedPortals.clear();
        
        // Dispose of shared resources
        if (this.sharedResources) {
            Object.values(this.sharedResources.geometries).forEach(geometry => {
                if (geometry) geometry.dispose();
            });
            
            Object.values(this.sharedResources.materials).forEach(material => {
                if (material) material.dispose();
            });
            
            // Dispose of cached textures
            if (this.sharedResources.textTextureCache) {
                this.sharedResources.textTextureCache.forEach(texture => {
                    if (texture) texture.dispose();
                });
                this.sharedResources.textTextureCache.clear();
            }
        }
        
        // Dispose of shared low detail materials
        if (this.sharedLowDetailMaterials) {
            Object.values(this.sharedLowDetailMaterials).forEach(material => {
                if (material) material.dispose();
            });
            this.sharedLowDetailMaterials = {};
        }
        
        // Remove event listeners
        if (typeof window !== 'undefined') {
            window.removeEventListener('mousemove', this.onMouseMove.bind(this));
            window.removeEventListener('click', this.onMouseClick.bind(this));
            
            // Remove touch event listeners
            window.removeEventListener('touchstart', this.onTouchStart.bind(this));
            window.removeEventListener('touchmove', this.onTouchMove.bind(this));
            window.removeEventListener('touchend', this.onTouchEnd.bind(this));
        }
    }

    async initializeDefaultPortals() {
        console.log('[PortalManager] Starting default portals initialization');
        console.log('[PortalManager] Current scene children count:', this.scene.children.length);
        
        // Check URL parameters for portal flag and performance mode
        const urlParams = new URLSearchParams(window.location.search);
        const showEnterPortal = urlParams.get('portal') === 'true';
        const performanceMode = urlParams.get('performance') || 'auto';
        
        console.log('[PortalManager] URL parameters:', {
            portal: urlParams.get('portal'),
            showEnterPortal,
            performanceMode,
            ref: urlParams.get('ref')
        });
        
        // Adjust LOD distances based on performance mode
        this.configurePerformance(performanceMode);
        
        // Check for explicit performance override settings in URL
        if (urlParams.get('ultra-low') === 'true' && performanceMode === 'auto') {
            console.log('[PortalManager] Ultra-low mode explicitly requested via URL parameter');
            this.configurePerformance('ultra-low');
        }
        else if (urlParams.get('minimal') === 'true') {
            console.log('[PortalManager] Minimal mode explicitly requested via URL parameter');
            this.configurePerformance('minimal');
        }
        
        // Portal configurations (existing configurations)
        console.log('[PortalManager] Creating portal configurations, showEnterPortal:', showEnterPortal);
        const defaultPortals = [
            // WATER GROUP - Portals near or on water
            {
                position: new THREE.Vector3(-3, 0, 6),
                rotation: new THREE.Euler(0, -.31*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/tidefall",
                portalId: "tidefall",
                title: "Tidefall",
                description: "Portal in misc area",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(6, 0, 17),
                rotation: new THREE.Euler(0, -.16*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/vibe-sail",
                portalId: "vibe-sail",
                title: "Vibe Sailing",
                description: "Portal in misc area",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(18, -.2*Math.PI, 20),
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/jet-ski",
                portalId: "jet-ski",
                title: "Jet Ski",
                description: "Portal floating on the water",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(33, 0, 18),
                rotation: new THREE.Euler(0, .1*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/yacht-world",
                portalId: "vibe-racer",
                title: "Vibe Racer",
                description: "Portal near the water",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(47, 0, 12),
                rotation: new THREE.Euler(0, .15*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/yacht-world",
                portalId: "yacht-world",
                title: "Yacht World",
                description: "Portal in misc area",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(62, 0, 2),
                rotation: new THREE.Euler(0, .2*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/viberates",
                portalId: "viberates",
                title: "Viberates",
                description: "Portal in misc area",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            // BACK ROW GROUP (z=40)
            {
                position: new THREE.Vector3(25, 0, 40),
                rotation: new THREE.Euler(0, Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/rokos-rebellion",
                portalId: "rokos-rebellion",
                title: "Rokos Rebellion",
                description: "First portal in airport row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(40, 0, 40),
                rotation: new THREE.Euler(0, Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/tronl",
                portalId: "tron",
                title: "Tron",
                description: "First portal in airport row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(55, 0, 40),
                rotation: new THREE.Euler(0, Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/vibesurvival",
                portalId: "vibesurvival",
                title: "Survival",
                description: "First portal in airport row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: true
            },
            {
                position: new THREE.Vector3(70, 0, 40),
                rotation: new THREE.Euler(0, Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/auto-boss",
                portalId: "auto-boss",
                title: "Auto Boss",
                description: "First portal in airport row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: true
            },
            {
                position: new THREE.Vector3(85, 0, 40),
                rotation: new THREE.Euler(0, Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/roostervibes",
                portalId: "roostervibes",
                title: "Rooster Vibes",
                description: "First portal in airport row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(100, 0, 40),
                rotation: new THREE.Euler(0, Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/neon-trailblazer",
                portalId: "neon-trailblazer",
                title: "Neon Trailblazer",
                description: "Last portal in airport row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(115, 0, 40),
                rotation: new THREE.Euler(0, Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/ronansrun",
                portalId: "ronansrun",
                title: "Ronan's Run",
                description: "Portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(80, 0, 20),
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/red-panda-vibes",
                portalId: "red-panda-vibes",
                title: "Red Panda Vibes",
                description: "Portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: true
            },
            {
                position: new THREE.Vector3(95, 0, 20),
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/quack",
                portalId: "quack",
                title: "Quack",
                description: "Portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(110, 0, 20),
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/snowbrawl-world",
                portalId: "snowbrawl-world",
                title: "Snowbrawl",
                description: "Portal in the back row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(125, 0, 20),
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/spacerunner",
                portalId: "spacerunner",
                title: "Space Runner ",
                description: "Portal in the back row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },

            //row behind the front row
            //row behind the front row
            {
                position: new THREE.Vector3(80, 0, 5),
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/kart-fight",
                portalId: "kart-fight",
                title: "Kart Fight",
                description: "Portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: true
            },
            {
                position: new THREE.Vector3(95, 0, 5), // 15 units offset respecting rotation
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/swarm-vibe",
                portalId: "swarm-vibe",
                title: "Swarm Vibes",
                description: "Portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(110, 0, 5), // 15 units offset respecting rotation
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/cyber-vibe",
                portalId: "cyber-vibe",
                title: "Cyber Vibes",
                description: "Portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(125, 0, 5), // 15 units offset respecting rotation
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/getitspinning",
                portalId: "getitspinning",
                title: "Get It Spinning",
                description: "Portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(140, 0, 5), // 15 units offset respecting rotation
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/vibe-assault",
                portalId: "vibe-assault",
                title: "Vibe Assault",
                description: "Portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(155, 0, 5), // 15 units offset respecting rotation
                rotation: new THREE.Euler(0, 0, 0),
                destination: "",
                portalId: "",
                title: "",
                description: "",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(170, 0, 5), // 15 units offset respecting rotation
                rotation: new THREE.Euler(0, 0, 0),
                destination: "",
                portalId: "",
                title: "",
                description: "",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(185, 0, 5), // 15 units offset respecting rotation
                rotation: new THREE.Euler(0, 0, 0),
                destination: "",
                portalId: "",
                title: "",
                description: "",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: false,
                avatarTeleport: false
            },





            // Airport runways
            {
                position: new THREE.Vector3(-15, 0, -4),
                rotation: new THREE.Euler(0, -.2*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/fly-pieter",
                portalId: "fly-pieter",
                title: "Fly Pieter",
                description: "Portal in the front row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },
            {
                position: new THREE.Vector3(-28, 0, 28),
                rotation: new THREE.Euler(0, (-.2*Math.PI) + Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/ww2-dogfight",
                portalId: "ww2-dogfight",
                title: "WW2 Dogfight",
                description: "Portal in the front row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },

            // Special Location Portals
            {
                position: new THREE.Vector3(-16, 0, 52),
                rotation: new THREE.Euler(0, Math.PI/2, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/foodvibers",
                portalId: "foodvibers",
                title: "Food Vibers",
                description: "Center portal in airport row",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: false
            },

            // Special "Enter" portal - only shown if portal=true in URL
            ...(showEnterPortal ? [{
                position: new THREE.Vector3(0, 0, 70),
                rotation: new THREE.Euler(0, 0, 0),
                destination: urlParams.get('ref') || "https://thevibemetaverse.vercel.app/api/portal/enter",
                portalId: "enter",
                title: "Enter Portal",
                description: "Special portal behind the user",
                modelPath: '/assets/models/portal/portal-new.gltf',
                multiplayer: true,
                avatarTeleport: true
            }] : []),
        ];
        
        console.log('[PortalManager] Portal configurations created:', {
            totalPortals: defaultPortals.length,
            hasEnterPortal: defaultPortals.some(p => p.portalId === 'enter'),
            portalIds: defaultPortals.map(p => p.portalId)
        });
        
        // Update all portal destinations to use their own IDs
        defaultPortals.forEach(portal => {
            if (portal.portalId !== 'enter') {
                portal.destination = `https://thevibemetaverse.vercel.app/api/portal/${portal.portalId}`;
            }
        });
        
        console.log('[PortalManager] Starting to add portals to scene using instancing');
        try {
            // Use the new instancing method to create all portals at once
            this.portals = await Portal.createPortalInstances(this.scene, defaultPortals, this.loadingManager);
            
            console.log(`[PortalManager] Successfully created ${this.portals.length} portal instances`);
            
            // Create UI elements in batches to improve performance
            console.log('[PortalManager] Creating UI elements for portals');
            
            // Process portals in batches to avoid frame freezes
            const batchSize = 5;
            for (let i = 0; i < this.portals.length; i += batchSize) {
                const batch = this.portals.slice(i, i + batchSize);
                
                // Process this batch
                batch.forEach((portal, index) => {
                    const globalIndex = i + index;
                    // Assign instance indices for UI elements
                    this.instancedMeshes.buttonMapping.set(portal.portalId, globalIndex);
                    
                    // Create individual meshes for nameplates and info signs
                    const { nameMesh, infoMesh } = this.createPortalName(portal);
                    
                    // Initialize like count
                    if (!this.portalLikes.has(portal.portalId)) {
                        this.portalLikes.set(portal.portalId, 0);
                    }
                    
                    // Apply config override if exists
                    if (config.portals && config.portals.initialLikes && config.portals.initialLikes[portal.portalId]) {
                        this.portalLikes.set(portal.portalId, config.portals.initialLikes[portal.portalId]);
                    }
                    
                    // Update button text with initial count
                    this.updateLikeButtonText(portal.portalId);
                    
                    // Update texture with placeholder first to prevent flickering
                    console.log(`[PortalManager] Setting placeholder texture for portal ${portal.portalId}`);
                    ['Material.002', 'Cube002_3'].forEach(materialName => {
                        portal.updateTexture(materialName, '/assets/images/placeholder.png');
                    });
                    
                    // Then load the actual texture after a delay
                    setTimeout(() => {
                        console.log(`[PortalManager] Updating texture for portal ${portal.portalId}`);
                        let portalImageUrl;
                        if (portal.portalId === 'enter') {
                            portalImageUrl = '/assets/images/portal.jpg';  // Use absolute path to assets directory
                        } else {
                            // Use the portal-specific image with timestamp AND random number to guarantee uniqueness
                            const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 10);
                            portalImageUrl = `https://thevibemetaverse.vercel.app/assets/images/${portal.portalId}.png?uid=${uniqueId}`;
                        }
                        
                        console.log(`[PortalManager] Setting texture for ${portal.portalId} to:`, portalImageUrl);
                        
                        // Try both material names that might exist in the model
                        ['Material.002', 'Cube002_3'].forEach(materialName => {
                            portal.updateTexture(materialName, portalImageUrl);
                        });
                    }, 500 + Math.floor(Math.random() * 100)); // Increased delay to ensure placeholder is shown first
                });
                
                // Allow UI to update between batches on heavy loads
                if (i + batchSize < this.portals.length) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            
            // Initial visibility update
            this.updateLODVisibility();
            
            console.log('[PortalManager] Portal UI creation complete');
        } catch (error) {
            console.error('[PortalManager] Error creating instanced portals:', error);
            
            // Fallback to individual portal creation (keep existing fallback code)
            // ...
        }
    }
    
    // Configure performance settings based on mode
    configurePerformance(mode) {
        // Default values for LOD distances
        let close = 100;
        let medium = 200; 
        let far = 300;
        
        // Default portal render budget
        let highDetailBudget = 10;  // Number of high-detail portals
        let mediumDetailBudget = 20; // Number of medium-detail portals
        let totalVisibleBudget = 30; // Total visible portals
        
        // Default auto-balancing settings
        let enableAutoBalancing = true;
        let targetFramerate = 60;
        let initialMaxDistance = far;
        
        // Default texture atlas settings
        let useTextureAtlas = true;
        let atlasSize = 2048;
        let maxTexturesPerAtlas = 16;
        
        // Ultra-low emergency mode settings
        let emergencyModeSettings = {
            portalLimit: 5,
            disableAnimations: true,
            disableUI: true,
            updateFrequency: 5,
            throttleFactor: 0.6  // How much to reduce LOD distances in emergency
        };
        
        // Adjust based on specified mode
        switch(mode) {
            case 'high':
                // High-quality mode - see UI elements from further away and render more portals
                close = 150;
                medium = 250;
                far = 350;
                highDetailBudget = 15;
                mediumDetailBudget = 25;
                totalVisibleBudget = 40;
                targetFramerate = 55; // Slightly lower target for high quality
                initialMaxDistance = far * 1.2;
                break;
            
            case 'low':
                // Low-quality mode - reduce visible UI for better performance
                close = 60;
                medium = 120;
                far = 200;
                highDetailBudget = 8;
                mediumDetailBudget = 16;
                totalVisibleBudget = 25;
                targetFramerate = 60;
                initialMaxDistance = far * 0.9;
                break;
                
            case 'ultra-low':
                // Ultra-low quality mode for extremely limited devices
                close = 30;  // Extremely short visibility for high detail
                medium = 60; // Very limited medium detail range
                far = 100;   // Severely reduced overall visibility 
                highDetailBudget = 5;   // Minimal high-detail portals
                mediumDetailBudget = 10; // Very few medium-detail portals
                totalVisibleBudget = 15; // Drastically reduced total visible portals
                targetFramerate = 30;    // Target lower framerate to reduce CPU usage
                initialMaxDistance = far * 0.8; // Start with even lower visibility
                break;
                
            case 'minimal':
                // Absolute minimum settings for severely throttled environments
                close = 15;   // Extremely limited visibility for high detail
                medium = 45;  // Very short medium detail range
                far = 75;     // Drastically reduced overall visibility
                highDetailBudget = 3;    // Bare minimum high-detail portals
                mediumDetailBudget = 5;  // Very few medium-detail portals
                totalVisibleBudget = 8;  // Extremely limited total visible portals
                targetFramerate = 25;    // Very low target framerate
                initialMaxDistance = far; // Start at base visibility (already very limited)
                atlasSize = 1024;  // Smallest atlas size
                maxTexturesPerAtlas = 4; // Fewer textures per atlas
                
                // More aggressive emergency mode settings
                emergencyModeSettings = {
                    portalLimit: 3,        // Extremely limited portals in emergency mode
                    disableAnimations: true,
                    disableUI: true,        
                    updateFrequency: 10,   // Very infrequent updates
                    throttleFactor: 0.5    // Reduce distances by 50% in emergency
                };
                break;
                
            case 'no-auto-balance':
                // Use medium quality but disable auto-balancing
                close = 100;
                medium = 200;
                far = 300;
                highDetailBudget = 10;
                mediumDetailBudget = 20;
                totalVisibleBudget = 30;
                enableAutoBalancing = false;
                break;
            
            case 'auto':
            default:
                // Auto mode - detect device capabilities
                // Check for mobile or low-memory device
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    typeof navigator !== 'undefined' ? navigator.userAgent : ''
                );
                
                if (isMobile) {
                    // Use less conservative settings for modern mobile devices
                    close = 80;    // Increased from 60
                    medium = 160;  // Increased from 120
                    far = 240;     // Increased from 200
                    highDetailBudget = 8;   // Increased from 6
                    mediumDetailBudget = 16; // Increased from 12
                    totalVisibleBudget = 25; // Increased from 20
                    targetFramerate = 50;   // Adjusted target for modern mobile devices
                    initialMaxDistance = far * 0.9; // Slightly more aggressive start
                    
                    // Try to detect if it's a low-end mobile device
                    if (navigator && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
                        // Use low settings for low-end devices
                        close = 50;   // Adjusted from 40
                        medium = 100; // Adjusted from 80
                        far = 150;    // Adjusted from 120
                        highDetailBudget = 6;   // Increased from 4
                        mediumDetailBudget = 12; // Increased from 8
                        totalVisibleBudget = 20; // Increased from 15
                        targetFramerate = 40;   // Adjusted for low-end devices
                        initialMaxDistance = far * 0.8;
                        
                        // Check for extremely low-resource devices
                        if (navigator.deviceMemory && navigator.deviceMemory <= 2) {
                            // Use ultra-low settings for extremely limited devices
                            close = 40;   // Adjusted from 30
                            medium = 80;  // Adjusted from 60
                            far = 120;    // Adjusted from 100
                            highDetailBudget = 5;
                            mediumDetailBudget = 10;
                            totalVisibleBudget = 15;
                            targetFramerate = 30;
                            initialMaxDistance = far * 0.7;
                        }
                        // For devices that don't support deviceMemory API (like older Android)
                        else {
                            // Check for specific device models known to have performance issues
                            const userAgent = navigator.userAgent;
                            const isLowEndAndroid = /Android [2-5]/.test(userAgent) || 
                                                   /SM-[GT][0-9]{4}[A-Z]?/.test(userAgent) ||  // Older Samsung models
                                                   /Moto [GE]|Moto G\(/.test(userAgent);       // Older Motorola models
                            
                            if (isLowEndAndroid) {
                                // Use ultra-low settings for detected low-end Android devices
                                close = 40;   // Adjusted from 30
                                medium = 80;  // Adjusted from 60
                                far = 120;    // Adjusted from 100
                                highDetailBudget = 5;
                                mediumDetailBudget = 10;
                                totalVisibleBudget = 15;
                                targetFramerate = 30;
                                initialMaxDistance = far * 0.7;
                            }
                        }
                    }
                } else {
                    // For desktops, check GPU performance
                    if (navigator && navigator.gpu) {
                        // Modern browser with WebGPU support - likely high-end
                        close = 150;
                        medium = 250;
                        far = 350;
                        highDetailBudget = 15;
                        mediumDetailBudget = 25;
                        totalVisibleBudget = 40;
                        initialMaxDistance = far * 1.1;
                    }
                }
                break;
        }
        
        // Set the LOD levels
        this.lodLevels = { close, medium, far };
        
        // Set portal budgets
        this.portalBudgets = {
            highDetail: highDetailBudget,
            mediumDetail: mediumDetailBudget,
            totalVisible: totalVisibleBudget
        };
        
        // Configure auto-balancing
        this.balancingEnabled = enableAutoBalancing;
        this.targetFps = targetFramerate;
        this.maxVisibilityDistance = initialMaxDistance;
        this.fpsHistory = []; // Reset FPS history on reconfiguration
        
        // Adjust adjustment step size based on far distance
        this.distanceAdjustmentStep = far * 0.05; // 5% of far distance per adjustment
        
        // Store emergency mode settings
        this.emergencyModeSettings = emergencyModeSettings;
        
        // Activate emergency mode immediately if specified
        if (this.activateEmergencyMode) {
            setTimeout(() => {
                this.enableEmergencyMode(true);
            }, 100);
        }
        
        console.log(`[PortalManager] Performance configured to ${mode} mode:`, {
            lodLevels: this.lodLevels,
            portalBudgets: this.portalBudgets,
            autoBalancing: {
                enabled: this.balancingEnabled,
                targetFps: this.targetFps,
                maxVisibilityDistance: this.maxVisibilityDistance,
                adjustmentStep: this.distanceAdjustmentStep
            },
            emergencySettings: this.emergencyModeSettings
        });
    }
    
    async fetchPortalsFromAPI() {
        try {
            // This would be replaced with actual API call
            const response = await fetch('/api/portals');
            const portalData = await response.json();
            
            // Clear existing portals
            this.removeAllPortals();
            
            try {
                // Use the new instancing method to create all portals at once
                this.portals = await Portal.createPortalInstances(this.scene, portalData, this.loadingManager);
                
                console.log(`[PortalManager] Successfully created ${this.portals.length} portal instances from API`);
                
                // Create UI elements in batches to improve performance
                console.log('[PortalManager] Creating UI elements for portals from API');
                
                // Process portals in batches to avoid frame freezes
                const batchSize = 5;
                for (let i = 0; i < this.portals.length; i += batchSize) {
                    const batch = this.portals.slice(i, i + batchSize);
                    
                    // Process this batch
                    batch.forEach(portal => {
                        this.createPortalName(portal);
                        this.create3DLikeButton(portal);
                        
                        // Initialize like count
                        if (!this.portalLikes.has(portal.portalId)) {
                            this.portalLikes.set(portal.portalId, 0);
                        }
                        
                        // Apply config override if exists
                        if (config.portals && config.portals.initialLikes && config.portals.initialLikes[portal.portalId]) {
                            this.portalLikes.set(portal.portalId, config.portals.initialLikes[portal.portalId]);
                        }
                        
                        // Update button text with initial count
                        this.updateLikeButtonText(portal.portalId);
                        
                        // Update texture
                        setTimeout(() => {
                            console.log(`[PortalManager] Updating texture for portal ${portal.portalId}`);
                            // Use special fire portal image for Enter portal
                            let portalImageUrl;
                            if (portal.portalId === 'enter') {
                                portalImageUrl = '/assets/images/portal.jpg';  // Use absolute path to assets directory
                            } else {
                                // Use the portal-specific image with timestamp AND random number to guarantee uniqueness
                                const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 10);
                                portalImageUrl = `https://thevibemetaverse.vercel.app/assets/images/${portal.portalId}.png?uid=${uniqueId}`;
                            }
                            
                            console.log(`[PortalManager] Setting texture for ${portal.portalId} to:`, portalImageUrl);
                            
                            // Try both material names that might exist in the model
                            ['Material.002', 'Cube002_3'].forEach(materialName => {
                                portal.updateTexture(materialName, portalImageUrl);
                            });
                        }, 100 + Math.floor(Math.random() * 50)); // Stagger timing slightly
                    });
                    
                    // Allow UI to update between batches on heavy loads
                    if (i + batchSize < this.portals.length) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
                
                // Initial visibility update
                this.updateLODVisibility();
                
                console.log('[PortalManager] API portal UI creation complete');
                
            } catch (error) {
                console.error('[PortalManager] Error creating instanced portals from API:', error);
                
                // Fallback to individual portal creation
                const promises = portalData.map(config => this.addPortal(config));
                this.portals = await Promise.all(promises);
            }
        } catch (error) {
            console.error("Failed to fetch portals from API:", error);
            // Fallback to default portals if API fails
            await this.initializeDefaultPortals();
        }
    }
    
    removeAllPortals() {
        for (const portal of this.portals) {
            if (portal.mesh) {
                this.scene.remove(portal.mesh);
            }
        }
        this.portals = [];
    }
    
    checkCollision(playerPosition, collisionDistance = 2.0) {
        // Simple distance-based collision detection for other portals
        for (const portal of this.portals) {
            if (!portal.mesh || !portal.isActive) continue;
            
            const portalPosition = portal.mesh.position;
            const distance = playerPosition.distanceTo(portalPosition);
            
            if (distance < collisionDistance) {
                const destinationURL = portal.prepareDestinationURL(this.playerState);
                window.location.href = destinationURL;
                return portal;
            }
        }
        
        return null;
    }
    
    checkRaycastCollision(playerPosition, direction, distance = 2) {
        this.raycaster.set(playerPosition, direction.normalize());
        
        const intersects = [];
        for (const portal of this.portals) {
            if (!portal.mesh || !portal.isActive) continue;
            
            portal.mesh.traverse((child) => {
                if (child.isMesh) {
                    intersects.push(...this.raycaster.intersectObject(child));
                }
            });
        }
        
        if (intersects.length > 0 && intersects[0].distance < distance) {
            const hitObject = intersects[0].object;
            const portal = hitObject.userData.portalRef;
            const destinationURL = portal.prepareDestinationURL(this.playerState);
            window.location.href = destinationURL;
            return portal;
        }
        
        return null;
    }
    
    activatePortal(portal) {
        if (!portal) return null;
        
        // Prepare destination URL with player state
        const destinationURL = portal.prepareDestinationURL(this.playerState);
        
        // Record usage
        portal.activate();
        
        // You could implement custom transition effects here
        
        return destinationURL;
    }

    updateAllPortalTextures(materialName, texturePath) {
        console.log(`[PortalManager] Updating textures for all portals`);
        
        // Process each portal with a slight delay between them to prevent texture conflicts
        this.portals.forEach((portal, index) => {
            setTimeout(() => {
                // Use special fire portal image for Enter portal
                let portalImageUrl;
                // Generate a completely unique identifier for each texture
                const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 10) + '_' + index;
                
                if (portal.portalId === 'enter') {
                    portalImageUrl = '/assets/images/portal.jpg';  // Use absolute path to assets directory
                } else {
                    portalImageUrl = `https://thevibemetaverse.vercel.app/assets/images/${portal.portalId}.png?uid=${uniqueId}`;
                }
                
                console.log(`[PortalManager] Setting texture for ${portal.portalId} to:`, portalImageUrl);
                
                // Try both material names that might exist in the model
                ['Material.002', 'Cube002_3'].forEach(matName => {
                    portal.updateTexture(matName, portalImageUrl);
                });
            }, 50 * index); // Stagger updates to prevent race conditions
        });
    }

    createPieterPortal() {
        // Create portal group to contain all portal elements
        const portalGroup = new THREE.Group();
        // Position in line with other portals (front row)
        portalGroup.position.set(145, 0, 30); // Position after the last portal in the front row
        portalGroup.rotation.y = .5*Math.PI;
        
        // Create portal effect
        const portalGeometry = new THREE.TorusGeometry(7.5, 1, 16, 100);
        const portalMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        portalGroup.add(portal);
                    
        // Create portal inner surface
        const portalInnerGeometry = new THREE.CircleGeometry(6.5, 32);
        const portalInnerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const portalInner = new THREE.Mesh(portalInnerGeometry, portalInnerMaterial);
        portalGroup.add(portalInner);

        // Create particle system for portal effect
        const particleCount = 500;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            // Create particles in a ring around the portal
            const angle = Math.random() * Math.PI * 2;
            const radius = 7.5 + (Math.random() - 0.5) * 2;
            positions[i] = Math.cos(angle) * radius;
            positions[i + 1] = Math.sin(angle) * radius;
            positions[i + 2] = (Math.random() - 0.5) * 2;

            // Green color with slight variation
            colors[i] = 0; // red
            colors[i + 1] = 0.8 + Math.random() * 0.2; // green
            colors[i + 2] = 0; // blue
        }

        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });

        const particleSystem = new THREE.Points(particles, particleMaterial);
        portalGroup.add(particleSystem);
        
        // Create a like button for this portal too
        const portalConfig = {
            position: portalGroup.position,
            portalId: "pieter-portal",
            title: "Pieter Portal",
            description: "Special green portal"
        };
        
        // Add a simple Portal object to our portals array
        const pieterPortal = {
            position: portalGroup.position,
            rotation: portalGroup.rotation,
            portalId: "pieter-portal",
            title: "Pieter Portal",
            description: "Special green portal",
            mesh: portalGroup,
            isActive: true,
            prepare: () => {},
            update: () => {},
            prepareDestinationURL: (playerState) => {
                return "https://thevibemetaverse.vercel.app/api/portal/pieter-portal";
            },
            activate: () => {
                return "https://thevibemetaverse.vercel.app/api/portal/pieter-portal";
            }
        };
        
        // Add portal to tracking
        this.portals.push(pieterPortal);
        
        // Create like button for this portal
        this.create3DLikeButton(pieterPortal);
        
        // Initialize like count (default to 0)
        if (!this.portalLikes.has("pieter-portal")) {
            this.portalLikes.set("pieter-portal", 0);
        }
        
        // Apply config override if exists
        if (config.portals && config.portals.initialLikes && config.portals.initialLikes["pieter-portal"]) {
            this.portalLikes.set("pieter-portal", config.portals.initialLikes["pieter-portal"]);
        }
        
        // Update the button text
        this.updateLikeButtonText("pieter-portal");
        this.updateLikeButtonAppearance("pieter-portal");

        // Add portal group to scene
        this.scene.add(portalGroup);

        // Create portal collision box
        const portalBox = new THREE.Box3().setFromObject(portalGroup);

        // Animate particles and portal
        const animatePortal = () => {
            const positions = particles.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
            }
            particles.attributes.position.needsUpdate = true;
            if (portalInnerMaterial.uniforms && portalInnerMaterial.uniforms.time) {
                portalInnerMaterial.uniforms.time.value = Date.now() * 0.001;
            }
            requestAnimationFrame(animatePortal);
        };
        animatePortal();

        // Store portal reference
        this.pieterPortal = {
            group: portalGroup,
            box: portalBox,
            particles: particles,
            animate: animatePortal
        };
        return portalGroup;
    }

    // New method to handle LOD-based visibility with cluster filtering
    updateLODVisibility() {
        if (!this.camera) return;
        
        // Create frustum for view-frustum culling
        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(projScreenMatrix);
        
        // Safe frustum intersection check
        const isInFrustum = (object) => {
            try {
                // Check if the object has valid geometry with a bounding sphere
                if (object.geometry && !object.geometry.boundingSphere) {
                    // Compute the bounding sphere if it doesn't exist
                    object.geometry.computeBoundingSphere();
                }
                return frustum.intersectsObject(object);
            } catch (error) {
                // Fallback to always visible if error occurs
                console.warn(`[PortalManager] Frustum check error:`, error.message);
                return true;
            }
        };
        
        // Camera position for distance checks
        const cameraPosition = this.camera.position;

        // Organize portals by distance for LOD management
        const portalItems = [];
        this.portals.forEach(portal => {
            if (!portal.mesh) return;
            
            // Calculate distance to camera
            const distance = cameraPosition.distanceTo(portal.mesh.position);
            portal.distanceFromCamera = distance;
            
            // Skip frustum checks for very close objects
            const skipFrustumCheck = distance < 40;
            
            // Apply auto-balanced distance culling - hide portals beyond the dynamic visibility distance
            if (distance > this.maxVisibilityDistance) {
                portal.mesh.visible = false;
                return;
            }
            
            // Determine visibility - either very close or in frustum
            let inView = skipFrustumCheck;
            
            // Only perform frustum check if not skipping
            if (!skipFrustumCheck) {
                // Simplified frustum check on portal mesh
                inView = isInFrustum(portal.mesh);
            }
            
            portalItems.push({
                portal,
                distance,
                inView
            });
        });
        
        // Sort portals by distance (closest first)
        portalItems.sort((a, b) => a.distance - b.distance);
        
        // Find portal clusters to reduce visual clutter
        const CLUSTER_RADIUS = 15; // Portals within this distance are considered a cluster
        const prefiltered = [];
        const clusters = [];
        
        // Group portals into clusters
        portalItems.forEach(item => {
            if (!item.inView) {
                // Skip portals outside frustum
                return;
            }
            
            // Check if this portal belongs to an existing cluster
            let foundCluster = false;
            for (const cluster of clusters) {
                const clusterPortal = cluster.portals[0];
                const portalDistance = clusterPortal.portal.mesh.position.distanceTo(item.portal.mesh.position);
                
                if (portalDistance < CLUSTER_RADIUS) {
                    // Add to existing cluster
                    cluster.portals.push(item);
                    foundCluster = true;
                    break;
                }
            }
            
            if (!foundCluster) {
                // Create a new cluster
                clusters.push({
                    portals: [item],
                    center: item.portal.mesh.position.clone(),
                    distance: item.distance
                });
            }
        });
        
        // Sort clusters by distance
        clusters.sort((a, b) => a.distance - b.distance);
        
        // Select representative portals from each cluster
        clusters.forEach(cluster => {
            // Sort portals in this cluster by distance
            cluster.portals.sort((a, b) => a.distance - b.distance);
            
            // Take at most 3 portals from each cluster, prioritizing closest ones
            const maxFromCluster = Math.min(3, cluster.portals.length);
            for (let i = 0; i < maxFromCluster; i++) {
                prefiltered.push(cluster.portals[i]);
            }
        });
        
        // Sort prefiltered portals by distance again
        prefiltered.sort((a, b) => a.distance - b.distance);
        
        // Maximum number of high-detail portals to show
        const MAX_HIGH_DETAIL = this.portalBudgets?.highDetail || 10;
        const MAX_MEDIUM_DETAIL = this.portalBudgets?.mediumDetail || 20;
        const MAX_TOTAL_VISIBLE = this.portalBudgets?.totalVisible || 30;
        
        // Count of portals at each detail level
        let highDetailCount = 0;
        let mediumDetailCount = 0;
        let lowDetailCount = 0;
        
        // Hide all portals first
        this.portals.forEach(portal => {
            if (portal.mesh) {
                portal.mesh.visible = false;
            }
        });
        
        // Apply detail levels based on distance and budget
        prefiltered.forEach((item, index) => {
            const { portal, distance, inView } = item;
            
            // Skip portals beyond the dynamic max visibility distance
            if (distance > this.maxVisibilityDistance) {
                return;
            }
            
            // Make portal visible since it's in view and survived prefiltering
            portal.mesh.visible = true;
            
            // Apply detail level based on distance and budget
            if (distance <= this.lodLevels.close && highDetailCount < MAX_HIGH_DETAIL) {
                // High detail mode - full shader effects, UI, animations
                this.setPortalDetailLevel(portal, 'high');
                highDetailCount++;
            } else if (distance <= this.lodLevels.medium && mediumDetailCount < MAX_MEDIUM_DETAIL) {
                // Medium detail - simplified effects, basic UI
                this.setPortalDetailLevel(portal, 'medium');
                mediumDetailCount++;
            } else if ((highDetailCount + mediumDetailCount + lowDetailCount) < MAX_TOTAL_VISIBLE) {
                // Low detail - minimal effects, no UI
                this.setPortalDetailLevel(portal, 'low');
                lowDetailCount++;
            } else {
                // Beyond our render budget - hide completely
                portal.mesh.visible = false;
            }
        });
        
        // Update UI groups visibility based on distance and frustum
        // 1. Like buttons
        this.uiGroups.likeButtons.children.forEach(buttonGroup => {
            if (!buttonGroup.userData || !buttonGroup.userData.portalId) return;
            
            // Find the portal this button belongs to
            const portal = this.portals.find(p => p.portalId === buttonGroup.userData.portalId);
            if (!portal || !portal.mesh.visible) {
                // If portal is hidden, hide the button
                buttonGroup.visible = false;
                return;
            }
            
            // Calculate distance to camera
            const distance = cameraPosition.distanceTo(buttonGroup.position);
            buttonGroup.userData.distanceFromCamera = distance;
            
            // Apply dynamic visibility distance cutoff to UI elements
            if (distance > this.maxVisibilityDistance * 0.7) { // UI disappears at 70% of max portal distance
                buttonGroup.visible = false;
                return;
            }
            
            // Skip frustum checks for very close objects
            const skipFrustumCheck = distance < 40;
            
            // Determine visibility - either very close or in frustum
            let inView = skipFrustumCheck;
            
            // Only perform frustum check if not skipping and object has children
            if (!skipFrustumCheck && buttonGroup.children.length > 0) {
                // Check at least one child is in frustum
                inView = buttonGroup.children.some(child => isInFrustum(child));
            }
            
            // Set visibility based on LOD levels
            if (distance > this.lodLevels.far || (!inView && !skipFrustumCheck)) {
                // Too far or outside view - hide completely
                buttonGroup.visible = false;
            } else {
                // Within visible range
                buttonGroup.visible = distance <= this.lodLevels.medium;
                
                // Optimize update frequency based on distance
                if (distance > this.lodLevels.medium / 2) {
                    // Update rotation less frequently for distant buttons
                    buttonGroup.userData.skipFrames = (buttonGroup.userData.skipFrames || 0) + 1;
                    buttonGroup.userData.skipUpdate = buttonGroup.userData.skipFrames % 4 !== 0;
                } else {
                    // Close enough for every-frame updates
                    buttonGroup.userData.skipUpdate = false;
                }
            }
        });
        
        // 2. Name plates - simplify to distance checks only to avoid frustum issues
        this.uiGroups.nameplates.children.forEach(nameMesh => {
            if (!nameMesh.userData || !nameMesh.userData.portalId) return;
            
            // Find the portal this nameplate belongs to
            const portal = this.portals.find(p => p.portalId === nameMesh.userData.portalId);
            if (!portal || !portal.mesh.visible) {
                // If portal is hidden, hide the nameplate
                nameMesh.visible = false;
                return;
            }
            
            // Calculate distance to camera
            const distance = cameraPosition.distanceTo(nameMesh.position);
            
            // Apply dynamic visibility distance cutoff to nameplates (disappear earlier than portals)
            if (distance > this.maxVisibilityDistance * 0.6) { // Nameplates disappear at 60% of max portal distance
                nameMesh.visible = false;
                return;
            }
            
            // Show nameplates only for close and medium detail portals
            nameMesh.visible = distance <= this.lodLevels.medium;
        });
        
        // 3. Info signs - also simplify to distance checks
        this.uiGroups.infoSigns.children.forEach(infoMesh => {
            if (!infoMesh.userData || !infoMesh.userData.portalId) return;
            
            // Find the portal this info sign belongs to
            const portal = this.portals.find(p => p.portalId === infoMesh.userData.portalId);
            if (!portal || !portal.mesh.visible) {
                // If portal is hidden, hide the info sign
                infoMesh.visible = false;
                return;
            }
            
            // Calculate distance to camera
            const distance = cameraPosition.distanceTo(infoMesh.position);
            
            // Apply dynamic visibility distance cutoff to info signs (disappear very early)
            if (distance > this.maxVisibilityDistance * 0.5) { // Info signs disappear at 50% of max portal distance
                infoMesh.visible = false;
                return;
            }
            
            // Show info signs only for close detail portals
            infoMesh.visible = distance <= this.lodLevels.close;
        });
        
        // Store statistics for logging
        this._lastClusterCount = clusters.length;
        this._lastFilteredOutCount = portalItems.filter(item => item.inView).length - prefiltered.length;
        
        // Schedule progressive texture loading for visible portals that need textures
        if (this.frameCounter % 30 === 0) { // Only check every 30 frames to avoid overhead
            this.scheduleProgressiveTextureLoading();
        }
    }
    
    // New method to set portal detail level
    setPortalDetailLevel(portal, level) {
        if (!portal || !portal.mesh) return;
        
        // Check if the detail level is changing
        if (portal.currentDetailLevel === level) {
            return; // Skip if there's no change in detail level
        }
        
        // Store the new detail level
        portal.currentDetailLevel = level;
        
        // Skip texture updates for portals that aren't visible
        const isNewlyVisible = (!portal.lastVisibleTime && level !== 'hidden');
        if (isNewlyVisible) {
            portal.lastVisibleTime = performance.now();
        }
        
        // Apply different settings based on detail level
        switch (level) {
            case 'high':
                // Full detail - everything enabled
                portal.mesh.traverse(child => {
                    if (child.isMesh) {
                        child.visible = true;
                        child.frustumCulled = true; // Enable frustum culling for all objects
                        
                        // Restore original material if it was replaced
                        if (child.userData.originalMaterial) {
                            child.material = child.userData.originalMaterial;
                            delete child.userData.originalMaterial;
                        }
                        
                        // Enable full shader effects
                        if (child.material && child.material instanceof THREE.ShaderMaterial) {
                            // Only update if not already using the right shader
                            const needsShaderUpdate = 
                                (portal.isMobile && child.material.vertexShader !== simplifiedVertexShader) ||
                                (!portal.isMobile && child.material.vertexShader !== rippleVertexShader);
                                
                            if (needsShaderUpdate) {
                                // Use full quality shaders
                                if (portal.isMobile) {
                                    child.material.vertexShader = simplifiedVertexShader;
                                    child.material.fragmentShader = simplifiedFragmentShader;
                                } else {
                                    child.material.vertexShader = rippleVertexShader;
                                    child.material.fragmentShader = rippleFragmentShader;
                                }
                                child.material.needsUpdate = true;
                            }
                        }
                    }
                });
                break;
                
            case 'medium':
                // Medium detail - simplified effects
                portal.mesh.traverse(child => {
                    if (child.isMesh) {
                        child.visible = true;
                        child.frustumCulled = true; // Enable frustum culling
                        
                        // Check if we need to delay texture loading
                        if (isNewlyVisible && child.material instanceof THREE.ShaderMaterial) {
                            // If this portal just became visible, prioritize rendering first
                            // and delay full texture loading slightly for better perceived performance
                            setTimeout(() => {
                                // Restore original material if it was replaced
                                if (child.userData.originalMaterial) {
                                    child.material = child.userData.originalMaterial;
                                    delete child.userData.originalMaterial;
                                }
                                
                                // Apply simplified shaders
                                if (child.material instanceof THREE.ShaderMaterial) {
                                    child.material.vertexShader = simplifiedVertexShader;
                                    child.material.fragmentShader = simplifiedFragmentShader;
                                    child.material.needsUpdate = true;
                                }
                            }, 100); // Short delay to prevent frame drops
                        } else {
                            // Restore original material if it was replaced
                            if (child.userData.originalMaterial) {
                                child.material = child.userData.originalMaterial;
                                delete child.userData.originalMaterial;
                            }
                            
                            // Simplify shader effects
                            if (child.material && child.material instanceof THREE.ShaderMaterial) {
                                // Use simplified shaders for medium distance
                                child.material.vertexShader = simplifiedVertexShader;
                                child.material.fragmentShader = simplifiedFragmentShader;
                                child.material.needsUpdate = true;
                            }
                        }
                    }
                });
                break;
                
            case 'low':
                // Low detail - minimal rendering with extremely optimized draw calls
                
                // Initialize shared materials if not already done
                if (!this.sharedLowDetailMaterials) {
                    this.sharedLowDetailMaterials = {};
                }
                
                portal.mesh.traverse(child => {
                    if (child.isMesh) {
                        // Enable frustum culling
                        child.frustumCulled = true;
                        
                        // Show only the main portal surface, hide decorative elements
                        if (child.material && 
                            (child.material.name === 'Material.002' || child.material.name === 'Cube002_3')) {
                            child.visible = true;
                            
                            // Use extremely simplified shader
                            if (child.material instanceof THREE.ShaderMaterial) {
                                // Store original material if not already saved
                                if (!child.userData.originalMaterial) {
                                    child.userData.originalMaterial = child.material;
                                    
                                    // Store the original texture for this portal
                                    const originalTexture = child.material.uniforms.baseTexture.value;
                                    if (originalTexture) {
                                        // Create a unique key for this portal's texture
                                        const textureKey = `texture_${portal.portalId}`;
                                        
                                        // Store this texture for later retrieval
                                        if (!this.portalTextures) {
                                            this.portalTextures = new Map();
                                        }
                                        this.portalTextures.set(textureKey, originalTexture);
                                    }
                                }
                                
                                // Create a shared material key
                                const materialKey = 'ultraSimplified_' + child.material.name;
                                let sharedMaterial = this.sharedLowDetailMaterials[materialKey];
                                
                                if (!sharedMaterial) {
                                    // Create a new shared material for this type
                                    sharedMaterial = new THREE.ShaderMaterial({
                                        uniforms: {
                                            baseTexture: { value: null },
                                            time: { value: 0 },
                                            useTextureAtlas: { value: this.useTextureAtlas },
                                            atlasTexture: { value: null },
                                            atlasOffset: { value: new THREE.Vector4(0, 0, 1, 1) }
                                        },
                                        vertexShader: ultraSimplifiedVertexShader,
                                        fragmentShader: ultraSimplifiedFragmentShader,
                                        transparent: true,
                                        side: THREE.DoubleSide
                                    });
                                    
                                    // Store for reuse
                                    this.sharedLowDetailMaterials[materialKey] = sharedMaterial;
                                }
                                
                                // Apply the shared material
                                child.material = sharedMaterial;
                                
                                // Check if using texture atlas
                                if (this.useTextureAtlas) {
                                    // Get atlas mapping for this portal
                                    const atlasMapping = this.portalTextureMap.get(portal.portalId);
                                    if (atlasMapping) {
                                        // Get atlas for this portal
                                        const atlas = this.textureAtlases[atlasMapping.atlas];
                                        if (atlas && atlas.texture) {
                                            child.material.uniforms.useTextureAtlas.value = true;
                                            child.material.uniforms.atlasTexture.value = atlas.texture;
                                            child.material.uniforms.atlasOffset.value = new THREE.Vector4(
                                                atlasMapping.coordinates.x,
                                                atlasMapping.coordinates.y,
                                                atlasMapping.coordinates.width,
                                                atlasMapping.coordinates.height
                                            );
                                        }
                                    }
                                } else {
                                    // Get the texture for this portal
                                    const textureKey = `texture_${portal.portalId}`;
                                    const texture = this.portalTextures?.get(textureKey);
                                    
                                    // Set the texture for this specific portal
                                    if (texture) {
                                        child.material.uniforms.baseTexture.value = texture;
                                    }
                                }
                            }
                        } else {
                            // Hide non-essential elements
                            child.visible = false;
                        }
                    }
                });
                break;
                
            case 'hidden':
                // Hide the portal completely but keep it in the scene graph
                portal.mesh.visible = false;
                portal.lastVisibleTime = null; // Reset visibility timestamp
                break;
                
            default:
                // Default to low detail
                this.setPortalDetailLevel(portal, 'low');
        }
    }
    
    // Add performance stats to help monitor optimizations
    logPerformanceStats() {
        // Count visible portals at each detail level
        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;
        let hiddenCount = 0;
        
        this.portals.forEach(portal => {
            if (!portal.mesh || !portal.mesh.visible) {
                hiddenCount++;
            } else if (portal.currentDetailLevel === 'high') {
                highCount++;
            } else if (portal.currentDetailLevel === 'medium') {
                mediumCount++;
            } else if (portal.currentDetailLevel === 'low') {
                lowCount++;
            }
        });
        
        // Count clusters and filtering stats
        const clusterCount = this._lastClusterCount || 0;
        const filteredOutCount = this._lastFilteredOutCount || 0;
        
        // Count visible UI elements
        let visibleButtons = 0;
        let visibleNameplates = 0;
        let visibleInfoSigns = 0;
        
        this.uiGroups.likeButtons.children.forEach(child => {
            if (child.visible) visibleButtons++;
        });
        
        this.uiGroups.nameplates.children.forEach(child => {
            if (child.visible) visibleNameplates++;
        });
        
        this.uiGroups.infoSigns.children.forEach(child => {
            if (child.visible) visibleInfoSigns++;
        });
        
        // Auto-balancing stats
        const autoBalanceStatus = this.balancingEnabled ? 'Enabled' : 'Disabled';
        
        console.log('[PortalManager] Performance stats:', {
            // Portal stats
            totalPortals: this.portals.length,
            visiblePortals: highCount + mediumCount + lowCount,
            highDetail: highCount,
            mediumDetail: mediumCount,
            lowDetail: lowCount,
            hidden: hiddenCount,
            
            // Clustering stats
            clusters: clusterCount,
            filteredOut: filteredOutCount,
            
            // UI stats
            visibleUI: {
                likeButtons: visibleButtons,
                nameplates: visibleNameplates,
                infoSigns: visibleInfoSigns
            },
            
            // Auto-balancing
            autoBalancing: {
                status: autoBalanceStatus,
                fps: this.currentFps.toFixed(1),
                targetFps: this.targetFps,
                maxVisibilityDistance: this.maxVisibilityDistance.toFixed(1),
                baseDistance: this.lodLevels.far
            }
        });
    }
    
    // Allow toggling of auto-balancing via API
    toggleAutoBalancing(enabled) {
        this.balancingEnabled = enabled !== undefined ? !!enabled : !this.balancingEnabled;
        console.log(`[PortalManager] Auto-balancing ${this.balancingEnabled ? 'enabled' : 'disabled'}`);
        
        // Reset to base visibility distance when disabling
        if (!this.balancingEnabled) {
            this.maxVisibilityDistance = this.lodLevels.far;
        }
        
        return this.balancingEnabled;
    }
    
    // Set target framerate for auto-balancing
    setTargetFramerate(fps) {
        if (typeof fps === 'number' && fps > 0) {
            this.targetFps = fps;
            console.log(`[PortalManager] Target framerate set to ${fps}`);
        }
        return this.targetFps;
    }
    
    // Manually set max visibility distance (overrides auto-balancing temporarily)
    setMaxVisibilityDistance(distance) {
        if (typeof distance === 'number' && distance > 0) {
            this.maxVisibilityDistance = distance;
            console.log(`[PortalManager] Max visibility distance set to ${distance}`);
        }
        return this.maxVisibilityDistance;
    }

    // Add a new method to create instanced meshes for UI elements
    createInstancedUIElements() {
        console.log('[PortalManager] Setting up instanced UI elements');
        
        const portalCount = this.portals.length;
        if (portalCount === 0) return;
        
        try {
            // Create instanced mesh for like buttons
            // First, create a template geometry for the like button
            const buttonGeometry = new THREE.SphereGeometry(1, 16, 16);
            const buttonMaterial = new THREE.MeshPhongMaterial({
                color: 0x2196F3,
                emissive: 0x2196F3,
                emissiveIntensity: 0.5,
                specular: 0xffffff,
                shininess: 30
            });
            
            // Create an instanced mesh with enough instances for all portals
            this.instancedMeshes.likeButtons = new THREE.InstancedMesh(
                buttonGeometry,
                buttonMaterial,
                portalCount
            );
            
            // Set the initial matrices to place each button (will be updated later)
            const dummy = new THREE.Object3D();
            for (let i = 0; i < portalCount; i++) {
                dummy.position.set(0, -1000, 0); // Off-screen by default
                dummy.updateMatrix();
                this.instancedMeshes.likeButtons.setMatrixAt(i, dummy.matrix);
                
                // Store the matrix for easy updates later
                const matrix = new THREE.Matrix4().copy(dummy.matrix);
                this.instancedMeshes.likeButtonMatrices.push(matrix);
            }
            
            // Set instancedMesh to cast/receive shadows
            this.instancedMeshes.likeButtons.castShadow = true;
            this.instancedMeshes.likeButtons.receiveShadow = true;
            
            // Add to scene
            this.scene.add(this.instancedMeshes.likeButtons);
            
            console.log(`[PortalManager] Created instanced mesh for like buttons with ${portalCount} instances`);
        } catch (error) {
            console.error('[PortalManager] Error creating instanced UI elements:', error);
        }
    }

    // Add a new method for progressive texture loading
    scheduleProgressiveTextureLoading() {
        console.log('[PortalManager] Scheduling progressive texture loading');
        
        // Only load textures for portals that are visible
        const visiblePortals = this.portals.filter(portal => 
            portal.mesh && portal.mesh.visible && 
            portal.currentDetailLevel !== 'hidden');
        
        // Sort by distance (closest first)
        visiblePortals.sort((a, b) => 
            (a.distanceFromCamera || Infinity) - (b.distanceFromCamera || Infinity));
        
        // Only process a few portals each frame
        const MAX_TEXTURES_PER_FRAME = 2;
        
        // Process textures in batches over multiple frames
        let processedCount = 0;
        
        const processNextBatch = () => {
            const startIndex = processedCount;
            const endIndex = Math.min(processedCount + MAX_TEXTURES_PER_FRAME, visiblePortals.length);
            
            // Process this batch
            for (let i = startIndex; i < endIndex; i++) {
                const portal = visiblePortals[i];
                
                // Skip portals that already have textures loaded
                if (portal.texturesLoaded) continue;
                
                // Set a flag to avoid processing again
                portal.texturesLoaded = true;
                
                // Load or update textures for this portal
                setTimeout(() => {
                    console.log(`[PortalManager] Updating texture for portal ${portal.portalId}`);
                    // Use special fire portal image for Enter portal
                    let portalImageUrl;
                    if (portal.portalId === 'enter') {
                        portalImageUrl = '/assets/images/portal.jpg';  // Use absolute path to assets directory
                    } else {
                        // Use the portal-specific image with timestamp AND random number to guarantee uniqueness
                        const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 10);
                        portalImageUrl = `https://thevibemetaverse.vercel.app/assets/images/${portal.portalId}.png?uid=${uniqueId}`;
                    }
                    
                    console.log(`[PortalManager] Setting texture for ${portal.portalId} to:`, portalImageUrl);
                    
                    // Try both material names that might exist in the model
                    ['Material.002', 'Cube002_3'].forEach(materialName => {
                        portal.updateTexture(materialName, portalImageUrl);
                    });
                }, 100 + Math.floor(Math.random() * 50)); // Stagger timing slightly
            }
            
            // Update processed count
            processedCount = endIndex;
            
            // Continue with next batch if there are more portals to process
            if (processedCount < visiblePortals.length) {
                // Use rAF to spread the work across frames
                requestAnimationFrame(processNextBatch);
            } else {
                console.log(`[PortalManager] Progressive texture loading complete for ${processedCount} portals`);
            }
        };
        
        // Start processing
        requestAnimationFrame(processNextBatch);
    }

    // Add a method to generate default textures
    generateDefaultPortalTexture(portal) {
        // Create a canvas to generate texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fill with gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#2196F3');
        gradient.addColorStop(1, '#21CBF3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add portal ID as text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Display portal title or ID
        const title = portal.title || portal.portalId;
        ctx.fillText(title, canvas.width/2, canvas.height/2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        
        return texture;
    }

    // Update autoBalanceVisibilityDistance to handle shader complexity
    autoBalanceVisibilityDistance() {
        if (!this.balancingEnabled) return;
        
        // Skip balancing on some frames to reduce overhead
        this.balanceFrameCount = (this.balanceFrameCount || 0) + 1;
        if (this.balanceFrameCount % 30 !== 0) return; // Only check every 30 frames
        
        // Calculate current framerate
        const now = performance.now();
        const frameTime = now - (this.lastFrameTime || now);
        this.lastFrameTime = now;
        
        // Convert frame time to FPS
        const currentFps = 1000 / frameTime;
        
        // Update FPS history (keep last 10 samples)
        this.fpsHistory.push(currentFps);
        if (this.fpsHistory.length > 10) {
            this.fpsHistory.shift();
        }
        
        // Calculate average FPS
        const avgFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
        this.currentFps = avgFps; // Store for reporting
        
        // Calculate frametime variance to detect stuttering
        let frameTimeVariance = 0;
        if (this.fpsHistory.length > 5) {
            const meanFrameTime = 1000 / avgFps;
            frameTimeVariance = this.fpsHistory.reduce((sum, fps) => {
                const ft = 1000 / fps;
                return sum + Math.pow(ft - meanFrameTime, 2);
            }, 0) / this.fpsHistory.length;
        }
        
        // Calculate dynamic adjustment factor
        const fpsRatio = avgFps / this.targetFps;
        const adjustmentFactor = Math.min(Math.max(fpsRatio, 0.5), 2.0);
        
        // Dynamic step size based on how far we are from target
        const distanceFromTarget = Math.abs(avgFps - this.targetFps);
        const dynamicStep = this.distanceAdjustmentStep * 
                           (distanceFromTarget > 10 ? 2.0 : 
                            distanceFromTarget > 5 ? 1.0 : 0.5);
        
        // Detect extreme throttling
        const isExtremelyThrottled = avgFps < this.targetFps * 0.6 || frameTimeVariance > 1000;
        const isSeverelyThrottled = avgFps < this.targetFps * 0.4 || frameTimeVariance > 2000;
        const isCriticallyThrottled = avgFps < this.targetFps * 0.25 || frameTimeVariance > 3000;
        
        // Log extreme throttling detection
        if (isExtremelyThrottled && this.frameCounter % 300 === 0) {
            console.log(`[PortalManager] Extreme throttling detected - FPS: ${avgFps.toFixed(1)}, Variance: ${frameTimeVariance.toFixed(1)}`);
        }
        
        // Apply more aggressive settings for extremely throttled environments
        if (isCriticallyThrottled) {
            // Switch to emergency mode for critically throttled devices
            this.enableEmergencyMode(true);
        }
        else if (isSeverelyThrottled && !this.emergencyModeActive) {
            // Enable emergency mode for severely throttled devices
            this.enableEmergencyMode(true);
        } 
        // Recover gradually if performance improves
        else if (this.emergencyModeActive && avgFps > this.targetFps * 1.2 && frameTimeVariance < 800) {
            // Disable emergency mode as performance improves
            this.enableEmergencyMode(false);
        }
        
        // ... existing else if conditions ...
        
        // ... existing code ...
    }

    // New method to limit visible portals based on performance
    limitVisiblePortalsToClosest(maxVisible) {
        // Skip if there aren't enough portals
        if (!this.portals || this.portals.length <= maxVisible) return;
        
        // Sort portals by distance (closest first)
        const sortedPortals = [...this.portals].filter(p => p.mesh).sort((a, b) => 
            (a.distanceFromCamera || Infinity) - (b.distanceFromCamera || Infinity)
        );
        
        // Show only the closest portals, hide the rest
        sortedPortals.forEach((portal, index) => {
            if (index < maxVisible) {
                // Keep visible but use appropriate LOD
                if (!portal.mesh.visible) {
                    portal.mesh.visible = true;
                    this.setPortalDetailLevel(portal, 'low');
                }
            } else {
                // Hide portals beyond our limit
                portal.mesh.visible = false;
            }
        });
        
        console.log(`[PortalManager] Limited visible portals to ${maxVisible} closest`);
    }

    // New method to disable non-essential animations during emergency mode
    disableNonEssentialAnimations() {
        // Simplify like button animations
        if (this.instancedMeshes.likeButtons) {
            // Disable hover effects and pulsing
            this.disableButtonAnimations = true;
        }
        
        // Disable portal effects animation for distant portals
        this.portals.forEach(portal => {
            // Add disableEffects implementation directly inside each portal object
            if (!portal.disableEffects) {
                portal.disableEffects = (disable) => {
                    portal.effectsDisabled = disable;
                    
                    // Apply to shader uniforms if available
                    if (portal.shaderUniforms) {
                        // Keep a reference to original time if first time disabling
                        if (disable && portal.shaderUniforms.time && portal.originalTimeValue === undefined) {
                            portal.originalTimeValue = portal.shaderUniforms.time.value;
                        }
                        
                        // Freeze time value to stop animations if disabled
                        if (portal.shaderUniforms.time) {
                            if (disable) {
                                portal.shaderUniforms.time.value = portal.originalTimeValue || 0;
                            }
                        }
                    }
                    
                    // Override the update method for this specific portal instance
                    if (!portal._originalUpdate && disable) {
                        portal._originalUpdate = portal.update;
                        
                        portal.update = (deltaTime, camera) => {
                            // Skip shader updates if effects are disabled
                            if (portal.effectsDisabled) {
                                // Only update distance from camera
                                if (camera && portal.mesh) {
                                    portal.distanceFromCamera = camera.position.distanceTo(portal.mesh.position);
                                }
                                return;
                            }
                            
                            // Call original update method
                            if (portal._originalUpdate) {
                                return portal._originalUpdate(deltaTime, camera);
                            }
                        };
                    } else if (portal._originalUpdate && !disable) {
                        // Restore original update method when re-enabling effects
                        portal.update = portal._originalUpdate;
                        delete portal._originalUpdate;
                    }
                };
            }
            
            // Call the function to disable effects
            portal.disableEffects(true);
        });
    }

    // Update portal update method to respect emergency mode settings
    update(deltaTime) {
        // Monitor FPS for auto-balancing visibility distance
        this.monitorFps();
        
        // Only update LOD visibility periodically
        this.frameCounter = (this.frameCounter || 0) + 1;
        
        // Adjust update frequency based on performance mode
        const lodUpdateFrequency = this.emergencyModeActive ? 30 : 10;
        
        if (this.frameCounter % lodUpdateFrequency === 0) {
            this.updateLODVisibility();
            
            // Log stats occasionally for debugging (once every ~5 seconds)
            if (this.frameCounter % 300 === 0) {
                this.logPerformanceStats();
            }
            
            // Adjust visibility distance based on performance if enabled
            if (this.balancingEnabled && this.frameCounter % 30 === 0) {
                this.autoBalanceVisibilityDistance();
            }
        }
        
        // Check if player is hovering over a like button
        if (!this.emergencyModeActive || this.frameCounter % 3 === 0) {
            this.checkButtonHover();
        }
        
        // Determine portal update frequency based on performance mode
        const portalUpdateFrequency = this.emergencyModeActive ? 
            this.emergencyUpdateFrequency : 1;
        
        // Update portal animations with adaptive frequency
        this.portals.forEach(portal => {
            if (portal.mesh && portal.mesh.visible) {
                // For distant portals, update less frequently to save resources
                if (portal.distanceFromCamera > this.lodLevels.medium) {
                    if (this.frameCounter % (3 * portalUpdateFrequency) === 0) {
                        portal.update(deltaTime, this.camera);
                    }
                } else if (this.frameCounter % portalUpdateFrequency === 0) {
                    portal.update(deltaTime, this.camera);
                }
            }
        });
        
        // Rotate like buttons to face camera - skip in emergency mode
        if (!this.emergencyModeActive) {
            this.uiGroups.likeButtons.children.forEach(buttonGroup => {
                if (buttonGroup.visible && !buttonGroup.userData.skipUpdate) {
                    buttonGroup.lookAt(this.camera.position);
                }
            });
            
            // Removed rotation for nameplates to fix orientation issue
            // Nameplates now maintain portal orientation
        }
        
        // Update instanced UI elements efficiently
        if (this.instancedMeshes.likeButtons) {
            // Skip updates in emergency mode except occasionally
            if (this.emergencyModeActive && this.frameCounter % 5 !== 0) {
                return;
            }
            
            // Only update instance matrix if we need to
            let needsMatrixUpdate = false;
            
            // Throttle updates for instanced meshes based on performance
            if (this.frameCounter % updateFrequency === 0) {
                // Find all instances that need updating
                this.instancedMeshes.buttonMapping.forEach((instanceIndex, portalId) => {
                    // Find the portal for this instance
                    const portal = this.portals.find(p => p.portalId === portalId);
                    if (!portal || !portal.mesh) return;
                    
                    // Skip updating if beyond visibility distance
                    if (portal.distanceFromCamera > this.lodLevels.medium) {
                        return;
                    }
                    
                    // Update matrix for this instance
                    const matrix = this.instancedMeshes.likeButtonMatrices[instanceIndex];
                    const dummy = new THREE.Object3D();
                    
                    // Get position from portal
                    const position = portal.mesh.position.clone();
                    position.y += 10; // Position above portal
                    
                    dummy.position.copy(position);
                    
                    // Apply scale based on hover state - simplified in emergency mode
                    if (this.disableButtonAnimations) {
                        dummy.scale.set(1.5, 1.5, 1.5);
                    } else {
                        const isHovered = this.hoveredPortalId === portalId;
                        const baseScale = 1.5;
                        const hoverScale = 1.8;
                        const scale = isHovered ? hoverScale : baseScale;
                        
                        // Apply pulse animation to liked portals
                        const isLiked = this.likedPortals.has(portalId);
                        if (isLiked) {
                            const pulse = Math.sin(Date.now() * 0.004) * 0.1 + 1.0;
                            dummy.scale.set(
                                scale * pulse,
                                scale * pulse, 
                                scale * pulse
                            );
                        } else {
                            dummy.scale.set(scale, scale, scale);
                        }
                    }
                    
                    // Update matrix
                    dummy.updateMatrix();
                    if (!matrix.equals(dummy.matrix)) {
                        this.instancedMeshes.likeButtons.setMatrixAt(instanceIndex, dummy.matrix);
                        matrix.copy(dummy.matrix);
                        needsMatrixUpdate = true;
                    }
                });
                
                // Only update the instance matrix buffer if something changed
                if (needsMatrixUpdate) {
                    this.instancedMeshes.likeButtons.instanceMatrix.needsUpdate = true;
                }
            }
        }
    }

    // Override logPerformanceStats to include throttling information
    logPerformanceStats() {
        // Count visible portals at each detail level
        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;
        let hiddenCount = 0;
        
        this.portals.forEach(portal => {
            if (!portal.mesh || !portal.mesh.visible) {
                hiddenCount++;
            } else if (portal.currentDetailLevel === 'high') {
                highCount++;
            } else if (portal.currentDetailLevel === 'medium') {
                mediumCount++;
            } else if (portal.currentDetailLevel === 'low') {
                lowCount++;
            }
        });
        
        // Count clusters and filtering stats
        const clusterCount = this._lastClusterCount || 0;
        const filteredOutCount = this._lastFilteredOutCount || 0;
        
        // Count visible UI elements
        let visibleButtons = 0;
        let visibleNameplates = 0;
        let visibleInfoSigns = 0;
        
        this.uiGroups.likeButtons.children.forEach(child => {
            if (child.visible) visibleButtons++;
        });
        
        this.uiGroups.nameplates.children.forEach(child => {
            if (child.visible) visibleNameplates++;
        });
        
        this.uiGroups.infoSigns.children.forEach(child => {
            if (child.visible) visibleInfoSigns++;
        });
        
        // Auto-balancing stats
        const autoBalanceStatus = this.balancingEnabled ? 'Enabled' : 'Disabled';
        
        // Calculate frametime variance
        let frameTimeVariance = 0;
        if (this.fpsHistory && this.fpsHistory.length > 5) {
            const meanFrameTime = 1000 / this.currentFps;
            frameTimeVariance = this.fpsHistory.reduce((sum, fps) => {
                const ft = 1000 / fps;
                return sum + Math.pow(ft - meanFrameTime, 2);
            }, 0) / this.fpsHistory.length;
        }
        
        console.log('[PortalManager] Performance stats:', {
            // Portal stats
            totalPortals: this.portals.length,
            visiblePortals: highCount + mediumCount + lowCount,
            highDetail: highCount,
            mediumDetail: mediumCount,
            lowDetail: lowCount,
            hidden: hiddenCount,
            
            // Clustering stats
            clusters: clusterCount,
            filteredOut: filteredOutCount,
            
            // UI stats
            visibleUI: {
                likeButtons: visibleButtons,
                nameplates: visibleNameplates,
                infoSigns: visibleInfoSigns
            },
            
            // Auto-balancing
            autoBalancing: {
                status: autoBalanceStatus,
                fps: this.currentFps.toFixed(1),
                fpsVariance: frameTimeVariance.toFixed(1),
                targetFps: this.targetFps,
                maxVisibilityDistance: this.maxVisibilityDistance.toFixed(1),
                baseDistance: this.lodLevels.far,
                emergencyMode: this.emergencyModeActive || false,
                throttled: (this.lodLevelsReduced || false)
            }
        });
    }

    // Add a dedicated method to enable/disable emergency mode
    enableEmergencyMode(enable) {
        if (enable === this.emergencyModeActive) return;
        
        if (enable) {
            console.log('[PortalManager] ACTIVATING EMERGENCY MODE');
            this.emergencyModeActive = true;
            
            // Store current settings for later restoration
            this.preEmergencySettings = {
                maxVisibilityDistance: this.maxVisibilityDistance,
                targetFps: this.targetFps,
                lodLevels: { ...this.lodLevels }
            };
            
            // Apply emergency settings from config
            const settings = this.emergencyModeSettings;
            
            // Drastically reduce portal visibility
            const throttleFactor = settings.throttleFactor || 0.6;
            this.maxVisibilityDistance = Math.min(
                this.maxVisibilityDistance, 
                this.lodLevels.close * throttleFactor
            );
            
            // Reduce LOD distances if not already reduced
            if (!this.lodLevelsReduced) {
                this.originalLodLevels = { ...this.lodLevels };
                this.lodLevels.close *= throttleFactor;
                this.lodLevels.medium *= throttleFactor;
                this.lodLevels.far *= throttleFactor;
                this.lodLevelsReduced = true;
            }
            
            // Drop all portals to low detail immediately
            this.portals.forEach(portal => {
                this.setPortalDetailLevel(portal, 'low');
            });
            
            // Hide UI elements if specified
            if (settings.disableUI) {
                this.uiGroups.nameplates.visible = false;
                this.uiGroups.infoSigns.visible = false;
                
                // Only hide like buttons if using instance mesh
                if (!this.instancedMeshes.likeButtons) {
                    this.uiGroups.likeButtons.visible = false;
                }
            }
            
            // Only show closest portals
            const portalLimit = settings.portalLimit || 5;
            this.limitVisiblePortalsToClosest(portalLimit);
            
            // Throttle update frequency of portal effects
            this.emergencyUpdateFrequency = settings.updateFrequency || 5;
            
            // Cut animation complexity
            this.disableNonEssentialAnimations();
            
            // Use basic materials instead of shaders if specified
            if (settings.disableShaders) {
                this.convertShadersToBasicMaterials();
            }
            
            // Lower target FPS
            this.previousTargetFps = this.targetFps;
            this.targetFps = Math.min(this.targetFps, 30);
        } else {
            console.log('[PortalManager] Disabling emergency mode');
            this.emergencyModeActive = false;
            
            // Restore previous settings
            if (this.preEmergencySettings) {
                // Gradually restore settings
                this.targetFps = this.preEmergencySettings.targetFps;
                
                // Reset animation frequency
                this.emergencyUpdateFrequency = 1;
                
                // Gradually restore visibility distance over time
                const restoreInterval = setInterval(() => {
                    const step = Math.max(1, this.preEmergencySettings.maxVisibilityDistance * 0.1);
                    this.maxVisibilityDistance = Math.min(
                        this.preEmergencySettings.maxVisibilityDistance,
                        this.maxVisibilityDistance + step
                    );
                    
                    if (this.maxVisibilityDistance >= this.preEmergencySettings.maxVisibilityDistance * 0.95) {
                        this.maxVisibilityDistance = this.preEmergencySettings.maxVisibilityDistance;
                        clearInterval(restoreInterval);
                    }
                }, 500);
                
                // Restore UI visibility
                if (this.emergencyModeSettings.disableUI) {
                    this.uiGroups.nameplates.visible = true;
                    this.uiGroups.infoSigns.visible = true;
                    this.uiGroups.likeButtons.visible = true;
                }
            }
            
            // Restore UI visibility based on distance
            this.updateLODVisibility();
        }
        
        return this.emergencyModeActive;
    }

    // New method to convert shader materials to basic materials for ultra-low performance
    convertShadersToBasicMaterials() {
        // Create reusable basic materials
        if (!this.basicMaterials) {
            this.basicMaterials = new Map();
        }
        
        console.log('[PortalManager] Converting shaders to basic materials for performance');
        
        // Convert each portal's shader to basic material
        this.portals.forEach(portal => {
            if (!portal.mesh) return;
            
            portal.mesh.traverse(child => {
                if (child.isMesh && child.material instanceof THREE.ShaderMaterial) {
                    // Store original material if not already saved
                    if (!child.userData.originalShaderMaterial) {
                        child.userData.originalShaderMaterial = child.material;
                    }
                    
                    // Extract texture from shader uniforms
                    let texture = null;
                    if (child.material.uniforms) {
                        if (child.material.uniforms.baseTexture?.value) {
                            texture = child.material.uniforms.baseTexture.value;
                        } else if (child.material.uniforms.atlasTexture?.value) {
                            // If using texture atlas, create a new texture from the atlas region
                            const atlasTexture = child.material.uniforms.atlasTexture.value;
                            const atlasOffset = child.material.uniforms.atlasOffset?.value;
                            
                            if (atlasTexture && atlasOffset) {
                                texture = this.extractTextureFromAtlas(
                                    atlasTexture, 
                                    atlasOffset.x, atlasOffset.y, 
                                    atlasOffset.z, atlasOffset.w,
                                    portal.portalId
                                );
                            }
                        }
                    }
                    
                    // Create a material key
                    const materialKey = texture ? `basic_${texture.uuid}` : 'basic_default';
                    
                    // Reuse material if exists
                    if (this.basicMaterials.has(materialKey)) {
                        child.material = this.basicMaterials.get(materialKey);
                    } else {
                        // Create basic material with the texture
                        const basicMaterial = new THREE.MeshBasicMaterial({
                            map: texture,
                            transparent: true,
                            side: THREE.DoubleSide,
                            depthWrite: false,
                            color: texture ? 0xffffff : 0x2196F3 // Default blue if no texture
                        });
                        
                        // Store for reuse
                        this.basicMaterials.set(materialKey, basicMaterial);
                        child.material = basicMaterial;
                    }
                }
            });
        });
    }

    // Helper method to extract a portion of a texture atlas to a separate texture
    extractTextureFromAtlas(atlasTexture, x, y, width, height, portalId) {
        // Check cache first
        const cacheKey = `extracted_${portalId}`;
        if (this.basicMaterials.has(cacheKey)) {
            return this.basicMaterials.get(cacheKey);
        }
        
        try {
            // Create a canvas to extract the texture region
            const canvas = document.createElement('canvas');
            const size = 256; // Small size for performance
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            // Check if atlas texture has an image
            if (atlasTexture.image) {
                // Calculate source and destination coordinates
                const atlasSize = atlasTexture.image.width;
                const srcX = x * atlasSize;
                const srcY = y * atlasSize;
                const srcWidth = width * atlasSize;
                const srcHeight = height * atlasSize;
                
                // Draw the specific region from atlas to our canvas
                ctx.drawImage(
                    atlasTexture.image,
                    srcX, srcY, srcWidth, srcHeight,
                    0, 0, size, size
                );
                
                // Create a new texture from the canvas
                const extractedTexture = new THREE.CanvasTexture(canvas);
                extractedTexture.encoding = THREE.sRGBEncoding;
                
                // Cache the extracted texture
                this.basicMaterials.set(cacheKey, extractedTexture);
                
                return extractedTexture;
            }
        } catch (error) {
            console.error('[PortalManager] Error extracting texture from atlas:', error);
        }
        
        // Return null if extraction failed
        return null;
    }
} 
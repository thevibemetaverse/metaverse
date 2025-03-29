import * as THREE from 'three';
import { Portal } from './Portal.js';

export class PortalManager {
    constructor(scene, camera, playerState) {
        this.scene = scene;
        this.camera = camera;
        this.playerState = playerState;
        this.portals = [];
        this.loadingManager = new THREE.LoadingManager();
        this.raycaster = new THREE.Raycaster();
        
        // Cache for future API responses
        this.portalDataCache = new Map();
        
        // UI elements
        this.portalUI = null;
        this.setupPortalUI();
        
        console.log('[PortalManager] Initialized with scene, camera, and playerState');
    }
    
    setupPortalUI() {
        // Create a container for portal UI
        this.portalUI = document.createElement('div');
        this.portalUI.style.position = 'absolute';
        this.portalUI.style.top = '20px';
        this.portalUI.style.right = '20px';
        this.portalUI.style.zIndex = '1000';
        this.portalUI.style.display = 'none';
        document.body.appendChild(this.portalUI);
    }
    
    showPortalInfo(portal) {
        if (!portal) {
            this.portalUI.style.display = 'none';
            return;
        }
        
        this.portalUI.innerHTML = `
            <div style="background: rgba(0, 0, 0, 0.8); color: white; padding: 15px; border-radius: 8px; max-width: 300px;">
                <h3 style="margin: 0 0 10px 0;">${portal.title}</h3>
                <p style="margin: 0 0 15px 0;">${portal.description}</p>
                <button style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Enter Portal
                </button>
            </div>
        `;
        
        this.portalUI.style.display = 'block';
        
        // Add click handler to the button
        const button = this.portalUI.querySelector('button');
        button.addEventListener('click', () => {
            const destinationURL = portal.prepareDestinationURL(this.playerState);
            window.location.href = destinationURL;
        });
    }
    
    async addPortal(portalConfig) {
        console.log('[PortalManager] Adding portal:', portalConfig);
        const portal = new Portal(portalConfig);
        try {
            console.log('[PortalManager] Loading portal model from:', portalConfig.modelPath);
            const portalMesh = await portal.load(this.loadingManager);
            console.log('[PortalManager] Portal model loaded successfully, adding to scene');
            
            // Log scene state before adding
            console.log('[PortalManager] Scene children count before adding portal:', this.scene.children.length);
            
            // Set position and rotation explicitly
            portalMesh.position.copy(portalConfig.position);
            portalMesh.rotation.copy(portalConfig.rotation);
            
            // Log portal position after setting
            console.log(`[PortalManager] Portal ${portalConfig.portalId} position:`, portalMesh.position);
            
            this.scene.add(portalMesh);
            
            // Log scene state after adding
            console.log('[PortalManager] Scene children count after adding portal:', this.scene.children.length);
            
            this.portals.push(portal);
            
            // Update texture after a short delay to ensure the portal is fully loaded
            setTimeout(() => {
                console.log(`[PortalManager] Updating texture for portal ${portalConfig.portalId}`);
                const portalImageUrl = `https://thevibemetaverse.vercel.app/assets/images/${portalConfig.portalId}.png`;
                portal.updateTexture('Material.002', portalImageUrl);
            }, 100);
            
            console.log('[PortalManager] Portal added successfully. Total portals:', this.portals.length);
            return portal;
        } catch (error) {
            console.error("[PortalManager] Failed to add portal:", error);
            return null;
        }
    }
    
    async initializeDefaultPortals() {
        console.log('[PortalManager] Starting default portals initialization');
        console.log('[PortalManager] Current scene children count:', this.scene.children.length);
        
        // Portal configurations
        const defaultPortals = [
            // Front row - 10 portals evenly spaced, shifted 50 units right
            {
                position: new THREE.Vector3(-17.5, 0, 25),  // -67.5 + 50 = -17.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/auto-boss",
                portalId: "auto-boss",
                title: "Auto Boss Portal",
                description: "First portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(-2.5, 0, 25),   // -52.5 + 50 = -2.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/fly-pieter",
                portalId: "fly-pieter",
                title: "Fly Pieter Portal",
                description: "Second portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(12.5, 0, 25),   // -37.5 + 50 = 12.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/foodvibers",
                portalId: "foodvibers",
                title: "Food Vibers Portal",
                description: "Center portal",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(27.5, 0, 25),   // -22.5 + 50 = 27.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/jet-ski",
                portalId: "jet-ski",
                title: "Jet Ski Portal",
                description: "Fourth portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(42.5, 0, 25),   // -7.5 + 50 = 42.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/neon-trailblazer",
                portalId: "neon-trailblazer",
                title: "Neon Trailblazer Portal",
                description: "Rightmost portal in the row",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(57.5, 0, 25),   // 7.5 + 50 = 57.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/ocean-fables",
                portalId: "ocean-fables",
                title: "Ocean Fables Portal",
                description: "Portal behind the user",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(72.5, 0, 25),   // 22.5 + 50 = 72.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/portal-pieter",
                portalId: "portal-pieter",
                title: "Portal Pieter Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(87.5, 0, 25),   // 37.5 + 50 = 87.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/quack",
                portalId: "quack",
                title: "Quack Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(102.5, 0, 25),  // 52.5 + 50 = 102.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/red-panda-vibes",
                portalId: "red-panda-vibes",
                title: "Red Panda Vibes Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(117.5, 0, 25),  // 67.5 + 50 = 117.5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/ronansrun",
                portalId: "ronansrun",
                title: "Ronan's Run Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            // Back portal
            {
                position: new THREE.Vector3(0, 0, -25),
                rotation: new THREE.Euler(0, Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/roostervibes",
                portalId: "roostervibes",
                title: "Rooster Vibes Portal",
                description: "Portal behind the user",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            // Right side portals - moved closer to user (z changed from -15 to -5)
            {
                position: new THREE.Vector3(15, 0, -5),  // z changed from -15 to -5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/snowbrawl-world",
                portalId: "snowbrawl-world",
                title: "Snowbrawl World Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(30, 0, -5),  // z changed from -15 to -5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/spacerunner",
                portalId: "spacerunner",
                title: "Space Runner Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(45, 0, -5),  // z changed from -15 to -5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/thevibemetaverse",
                portalId: "thevibemetaverse",
                title: "The Vibe Metaverse Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(60, 0, -5),  // z changed from -15 to -5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/tidefall",
                portalId: "tidefall",
                title: "Tidefall Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(75, 0, -5),  // z changed from -15 to -5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/viberates",
                portalId: "viberates",
                title: "Viberates Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(90, 0, -5),  // z changed from -15 to -5
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/yacht-world",
                portalId: "yacht-world",
                title: "Yacht World Portal",
                description: "Portal in the corner",
                modelPath: '/assets/models/portal/portal-new.gltf'
            }
        ];
        
        // Update all portal destinations to use their own IDs
        defaultPortals.forEach(portal => {
            portal.destination = `https://thevibemetaverse.vercel.app/api/portal/${portal.portalId}`;
        });
        
        console.log('[PortalManager] Starting to add portals to scene');
        // Add each default portal
        const promises = defaultPortals.map(config => this.addPortal(config));
        const results = await Promise.all(promises);
        const successfulPortals = results.filter(Boolean).length;
        
        // Update textures for all portals
        this.updateAllPortalTextures('Material.002', '/assets/images/thevibemetaverse.png');
        
        console.log('[PortalManager] Portal initialization complete:', {
            totalPortals: defaultPortals.length,
            successfulPortals,
            failedPortals: defaultPortals.length - successfulPortals,
            sceneChildrenCount: this.scene.children.length,
            portalPositions: this.portals.map(p => ({
                id: p.portalId,
                position: p.mesh?.position,
                isActive: p.isActive
            }))
        });
    }
    
    async fetchPortalsFromAPI() {
        try {
            // This would be replaced with actual API call
            const response = await fetch('/api/portals');
            const portalData = await response.json();
            
            // Clear existing portals
            this.removeAllPortals();
            
            // Add portals from API
            const promises = portalData.map(config => this.addPortal(config));
            await Promise.all(promises);
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
        // Log all portal positions for debugging
        const portalState = this.portals.map(p => ({
            id: p.portalId,
            position: p.mesh?.position,
            isActive: p.isActive,
            hasMesh: !!p.mesh
        }));
        
        console.log('[PortalManager] Portal collision check:', {
            playerPosition: playerPosition.toArray(),
            collisionDistance,
            portalCount: this.portals.length,
            portalState
        });
        
        // Simple distance-based collision detection
        for (const portal of this.portals) {
            if (!portal.mesh || !portal.isActive) {
                console.log(`[PortalManager] Skipping portal ${portal.portalId}:`, {
                    hasMesh: !!portal.mesh,
                    isActive: portal.isActive
                });
                continue;
            }
            
            const portalPosition = portal.mesh.position;
            const distance = playerPosition.distanceTo(portalPosition);
            
            // Log collision check for debugging
            console.log(`[PortalManager] Checking collision with portal ${portal.portalId}:`, {
                distance,
                threshold: collisionDistance,
                playerPos: playerPosition.toArray(),
                portalPos: portalPosition.toArray(),
                isActive: portal.isActive
            });
            
            if (distance < collisionDistance) {
                console.log(`[PortalManager] Collision detected with portal ${portal.portalId}`);
                this.showPortalInfo(portal);
                return portal;
            }
        }
        
        // Hide portal UI if no collision
        this.showPortalInfo(null);
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
            this.showPortalInfo(portal);
            return portal;
        }
        
        // Hide portal UI if no collision
        this.showPortalInfo(null);
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
    
    update(deltaTime) {
        // Update all portals
        for (const portal of this.portals) {
            portal.update(deltaTime);
        }
    }
    
    dispose() {
        // Clean up UI
        if (this.portalUI && this.portalUI.parentNode) {
            this.portalUI.parentNode.removeChild(this.portalUI);
        }
        
        // Remove all portals
        this.removeAllPortals();
    }

    updateAllPortalTextures(materialName, texturePath) {
        console.log(`[PortalManager] Updating textures for all portals`);
        this.portals.forEach(portal => {
            const portalImageUrl = `https://thevibemetaverse.vercel.app/assets/images/${portal.portalId}.png`;
            portal.updateTexture(materialName, portalImageUrl);
        });
    }
} 
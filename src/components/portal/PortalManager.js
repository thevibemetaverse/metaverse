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
            
            // Set position and rotation explicitly
            portalMesh.position.copy(portalConfig.position);
            portalMesh.rotation.copy(portalConfig.rotation);
            
            this.scene.add(portalMesh);
            this.portals.push(portal);
            
            // Update texture after a short delay to ensure the portal is fully loaded
            setTimeout(() => {
                console.log(`[PortalManager] Updating texture for portal ${portalConfig.portalId}`);
                // Use special fire portal image for Enter portal
                const portalImageUrl = portalConfig.portalId === 'enter' 
                    ? '/assets/images/portal.jpg'  // Use absolute path to assets directory
                    : `https://thevibemetaverse.vercel.app/assets/images/${portalConfig.portalId}.png`;
                console.log(`[PortalManager] Setting texture for ${portalConfig.portalId} to:`, portalImageUrl);
                
                // Try both material names that might exist in the model
                ['Material.002', 'Cube002_3'].forEach(materialName => {
                    portal.updateTexture(materialName, portalImageUrl);
                });
            }, 100);
            
            return portal;
        } catch (error) {
            console.error("[PortalManager] Failed to add portal:", error);
            return null;
        }
    }
    
    async initializeDefaultPortals() {
        console.log('[PortalManager] Starting default portals initialization');
        console.log('[PortalManager] Current scene children count:', this.scene.children.length);
        
        // Check URL parameters for portal flag
        const urlParams = new URLSearchParams(window.location.search);
        const showEnterPortal = urlParams.get('portal') === 'true';
        
        console.log('[PortalManager] URL parameters:', {
            portal: urlParams.get('portal'),
            showEnterPortal,
            ref: urlParams.get('ref')
        });
        
        // Portal configurations
        console.log('[PortalManager] Creating portal configurations, showEnterPortal:', showEnterPortal);
        const defaultPortals = [
            // WATER GROUP - Portals near or on water
            {
                position: new THREE.Vector3(18, -.2*Math.PI, 20),
                rotation: new THREE.Euler(0, 0, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/jet-ski",
                portalId: "jet-ski",
                title: "Jet Ski Portal",
                description: "Portal floating on the water",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(6, 0, 17),
                rotation: new THREE.Euler(0, -.16*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/tidefall",
                portalId: "tidefall",
                title: "Tidefall Portal",
                description: "Portal in misc area",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(30, 0, 20),
                rotation: new THREE.Euler(0, .05*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/yacht-world",
                portalId: "yacht-world",
                title: "Yacht World Portal",
                description: "Portal near the water",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
            {
                position: new THREE.Vector3(43, 0, 18),
                rotation: new THREE.Euler(0, .1*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/viberates",
                portalId: "viberates",
                title: "Viberates Portal",
                description: "Portal in misc area",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },
                        // BACK ROW GROUP (z=40)
                        {
                            position: new THREE.Vector3(55, 0, 40),
                            rotation: new THREE.Euler(0, 0, 0),
                            destination: "https://thevibemetaverse.vercel.app/api/portal/auto-boss",
                            portalId: "auto-boss",
                            title: "Auto Boss Portal",
                            description: "First portal in airport row",
                            modelPath: '/assets/models/portal/portal-new.gltf'
                        },
                        {
                            position: new THREE.Vector3(70, 0, 40),
                            rotation: new THREE.Euler(0, 0, 0),
                            destination: "https://thevibemetaverse.vercel.app/api/portal/foodvibers",
                            portalId: "foodvibers",
                            title: "Food Vibers Portal",
                            description: "Center portal in airport row",
                            modelPath: '/assets/models/portal/portal-new.gltf'
                        },
                        {
                            position: new THREE.Vector3(85, 0, 40),
                            rotation: new THREE.Euler(0, 0, 0),
                            destination: "https://thevibemetaverse.vercel.app/api/portal/neon-trailblazer",
                            portalId: "neon-trailblazer",
                            title: "Neon Trailblazer Portal",
                            description: "Last portal in airport row",
                            modelPath: '/assets/models/portal/portal-new.gltf'
                        },
                        {
                            position: new THREE.Vector3(100, 0, 40),
                            rotation: new THREE.Euler(0, 0, 0),
                            destination: "https://thevibemetaverse.vercel.app/api/portal/ronansrun",
                            portalId: "ronansrun",
                            title: "Ronan's Run Portal",
                            description: "Portal in the row",
                            modelPath: '/assets/models/portal/portal-new.gltf'
                        },
                        {
                            position: new THREE.Vector3(60, 0, 20),
                            rotation: new THREE.Euler(0, 0, 0),
                            destination: "https://thevibemetaverse.vercel.app/api/portal/snowbrawl-world",
                            portalId: "snowbrawl-world",
                            title: "Snowbrawl World Portal",
                            description: "Portal in the back row",
                            modelPath: '/assets/models/portal/portal-new.gltf'
                        },
                        {
                            position: new THREE.Vector3(75, 0, 20),
                            rotation: new THREE.Euler(0, 0, 0),
                            destination: "https://thevibemetaverse.vercel.app/api/portal/spacerunner",
                            portalId: "spacerunner",
                            title: "Space Runner Portal",
                            description: "Portal in the back row",
                            modelPath: '/assets/models/portal/portal-new.gltf'
                        },
                        {
                            position: new THREE.Vector3(90, 0, 20),
                            rotation: new THREE.Euler(0, 0, 0),
                            destination: "https://thevibemetaverse.vercel.app/api/portal/quack",
                            portalId: "quack",
                            title: "Quack Portal",
                            description: "Portal in the row",
                            modelPath: '/assets/models/portal/portal-new.gltf'
                        },
                        {
                            position: new THREE.Vector3(105, 0, 20),
                            rotation: new THREE.Euler(0, 0, 0),
                            destination: "https://thevibemetaverse.vercel.app/api/portal/red-panda-vibes",
                            portalId: "red-panda-vibes",
                            title: "Red Panda Vibes Portal",
                            description: "Portal in the row",
                            modelPath: '/assets/models/portal/portal-new.gltf'
                        },

            // FRONT ROW GROUP (z=-4)
            {
                position: new THREE.Vector3(-15, 0, -4),
                rotation: new THREE.Euler(0, -.2*Math.PI, 0),
                destination: "https://thevibemetaverse.vercel.app/api/portal/fly-pieter",
                portalId: "fly-pieter",
                title: "Fly Pieter Portal",
                description: "Portal in the front row",
                modelPath: '/assets/models/portal/portal-new.gltf'
            },

            // Special "Enter" portal - only shown if portal=true in URL
            ...(showEnterPortal ? [{
                position: new THREE.Vector3(0, 0, -25),
                rotation: new THREE.Euler(0, 0, 0),
                destination: urlParams.get('ref') || "https://thevibemetaverse.vercel.app/api/portal/enter",
                portalId: "enter",
                title: "Enter Portal",
                description: "Special portal behind the user",
                modelPath: '/assets/models/portal/portal-new.gltf'
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
        
        console.log('[PortalManager] Starting to add portals to scene');
        // Add each default portal
        const promises = defaultPortals.map(config => {
            console.log(`[PortalManager] Adding portal to scene:`, {
                id: config.portalId,
                position: config.position,
                destination: config.destination
            });
            return this.addPortal(config);
        });
        const results = await Promise.all(promises);
        const successfulPortals = results.filter(Boolean).length;
        
        console.log('[PortalManager] Portal addition results:', {
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
            portalState,
            pieterPortal: this.pieterPortal ? {
                hasGroup: !!this.pieterPortal.group,
                position: this.pieterPortal.group?.position
            } : null
        });
        
        // Check Pieter portal collision first
        if (this.pieterPortal && this.pieterPortal.group) {
            const portalPosition = this.pieterPortal.group.position;
            const distance = playerPosition.distanceTo(portalPosition);
            
            console.log(`[PortalManager] Checking collision with Pieter portal:`, {
                distance,
                threshold: collisionDistance,
                playerPos: playerPosition.toArray(),
                portalPos: portalPosition.toArray()
            });
            
            if (distance < collisionDistance) {
                console.log(`[PortalManager] Collision detected with Pieter portal`);
                window.location.href = 'https://portal.pieter.com';
                return true;
            }
        }
        
        // Simple distance-based collision detection for other portals
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
            // Use special fire portal image for Enter portal
            const portalImageUrl = portal.portalId === 'enter' 
                ? '/assets/images/portal.jpg'  // Use absolute path to assets directory
                : `https://thevibemetaverse.vercel.app/assets/images/${portal.portalId}.png`;
            
            // Try both material names that might exist in the model
            ['Material.002', 'Cube002_3'].forEach(matName => {
                portal.updateTexture(matName, portalImageUrl);
            });
        });
    }

    createPieterPortal() {
        // Create portal group to contain all portal elements
        const portalGroup = new THREE.Group();
        // Position in line with other portals (front row)
        portalGroup.position.set(0, 0, -5); // Position after the last portal in the front row
        
        // Create portal effect
        const portalGeometry = new THREE.TorusGeometry(7.5, 1, 16, 100);
        const portalMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        portalGroup.add(portal);
                    
        // Create portal inner surface
        const portalInnerGeometry = new THREE.CircleGeometry(6.5, 32);
        const portalInnerMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
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

            // Red color with slight variation
            colors[i] = 0.8 + Math.random() * 0.2;
            colors[i + 1] = 0;
            colors[i + 2] = 0;
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
} 
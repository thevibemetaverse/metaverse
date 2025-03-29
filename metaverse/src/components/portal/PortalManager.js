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
        const portal = new Portal(portalConfig);
        try {
            const portalMesh = await portal.load(this.loadingManager);
            this.scene.add(portalMesh);
            this.portals.push(portal);
            return portal;
        } catch (error) {
            console.error("Failed to add portal:", error);
            return null;
        }
    }
    
    async initializeDefaultPortals() {
        // Sample hardcoded portals
        const defaultPortals = [
            {
                position: new THREE.Vector3(5, 1, 0),
                rotation: new THREE.Euler(0, Math.PI / 4, 0),
                destination: "https://example-game1.com",
                portalId: "game-1",
                title: "Adventure World",
                description: "Explore mysterious ruins and solve ancient puzzles",
                modelPath: './assets/models/new-portal.gltf'
            },
            {
                position: new THREE.Vector3(-5, 1, 3),
                rotation: new THREE.Euler(0, -Math.PI / 4, 0),
                destination: "https://example-game2.com",
                portalId: "game-2",
                title: "Space Explorer",
                description: "Navigate the cosmos and discover new planets",
                modelPath: './assets/models/new-portal.gltf'
            }
        ];
        
        // Add each default portal
        const promises = defaultPortals.map(config => this.addPortal(config));
        await Promise.all(promises);
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
    
    checkCollision(playerPosition, collisionDistance = 1.5) {
        // Simple distance-based collision detection
        for (const portal of this.portals) {
            if (!portal.mesh || !portal.isActive) continue;
            
            const distance = playerPosition.distanceTo(portal.mesh.position);
            if (distance < collisionDistance) {
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
} 
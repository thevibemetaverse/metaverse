import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import CharacterManager from './components/character/CharacterManager';
import { PortalManager } from './components/portal/PortalManager';

export default class Game {
    constructor() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // Camera setup
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);

        // Controls setup
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Character setup
        this.characterManager = new CharacterManager(this.scene, this.renderer.domElement);
        this.characterManager.setCamera(this.camera);

        // Portal setup
        this.portalManager = new PortalManager(this.scene, this.camera, {
            username: 'Guest',
            color: 'blue',
            speed: 5
        });

        // Lighting setup
        this.setupLighting();

        // Event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));

        // Animation loop
        this.clock = new THREE.Clock();
        this.animate();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Directional light (sunlight)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }

    async initialize() {
        try {
            console.log('[Game] Starting initialization');
            
            // Initialize character
            console.log('[Game] Initializing character');
            await this.characterManager.initialize();

            // Initialize portals
            console.log('[Game] Initializing portals');
            await this.portalManager.initializeDefaultPortals();

            // Connect portal manager to character manager
            console.log('[Game] Connecting portal manager to character manager');
            this.characterManager.setPortalManager(this.portalManager);

            // Start checking for portal collisions
            console.log('[Game] Starting portal collision checks');
            this.startPortalCollisionCheck();
            
            console.log('[Game] Initialization complete');
        } catch (error) {
            console.error('[Game] Error during initialization:', error);
        }
    }

    startPortalCollisionCheck() {
        // Check for portal collisions every frame
        this.checkPortalCollision = () => {
            if (this.characterManager.character) {
                const playerPosition = this.characterManager.character.position;
                const playerDirection = new THREE.Vector3();
                this.camera.getWorldDirection(playerDirection);

                // Check both simple collision and raycast collision
                const portal = this.portalManager.checkCollision(playerPosition) ||
                             this.portalManager.checkRaycastCollision(playerPosition, playerDirection);

                if (portal) {
                    // Portal interaction logic can be added here
                    console.log('[Game] Player near portal:', portal.title);
                }
            }
            requestAnimationFrame(this.checkPortalCollision);
        };

        this.checkPortalCollision();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onKeyDown(event) {
        // Handle any game-wide keyboard events here
        if (event.code === 'Escape') {
            // Example: Toggle portal UI visibility
            if (this.portalManager.portalUI) {
                this.portalManager.portalUI.style.display = 
                    this.portalManager.portalUI.style.display === 'none' ? 'block' : 'none';
            }
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const deltaTime = this.clock.getDelta();

        // Update controls
        this.controls.update();

        // Update character
        if (this.characterManager) {
            this.characterManager.update(deltaTime);
        }

        // Update portals
        if (this.portalManager) {
            this.portalManager.update(deltaTime);
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        // Clean up event listeners
        window.removeEventListener('resize', this.onWindowResize);
        window.removeEventListener('keydown', this.onKeyDown);

        // Dispose of managers
        if (this.characterManager) {
            this.characterManager.dispose();
        }
        if (this.portalManager) {
            this.portalManager.dispose();
        }

        // Dispose of Three.js objects
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Remove renderer
        this.renderer.dispose();
        document.body.removeChild(this.renderer.domElement);
    }
} 
import { inject } from '@vercel/analytics';
import posthog from 'posthog-js';
import CharacterManager from './components/character/CharacterManager';
import Sky from './components/environment/sky';
import Ground from './components/environment/ground';
import HillsGenerator from './components/environment/hills';
import { FollowCamera } from './components/character/camera';
import { createEnvironmentElements } from './components/environment/environmentElements.js';
import { PortalManager } from './components/portal/PortalManager';
import { MultiplayerManager } from './components/multiplayer/MultiplayerManager';
import { animateWater } from './components/environment/waterSystem.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import config from './config';

// Function to get username from URL parameters
function getUsernameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('username');
}

// Function to update URL with username parameter
function updateURLWithUsername(username) {
    const url = new URL(window.location.href);
    url.searchParams.set('username', username);
    window.history.replaceState({}, '', url);
}

// Initialize Vercel Analytics
inject();

// Initialize PostHog
posthog.init(import.meta.env.POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
});

// Scene setup
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

// Initialize environment
const sky = new Sky();
scene.add(sky.init());

const ground = new Ground({
    size: 1000,
    color: 0x4CAF50,
    roughness: 0.8,
    metalness: 0.2
});
scene.add(ground.init());

const hills = new HillsGenerator({
    smallHillCount: 40,
    largeHillCount: 8,
    baseDistance: 320,
    distanceVariation: 80,
    colors: [0x8AE68A, 0x9EEE9E, 0xB0F7B0]
});
scene.add(hills.init());

// Add environment elements
createEnvironmentElements(scene).then(environment => {
    console.log('Environment elements created:', environment);
}).catch(error => {
    console.error('Error creating environment elements:', error);
});

// Character and camera references
let characterManager;
let character;
let followCamera;
let portalManager;
let multiplayerManager;

// Animation loop control
let animationRunning = false;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = 0.016; // Approximately 60 FPS
    
    // Only update components if they are initialized
    if (characterManager && character) {
        characterManager.update(deltaTime);
    }
    
    // Update camera
    if (followCamera) {
        followCamera.update();
    }
    
    // Update portals
    if (portalManager) {
        portalManager.update(deltaTime);
    }

    // Update multiplayer if feature is enabled and manager is initialized
    if (config.features.multiplayer && multiplayerManager) {
        multiplayerManager.update(deltaTime);
        
        // Send player position updates if character exists
        if (character) {
            multiplayerManager.updatePlayerPosition(
                character.position,
                character.rotation
            );
        }
    }

    // Update water animation
    animateWater(scene.water, deltaTime);
    
    // Use the camera from followCamera if available, otherwise use a default camera
    const renderCamera = followCamera 
        ? followCamera.getCamera() 
        : new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer.render(scene, renderCamera);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (followCamera) {
        followCamera.resize();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Handle cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (config.features.multiplayer && multiplayerManager) {
        multiplayerManager.dispose();
    }
});

// Function to start the game
function startGame(username) {
    console.log('[main] Starting game with username:', username);

    // Initialize character manager first
    characterManager = new CharacterManager(scene, renderer.domElement);
    
    // Ensure character manager has the correct username
    if (characterManager.username !== username) {
        console.log('[main] Setting character manager username:', username);
        characterManager.username = username;
        characterManager.playerState = {
            ...characterManager.playerState || {},
            username: username
        };
    }

    // Initialize portal manager
    portalManager = new PortalManager(scene, null, {
        username: username,
        speed: 5
    });

    // Track portal interactions
    portalManager.onPortalEnter = (portalId) => {
        posthog.capture('portal_entered', {
            portal_id: portalId,
            timestamp: new Date().toISOString()
        });
    };

    // Initialize character and start animation loop
    characterManager.initialize().then(async (loadedCharacter) => {
        character = loadedCharacter;

        // Track character initialization
        posthog.capture('character_initialized', {
            timestamp: new Date().toISOString()
        });

        // Initialize FollowCamera
        followCamera = new FollowCamera(character);
        const camera = followCamera.getCamera();

        // Set the camera in character manager
        characterManager.setCamera(camera);
      
        // Set the camera in portal manager
        portalManager.camera = camera;

        // Initialize portals
        console.log('[main] Initializing portals');
        await portalManager.initializeDefaultPortals();

        // Create Pieter portal in line with other portals
        console.log('[main] Creating Pieter portal');
        portalManager.createPieterPortal();

        // Connect portal manager to character manager
        console.log('[main] Connecting portal manager to character manager');
        characterManager.setPortalManager(portalManager);

        // Initialize multiplayer manager if feature is enabled
        if (config.features.multiplayer) {
            console.log('[main] Initializing multiplayer manager (feature enabled)');
            multiplayerManager = new MultiplayerManager(scene);

            // Ensure multiplayer manager has the correct username
            if (multiplayerManager.username !== username) {
                console.log('[main] Setting multiplayer manager username:', username);
                multiplayerManager.username = username;
            }
            
            // Share the character model with the multiplayer manager
            if (characterManager.gltfData && characterManager.gltfData.scene) {
                console.log('[main] Sharing character model with multiplayer manager');
                multiplayerManager.setLocalPlayerModel(characterManager.gltfData.scene);
            }
            
            // Call connect method to establish socket connection
            multiplayerManager.connect(config.server.socketUrl);
            
            // Wait a moment for the socket connection to be established
            setTimeout(() => {
                // Set socket from multiplayer manager to portal manager
                if (multiplayerManager.socket && portalManager) {
                    console.log('[main] Connecting portal manager to socket for like functionality');
                    portalManager.setSocket(multiplayerManager.socket);
                    portalManager.initializePortalLikes();
                    
                    // Create player count display near the desk
                    console.log('[main] Creating player count display near desk');
                    // Position on the opposite side of the office computer at coordinates (15, 0, 55)
                    const playerCountPosition = new THREE.Vector3(16, 7, 65);
                    multiplayerManager.initPlayerCountDisplay(playerCountPosition);
                }
            }, 2000);
        } else {
            console.log('[main] Multiplayer feature is disabled');
        }
        
        // Update URL with username
        updateURLWithUsername(username);

        // Hide the username modal
        const usernameModal = document.getElementById('username-modal');
        if (usernameModal) {
            usernameModal.classList.add('hidden');
        }

        // Add Vibe Jam link
        const jamLink = document.createElement('a');
        jamLink.href = 'https://jam.pieter.com';
        jamLink.target = '_blank';
        jamLink.textContent = '🕹️ Vibe Jam 2025';
        jamLink.style.cssText = `
            font-family: 'system-ui', sans-serif;
            position: fixed;
            bottom: -1px;
            right: -1px;
            padding: 7px;
            font-size: 14px;
            font-weight: bold;
            background: #fff;
            color: #000;
            text-decoration: none;
            border-top-left-radius: 12px;
            z-index: 10000;
            border: 1px solid #fff;
        `;
        document.body.appendChild(jamLink);
        
        // Start animation loop if not already running
        if (!animationRunning) {
            animationRunning = true;
            animate();
        }
    });
}

// Check for username when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get username from URL if available
    const username = getUsernameFromURL();
    const urlParams = new URLSearchParams(window.location.search);
    const isPortal = urlParams.get('portal') === 'true';
    
    if (username || isPortal) {
        // Start game directly if username is in URL or if portal=true
        startGame(username || 'metaverse-explorer');
    } else {
        // Show the username modal
        const usernameModal = document.getElementById('username-modal');
        if (usernameModal) {
            usernameModal.classList.remove('hidden');
        }
        
        // Set up form submission
        const usernameForm = document.getElementById('submit-username');
        if (usernameForm) {
            usernameForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const usernameInput = document.getElementById('username-input');
                const username = usernameInput?.value?.trim();
                if (username) {
                    // Update URL with username before starting game
                    updateURLWithUsername(username);
                    startGame(username);
                } else {
                    console.error('Username cannot be empty');
                }
            });
        } else {
            console.error('Username form not found!');
        }
    }
});
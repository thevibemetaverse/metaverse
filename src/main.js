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
import { ChatManager } from './components/chat/ChatManager.js';
import { animateWater } from './components/environment/waterSystem.js';
import { InteractionManager } from './components/interactions/InteractionManager.js';
import GameStateManager from './services/GameStateManager.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import config from './config';
import { LoadingManager } from './services/LoadingManager.js';

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

// Declare all manager variables
let characterManager;
let portalManager;
let interactionManager;
let multiplayerManager;
let chatManager;
let character;
let followCamera;

// Scene setup
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Initialize LoadingManager
const loadingManager = new LoadingManager();
window.loadingManager = loadingManager;

// Initialize GameStateManager
const gameStateManager = new GameStateManager();
// Make the game state manager globally available
window.gameStateManager = gameStateManager;

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

// Start preloading all assets in the background
console.log('[main] Starting background asset preloading');
loadingManager.preloadAssets().catch(error => {
    console.error('Error preloading assets:', error);
});

// Initialize character manager in the background
console.log('[main] Initializing character manager in background');
characterManager = new CharacterManager(scene, renderer.domElement, gameStateManager);
window.characterManager = characterManager;

// Initialize portal manager in the background
console.log('[main] Initializing portal manager in background');
portalManager = new PortalManager(scene, null, {
    username: 'Guest',
    speed: 5
});

// Initialize portals using preloaded assets in background
console.log('[main] Initializing portals in background');
portalManager.initializeDefaultPortals().then(() => {
    console.log('[main] Portals initialized in background');
    // Create Pieter portal in line with other portals
    console.log('[main] Creating Pieter portal in background');
    portalManager.createPieterPortal();
}).catch(error => {
    console.error('[main] Error initializing portals:', error);
});

// Initialize interaction manager in the background
console.log('[main] Initializing interaction manager in background');
interactionManager = new InteractionManager(scene, null, renderer);

// Create environment elements in the background
console.log('[main] Creating environment elements in background');
createEnvironmentElements(scene, interactionManager).then(environment => {
    console.log('Environment elements created in background:', environment);
}).catch(error => {
    console.error('Error creating environment elements:', error);
});

// Initialize multiplayer manager in the background if feature is enabled
if (config.features.multiplayer) {
    console.log('[main] Initializing multiplayer manager in background');
    multiplayerManager = new MultiplayerManager(scene);
    
    // Connect to socket server in background
    console.log('[main] Connecting to socket server in background');
    multiplayerManager.connect(config.server.socketUrl);
}

// Animation loop control
let animationRunning = false;
let showFPS = false;
let lastTime = performance.now();
let frames = 0;
let fps = 0;

// Create FPS display element
const fpsDisplay = document.createElement('div');
fpsDisplay.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 14px;
    z-index: 1000;
    display: none;
`;
document.body.appendChild(fpsDisplay);

// Add key event listener for toggling FPS display
window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'i') {
        showFPS = !showFPS;
        fpsDisplay.style.display = showFPS ? 'block' : 'none';
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = 0.016; // Approximately 60 FPS
    
    // Calculate FPS
    frames++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
        
        // Update FPS display if enabled
        if (showFPS) {
            fpsDisplay.textContent = `FPS: ${fps}`;
        }
    }
    
    // Only update components if they are initialized
    if (characterManager && character) {
        characterManager.update(deltaTime);
    }
    
    // Update camera
    if (followCamera) {
        followCamera.update();
    }
    
    // Update interaction manager
    if (interactionManager) {
        interactionManager.update();
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

    // Update chat system
    if (chatManager) {
        chatManager.update();
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

// Function to start the game
function startGame(username) {
    console.log('[main] Starting game with username:', username);

    // Ensure character manager has the correct username
    if (characterManager.username !== username) {
        console.log('[main] Setting character manager username:', username);
        characterManager.username = username;
        characterManager.playerState = {
            ...characterManager.playerState || {},
            username: username
        };
    }

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

        // Initialize FollowCamera first
        followCamera = new FollowCamera(character);
        const camera = followCamera.getCamera();

        // Set the camera in all managers that need it
        characterManager.setCamera(camera);
        portalManager.camera = camera;
        interactionManager.camera = camera;

        // Listen for game state changes to manage orbit controls if they exist
        if (window.orbitControls) {
            gameStateManager.onStateChange((newState) => {
                // Enable orbit controls only when in playing state
                window.orbitControls.enabled = (newState === 'playing');
            });
        }

        // Connect portal manager to character manager
        console.log('[main] Connecting portal manager to character manager');
        characterManager.setPortalManager(portalManager);

        // Initialize chat manager
        console.log('[main] Initializing chat manager');
        chatManager = new ChatManager(scene, camera, character);

        // Connect multiplayer manager if feature is enabled
        if (config.features.multiplayer) {
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
            
            // Connect chat manager to multiplayer system
            if (multiplayerManager.socket && chatManager) {
                console.log('[main] Connecting chat manager to multiplayer system');
                chatManager.setMultiplayerManager(multiplayerManager);
            }
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
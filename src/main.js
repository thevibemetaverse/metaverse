import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CharacterManager from './components/character/CharacterManager';
import Sky from './components/environment/sky';
import Ground from './components/environment/ground';
import HillsGenerator from './components/environment/hills';
import { FollowCamera } from './components/character/camera';
import { createEnvironmentElements } from './components/environment/environmentelements.js';
import { PortalManager } from './components/portal/PortalManager';
import { MultiplayerManager } from './components/multiplayer/MultiplayerManager';

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

// Initialize character manager
const characterManager = new CharacterManager(scene, renderer.domElement);
let character;
let followCamera;

// Initialize portal manager
const portalManager = new PortalManager(scene, null, {
    username: 'Guest',
    color: 'blue',
    speed: 5
});

// Initialize multiplayer manager
const multiplayerManager = new MultiplayerManager(scene);

// Initialize character and start animation loop
characterManager.initialize().then(async (loadedCharacter) => {
    character = loadedCharacter;
    
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

    // Set the local player model in multiplayer manager
    console.log('[main] Setting local player model in multiplayer manager');
    multiplayerManager.setLocalPlayerModel(character);

    // Connect to multiplayer server after character is fully initialized
    console.log('[main] Connecting to multiplayer server');
    multiplayerManager.connect();
    
    // Start animation loop
    animate();
}).catch(error => {
    console.error('Failed to initialize character:', error);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = 0.016; // Approximately 60 FPS
    
    // Update character manager
    if (characterManager) {
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

    // Update multiplayer
    if (multiplayerManager) {
        multiplayerManager.update(deltaTime);
        
        // Send player position updates
        if (character) {
            multiplayerManager.updatePlayerPosition(
                character.position,
                character.rotation
            );
        }
    }
    
    renderer.render(scene, followCamera.getCamera());
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
    if (multiplayerManager) {
        multiplayerManager.dispose();
    }
});
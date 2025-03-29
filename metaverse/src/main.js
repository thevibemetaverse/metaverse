import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CharacterManager from './components/character/CharacterManager';
import Sky from './components/environment/sky';
import Ground from './components/environment/ground';
import HillsGenerator from './components/environment/hills';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

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

// Camera setup
camera.position.set(0, 5, 10);

// Initialize character manager
const characterManager = new CharacterManager(scene, camera, renderer.domElement);
let character;

// Initialize character and start animation loop
characterManager.initialize().then((loadedCharacter) => {
    character = loadedCharacter;
    camera.lookAt(character.position);
    animate();
}).catch(error => {
    console.error('Failed to initialize character:', error);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = 0.016; // Approximately 60 FPS
    
    // Update character manager
    characterManager.update(deltaTime);
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
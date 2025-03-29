// Import necessary modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { trackEvent } from './utils/posthog.js';
import { isMobileDevice } from './mobileControls.js';
import { PortalModel } from './portalModel.js';

// Global variables and setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const loadingManager = new THREE.LoadingManager();

// Model loaders
const gltfLoader = new GLTFLoader(loadingManager);
const objLoader = new OBJLoader(loadingManager);
const mtlLoader = new MTLLoader(loadingManager);

// Initialize function
function init() {
  // Setup renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  
  // Setup camera
  camera.position.set(0, 5, 10);
  scene.add(camera);
  
  // Add basic lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(20, 30, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  // Create ground
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // Create environment elements with loading feedback
  try {
    createEnvironmentElements(scene, loadingManager);
    
    // Add loading manager handlers
    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
      console.log(`Loading environment elements: ${(itemsLoaded / itemsTotal * 100)}% loaded`);
    };

    loadingManager.onError = function(url) {
      console.error('Error loading environment element:', url);
    };

    loadingManager.onLoad = function() {
      console.log('All environment elements loaded successfully');
    };
  } catch (error) {
    console.error('Failed to create environment elements:', error);
  }
  
  // Create other elements from your existing code
  createHills(scene);
  createPortals(scene, loadingManager);
  
  // Start animation loop
  animate();
}

// Function to load GLTF models
async function loadGLTFModel(url, position = new THREE.Vector3(0, 0, 0), scale = new THREE.Vector3(1, 1, 1), rotation = new THREE.Euler(0, 0, 0)) {
  try {
    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        (xhr) => console.log(`Loading model: ${(xhr.loaded / xhr.total) * 100}% loaded`),
        (error) => reject(error)
      );
    });

    const model = gltf.scene;
    model.position.copy(position);
    model.scale.copy(scale);
    model.rotation.copy(rotation);
    
    // Enable shadows
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return model;
  } catch (error) {
    console.error('Error loading GLTF model:', error);
    return null;
  }
}

// Function to load OBJ models with materials
async function loadOBJModel(objUrl, mtlUrl, position = new THREE.Vector3(0, 0, 0), scale = new THREE.Vector3(1, 1, 1), rotation = new THREE.Euler(0, 0, 0)) {
  try {
    // Load materials first if MTL URL is provided
    if (mtlUrl) {
      const materials = await new Promise((resolve, reject) => {
        mtlLoader.load(
          mtlUrl,
          (materials) => resolve(materials),
          undefined,
          (error) => reject(error)
        );
      });
      materials.preload();
      objLoader.setMaterials(materials);
    }

    // Load the OBJ model
    const model = await new Promise((resolve, reject) => {
      objLoader.load(
        objUrl,
        (object) => resolve(object),
        (xhr) => console.log(`Loading model: ${(xhr.loaded / xhr.total) * 100}% loaded`),
        (error) => reject(error)
      );
    });

    model.position.copy(position);
    model.scale.copy(scale);
    model.rotation.copy(rotation);

    // Enable shadows
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return model;
  } catch (error) {
    console.error('Error loading OBJ model:', error);
    return null;
  }
}

// Function to create environment elements
async function createEnvironmentElements(scene, loadingManager) {
  // Example: Load a portal model
  const portalModel = await loadGLTFModel(
    './assets/models/new-portal/portal-new.gltf',
    new THREE.Vector3(0, 0, -10),
    new THREE.Vector3(1, 1, 1),
    new THREE.Euler(0, 0, 0)
  );

  if (portalModel) {
    scene.add(portalModel);
  }

  // Add more model loading here as needed
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update animations and controls
  
  // Render the scene
  renderer.render(scene, camera);
}

// Start the application when page loads
window.addEventListener('DOMContentLoaded', init);
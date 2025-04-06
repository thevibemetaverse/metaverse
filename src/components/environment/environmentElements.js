// Import necessary modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { createWater } from './waterSystem.js';
import { create2DImage } from './imageSystem.js';

// Model loaders
const loadingManager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(loadingManager);
const objLoader = new OBJLoader(loadingManager);
const mtlLoader = new MTLLoader(loadingManager);

// Function to load GLTF models
async function loadGLTFModel(url, position = new THREE.Vector3(0, 0, 0), scale = new THREE.Vector3(1, 1, 1), rotation = new THREE.Euler(0, 0, 0)) {
  try {
    console.log(`Starting to load model: ${url}`);
    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => {
          console.log(`Successfully loaded model: ${url}`);
          console.log('Model position:', position);
          console.log('Model scale:', scale);
          console.log('Model rotation:', rotation);
          resolve(gltf);
        },
        (xhr) => console.log(`Loading model ${url}: ${(xhr.loaded / xhr.total) * 100}% loaded`),
        (error) => {
          console.error(`Error loading model ${url}:`, error);
          reject(error);
        }
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
        console.log(`Mesh ${child.name} added to model`);
      }
    });

    return model;
  } catch (error) {
    console.error('Error loading GLTF model:', error);
    return null;
  }
}

// Function to create environment elements
async function createEnvironmentElements(scene, interactionManager = null) {
  console.log('createEnvironmentElements called with interactionManager:', interactionManager ? 'provided' : 'not provided');
  // Create a group to hold all environment objects
  const environment = new THREE.Group();
  scene.add(environment);

  try {
    // Create water first (so it's at the bottom)
    console.log('Creating water...');
    const water = createWater(scene);
    console.log('Water created:', water);
    // Store water in scene for animation
    scene.water = water;

    // Load BBQ Sauce
    console.log('About to load BBQ Sauce...');
    const bbqSauce = await loadGLTFModel(
      '/assets/models/sweet_baby_rays_bbq_sauce.glb',
      new THREE.Vector3(15, 10, -40),
      new THREE.Vector3(5, 5, 5),
      new THREE.Euler(0, 0, 0)
    );
    console.log('BBQ Sauce loaded:', bbqSauce);
    if (bbqSauce) {
      environment.add(bbqSauce);
      
      // Make BBQ Sauce interactive if interactionManager is available
      if (interactionManager) {
        interactionManager.makeObjectInteractable(bbqSauce, {
          onClick: () => {
            console.log('BBQ Sauce clicked!');
            // Add any click behavior here
          },
          onHover: () => {
            console.log('Hovering over BBQ Sauce');
          },
          onHoverExit: () => {
            console.log('No longer hovering over BBQ Sauce');
          }
        });
      }
    }

    // Load Office Computer
    console.log('About to load Office Computer...');
    const officeComputer = await loadGLTFModel(
      '/assets/models/office_computer.glb',
      new THREE.Vector3(15, 0, 55),
      new THREE.Vector3(0.04, 0.04, 0.04),
      new THREE.Euler(0, 0, 0)
    );
    console.log('Office Computer loaded:', officeComputer);
    if (officeComputer) {
      environment.add(officeComputer);
      
      // Make office computer interactive if interactionManager is available
      if (interactionManager) {
        interactionManager.makeObjectInteractable(officeComputer, {
          onClick: () => {
            console.log('Office computer clicked!');
            // Add any click behavior here
          },
          onHover: () => {
            console.log('Hovering over office computer');
          },
          onHoverExit: () => {
            console.log('No longer hovering over office computer');
          }
        });
      }
      
      // Add solsys image next to the computer
      const computerImagePosition = new THREE.Vector3(20, 7, 55); // Position to the right of computer
      const logoImage2 = create2DImage(
        '/assets/images/solsys.png',
        computerImagePosition,
        15, // Smaller size to fit near desk
        8,
        new THREE.Euler(0, -Math.PI/2, 0) // Rotate 90 degrees clockwise around Z axis
      );
      environment.add(logoImage2);

      // Add image on the other side of the desk
      const oppositeImagePosition = new THREE.Vector3(15, 7, 48); // Position to the left of computer
      const oppositeImage = create2DImage(
        '/assets/images/active-users.jpg',
        oppositeImagePosition,
        9, // Same size as other image
        4,
        new THREE.Euler(0, -Math.PI/3, 0) // Rotate 90 degrees counterclockwise around Z axis
      );
      environment.add(oppositeImage);
    }

    // Load Runway
    console.log('About to load Runway...');
    const runway = await loadGLTFModel(
      '/assets/models/runway.glb',
      new THREE.Vector3(-15, .1, 10),
      new THREE.Vector3(.02, .02, .02),
      new THREE.Euler(0, .8*Math.PI, 0) 
    );
    console.log('Runway loaded:', runway);
    if (runway) environment.add(runway);

    // Load Vibermart
    console.log('About to load Vibermart...');
    const vibermart = await loadGLTFModel(
      '/assets/models/vibermart.glb',
      new THREE.Vector3(-25, 5, 55), // Same x as runway, further back in z
      new THREE.Vector3(10, 10, 10), // You may need to adjust this scale
      new THREE.Euler(0, Math.PI/2, 0) // Same rotation as runway
    );
    console.log('Vibermart loaded:', vibermart);
    if (vibermart) environment.add(vibermart);

    // Load Eiffel Tower
    console.log('About to load Eiffel Tower...');
    const eiffelTower = await loadGLTFModel(
      '/assets/models/eiffel_tower.glb',
      new THREE.Vector3(65, 0, -70),
      new THREE.Vector3(5, 6, 5),
      new THREE.Euler(0, 0, 0)
    );
    console.log('Eiffel Tower loaded:', eiffelTower);
    if (eiffelTower) {
      environment.add(eiffelTower);
      
      // First logo remains at its current position
      const logoPosition = new THREE.Vector3(65, 30, -60);
      const logoImage = create2DImage(
        '/assets/images/affordihome.png',
        logoPosition,
        40,
        25,
        new THREE.Euler(0, 0, 0)
      );
      environment.add(logoImage);
    }

    // Load Sagrada Familia
    console.log('About to load Sagrada Familia...');
    const sagradaFamilia = await loadGLTFModel(
      '/assets/models/sagrada_familia_2.glb',
      new THREE.Vector3(75, 0, -90),
      new THREE.Vector3(0.25, 0.25, 0.25),
      new THREE.Euler(0, Math.PI / 6, 0)
    );
    console.log('Sagrada Familia loaded:', sagradaFamilia);
    if (sagradaFamilia) environment.add(sagradaFamilia);
  } catch (error) {
    console.error('Error in createEnvironmentElements:', error);
  }

  return environment;
}

// Export the function to be used in main.js
export { createEnvironmentElements };
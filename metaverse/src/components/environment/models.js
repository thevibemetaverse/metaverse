// Import necessary Three.js modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Function to create the environment with all elements
export function createEnvironmentElements(scene, loadingManager = new THREE.LoadingManager()) {
  // Create a group to hold all environment objects
  const environment = new THREE.Group();
  scene.add(environment);
  
  // Load the elements
  createEiffelTower(environment, loadingManager);
  createSagradaFamilia(environment, loadingManager);
  createOfficeDesk(environment, loadingManager);
  createBBQSauceBottle(environment, loadingManager);
  
  return environment;
}

// Function to create BBQ Sauce bottle
function createBBQSauceBottle(environment, loadingManager) {
  // Create a placeholder for the BBQ sauce bottle
  const placeholder = new THREE.Group();
  // Position it on the desk - near the computer
  placeholder.position.set(-24, 1, 14); // Slightly offset from computer position
  placeholder.scale.set(0.2, 0.2, 0.2); // Scale appropriate for a sauce bottle
  
  // Load the model
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/bbq_sauce.glb',
    function(gltf) {
      const model = gltf.scene;
      
      // Add shadows
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Add the model to the placeholder
      placeholder.add(model);
      console.log('BBQ sauce bottle model loaded successfully');
    },
    function(xhr) {
      console.log('BBQ sauce bottle: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading BBQ sauce model:', error);
    }
  );
  
  environment.add(placeholder);
  return placeholder;
}

// Function to create Office Desk
function createOfficeDesk(environment, loadingManager) {
  // Create a placeholder for the desk
  const placeholder = new THREE.Group();
  // Position it near the computer, at the same location referenced in the code
  placeholder.position.set(-25, 0, 15);
  
  // Load the model
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/office_desk.glb',
    function(gltf) {
      const model = gltf.scene;
      
      // Scale appropriate for the desk
      model.scale.set(3, 3, 3);
      
      // Add shadows
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Add the model to the placeholder
      placeholder.add(model);
      console.log('Office desk model loaded successfully');
    },
    function(xhr) {
      console.log('Office desk: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading office desk model:', error);
    }
  );
  
  environment.add(placeholder);
  return placeholder;
}

// Function to create Eiffel Tower - positioned at same coordinates as reference
function createEiffelTower(environment, loadingManager) {
  // Create a placeholder for the tower
  const placeholder = new THREE.Group();
  // Position the Eiffel Tower at same position as in reference code
  placeholder.position.set(65, 0, -70);
  
  // Load the model
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/eiffel_tower.glb',
    function(gltf) {
      const model = gltf.scene;
      
      // Scale for distant viewing
      model.scale.set(5, 6, 5);
      
      // Add shadows
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Add the model to the placeholder
      placeholder.add(model);
      console.log('Eiffel Tower model loaded successfully');
    },
    function(xhr) {
      console.log('Eiffel Tower: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading Eiffel Tower model:', error);
    }
  );
  
  environment.add(placeholder);
  return placeholder;
}

// Function to create Sagrada Familia - positioned at same coordinates as reference
function createSagradaFamilia(environment, loadingManager) {
  // Create a placeholder for Sagrada Familia
  const placeholder = new THREE.Group();
  // Position it at same position as in reference code
  placeholder.position.set(75, 0, -90);
  
  // Load the model
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/sagrada_familia_2.glb',
    function(gltf) {
      const model = gltf.scene;
      
      // Scale as referenced in the code
      model.scale.set(0.25, 0.25, 0.25);
      
      // Rotate to face toward the player
      model.rotation.y = Math.PI / 6; // 30-degree rotation
      
      // Add shadows
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Add the model to the placeholder
      placeholder.add(model);
      console.log('Sagrada Familia model loaded successfully');
    },
    function(xhr) {
      console.log('Sagrada Familia: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading Sagrada Familia model:', error);
    }
  );
  
  environment.add(placeholder);
  return placeholder;
}
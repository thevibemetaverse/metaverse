import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

// Create a loader manager to track loading progress
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};

export function createEnvironment(scene, loadingManager = new THREE.LoadingManager()) {
  // Create a group to hold all environment objects
  const environment = new THREE.Group();
  scene.add(environment);
  
  // Create sky
  createSky(scene);
  
  // Create terrain
  createTerrain(environment);
  
  // Create landmarks
  createEiffelTower(environment, loadingManager);
  createSagradaFamilia(environment);
  createTrees(environment);
  
  return environment;
}

function createSky(scene) {
  // Create a bright blue sky
  scene.background = new THREE.Color(0x87CEEB);
  
  // Add a simple directional light to simulate sun
  const sunLight = new THREE.DirectionalLight(0xFFFFAA, 1);
  sunLight.position.set(100, 100, 100);
  scene.add(sunLight);
}

function createTerrain(environment) {
  // Create a large flat ground plane with rolling hills
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
  
  // Create rolling hills by modifying the vertices
  const vertices = groundGeometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    // Skip the edges to keep them flat
    const x = vertices[i];
    const z = vertices[i + 2];
    
    if (Math.abs(x) < 490 && Math.abs(z) < 490) {
      // Create gentle rolling hills
      vertices[i + 1] = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 5;
    }
  }
  
  // Update normals after modifying vertices
  groundGeometry.computeVertexNormals();
  
  // Create a bright green material for the ground
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x7CFC00,
    side: THREE.DoubleSide,
    flatShading: true
  });
  
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  environment.add(ground);
  
  // Add collision detection for the ground
  ground.userData.isGround = true;
}

function createEiffelTower(environment, loadingManager) {
  // Create a placeholder for the tower while it loads
  const placeholder = new THREE.Group();
  placeholder.position.set(100, 0, -50);
  environment.add(placeholder);
  
  // Try to load the GLB/GLTF model first
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/eiffel_tower.glb', // or .gltf
    function(gltf) {
      // Model loaded successfully
      const model = gltf.scene;
      
      // Scale and position the model
      model.scale.set(5, 5, 5); // Adjust scale as needed
      model.position.set(0, 0, 0);
      
      // Add shadows
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Add the model to the placeholder
      placeholder.add(model);
      
      // Add collision detection
      placeholder.userData.isObstacle = true;
      
      console.log('Eiffel Tower model loaded successfully');
    },
    function(xhr) {
      // Loading progress
      console.log('Eiffel Tower: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      // Error loading GLTF, fall back to OBJ
      console.warn('Error loading GLTF model, falling back to OBJ:', error);
      loadOBJModel(placeholder, loadingManager);
    }
  );
  
  // Function to load OBJ model as fallback
  function loadOBJModel(placeholder, loadingManager) {
    const mtlLoader = new MTLLoader(loadingManager);
    mtlLoader.load(
      '/assets/models/eiffel_tower.mtl',
      function(materials) {
        materials.preload();
        
        const objLoader = new OBJLoader(loadingManager);
        objLoader.setMaterials(materials);
        objLoader.load(
          '/assets/models/eiffel_tower.obj',
          function(object) {
            // Scale and position the model
            object.scale.set(5, 5, 5); // Adjust scale as needed
            
            // Add shadows
            object.traverse(function(node) {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            
            // Add the model to the placeholder
            placeholder.add(object);
            
            console.log('Eiffel Tower OBJ model loaded successfully');
          },
          function(xhr) {
            // Loading progress
            console.log('Eiffel Tower OBJ: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
          },
          function(error) {
            // Error loading OBJ, fall back to basic geometries
            console.warn('Error loading OBJ model, falling back to basic geometries:', error);
            createBasicEiffelTower(placeholder);
          }
        );
      },
      function(xhr) {
        // MTL loading progress
      },
      function(error) {
        // Error loading MTL, try loading OBJ without materials
        console.warn('Error loading MTL file, trying OBJ without materials:', error);
        
        const objLoader = new OBJLoader(loadingManager);
        objLoader.load(
          '/assets/models/eiffel_tower.obj',
          function(object) {
            // Apply a basic material
            object.traverse(function(node) {
              if (node.isMesh) {
                node.material = new THREE.MeshStandardMaterial({ color: 0x555555 });
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            
            // Scale and position the model
            object.scale.set(5, 5, 5); // Adjust scale as needed
            
            // Add the model to the placeholder
            placeholder.add(object);
            
            console.log('Eiffel Tower OBJ model loaded without materials');
          },
          function(xhr) {
            // Loading progress
          },
          function(error) {
            // Error loading OBJ without materials, fall back to basic geometries
            console.warn('Error loading OBJ model without materials, falling back to basic geometries:', error);
            createBasicEiffelTower(placeholder);
          }
        );
      }
    );
  }
  
  // Function to create a basic Eiffel Tower with geometries as fallback
  function createBasicEiffelTower(placeholder) {
    console.log('Creating basic Eiffel Tower with geometries');
    
    // Create a simplified Eiffel Tower using basic geometries
    const towerGroup = new THREE.Group();
    
    // Base of the tower (four legs)
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(2, 20, 2),
        legMaterial
      );
      
      const angle = (i * Math.PI / 2);
      leg.position.set(
        10 * Math.cos(angle),
        10,
        10 * Math.sin(angle)
      );
      
      leg.rotation.z = -Math.atan2(leg.position.x, 20);
      leg.rotation.x = Math.atan2(leg.position.z, 20);
      
      towerGroup.add(leg);
    }
    
    // Middle section
    const middleSection = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 8, 15, 4),
      legMaterial
    );
    middleSection.position.y = 25;
    towerGroup.add(middleSection);
    
    // Upper section
    const upperSection = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 5, 15, 4),
      legMaterial
    );
    upperSection.position.y = 40;
    towerGroup.add(upperSection);
    
    // Top spire
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 1, 10, 8),
      legMaterial
    );
    spire.position.y = 52.5;
    towerGroup.add(spire);
    
    // Add the basic tower to the placeholder
    placeholder.add(towerGroup);
    
    // Add collision detection
    placeholder.userData.isObstacle = true;
  }
  
  return placeholder;
}

function createSagradaFamilia(environment) {
  // Create a simplified Sagrada Familia using basic geometries
  const sagradaGroup = new THREE.Group();
  
  // Base of the cathedral
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(30, 5, 50),
    baseMaterial
  );
  base.position.y = 2.5;
  sagradaGroup.add(base);
  
  // Main towers
  const towerMaterial = new THREE.MeshStandardMaterial({ color: 0xE6BE8A });
  
  // Create multiple towers of different heights
  const towerPositions = [
    { x: -10, z: -20, height: 40, radius: 3 },
    { x: 10, z: -20, height: 45, radius: 3 },
    { x: -10, z: 0, height: 50, radius: 3 },
    { x: 10, z: 0, height: 55, radius: 3 },
    { x: -10, z: 20, height: 40, radius: 3 },
    { x: 10, z: 20, height: 45, radius: 3 },
  ];
  
  towerPositions.forEach(pos => {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(pos.radius * 0.5, pos.radius, pos.height, 8),
      towerMaterial
    );
    tower.position.set(pos.x, pos.height / 2 + 5, pos.z);
    
    // Add a spire to each tower
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(pos.radius * 0.5, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xFFD700 })
    );
    spire.position.y = pos.height / 2 + 5;
    tower.add(spire);
    
    sagradaGroup.add(tower);
  });
  
  // Position the cathedral in the environment
  sagradaGroup.position.set(-150, 0, 100);
  sagradaGroup.castShadow = true;
  
  // Add collision detection
  sagradaGroup.userData.isObstacle = true;
  
  environment.add(sagradaGroup);
}

function createTrees(environment) {
  // Create a set of simple low-poly trees scattered around
  const treePositions = [];
  
  // Generate random positions for trees, avoiding landmarks
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 800 - 400;
    const z = Math.random() * 800 - 400;
    
    // Avoid placing trees near landmarks
    const distToEiffel = Math.sqrt(Math.pow(x - 100, 2) + Math.pow(z + 50, 2));
    const distToSagrada = Math.sqrt(Math.pow(x + 150, 2) + Math.pow(z - 100, 2));
    
    if (distToEiffel > 50 && distToSagrada > 70) {
      treePositions.push({ x, z });
    }
  }
  
  // Create tree instances
  treePositions.forEach(pos => {
    const tree = createTree();
    tree.position.set(pos.x, 0, pos.z);
    environment.add(tree);
  });
}

function createTree() {
  const treeGroup = new THREE.Group();
  
  // Tree trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.5, 1, 5, 6);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = 2.5;
  trunk.castShadow = true;
  treeGroup.add(trunk);
  
  // Tree foliage (low-poly)
  const foliageGeometry = new THREE.ConeGeometry(3, 7, 6);
  const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.position.y = 8;
  foliage.castShadow = true;
  treeGroup.add(foliage);
  
  // Add collision detection
  treeGroup.userData.isObstacle = true;
  
  return treeGroup;
} 
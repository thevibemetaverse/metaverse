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
  
  // Create landmarks - position them to match the reference image
  createEiffelTower(environment, loadingManager);
  createSagradaFamilia(environment, loadingManager);
  
  // Create portal frame
  createPortalFrame(environment, loadingManager);
  
  // Reduce the number of trees to make landmarks more visible
  createTrees(environment, 50); // Reduced number of trees
  
  return environment;
}

function createSky(scene) {
  // Create a bright blue sky similar to the screenshot
  scene.background = new THREE.Color(0x87CEEB);
  
  // Add a simple directional light to simulate sun
  const sunLight = new THREE.DirectionalLight(0xFFFFAA, 1.2);
  sunLight.position.set(100, 100, 100);
  sunLight.castShadow = true;
  
  // Improve shadow quality
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 500;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  
  scene.add(sunLight);
  
  // Add ambient light to brighten shadows
  const ambientLight = new THREE.AmbientLight(0xCCDDFF, 0.5);
  scene.add(ambientLight);
}

function createTerrain(environment) {
  // Create a completely flat ground plane for the player to walk on
  const groundGeometry = new THREE.PlaneGeometry(500, 500);
  
  // Create a vibrant green material for the ground
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x4CBB17, // Kelly Green - vibrant green
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1
  });
  
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = 0; // Place at y=0
  ground.receiveShadow = true;
  environment.add(ground);
  
  // Add collision detection for the ground
  ground.userData.isGround = true;
  
  // Add background hills
  createBackgroundHills(environment);
}

// New function to create larger background hills
function createBackgroundHills(environment) {
  // Create several large hills in the background
  const hillColors = [
    0x7EC850, // Light green
    0x71BC78, // Fern green
    0x4CBB17, // Kelly green
    0x3CB371  // Medium sea green
  ];
  
  // Create a continuous range of hills in the far background
  const hillSegments = 16; // Increased number of segments for smoother appearance
  const baseDistance = 800; // Place hills even further back
  
  for (let i = 0; i < hillSegments; i++) {
    const angle = (i / hillSegments) * Math.PI * 2;
    const x = Math.cos(angle) * baseDistance;
    const z = Math.sin(angle) * baseDistance;
    
    // Create a hill geometry - use a half sphere for a smoother look
    const hillGeometry = new THREE.SphereGeometry(250 + Math.random() * 50, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hillMaterial = new THREE.MeshStandardMaterial({
      color: hillColors[i % hillColors.length],
      flatShading: false,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const hill = new THREE.Mesh(hillGeometry, hillMaterial);
    hill.position.set(x, -180, z); // Position lower to create just the top of hills visible
    hill.scale.y = 0.6 + Math.random() * 0.2; // Less height variation
    hill.scale.x = 1.8 + Math.random() * 0.4; // More horizontal stretch
    hill.scale.z = 1.8 + Math.random() * 0.4;
    hill.rotation.y = angle; // Align with the circle
    hill.castShadow = true;
    hill.receiveShadow = true;
    environment.add(hill);
  }
  
  // Add a second row of hills slightly closer with offset angles for more depth
  const innerHillSegments = 12;
  const innerDistance = baseDistance - 100;
  
  for (let i = 0; i < innerHillSegments; i++) {
    const offsetAngle = ((i + 0.5) / innerHillSegments) * Math.PI * 2;
    const innerX = Math.cos(offsetAngle) * innerDistance;
    const innerZ = Math.sin(offsetAngle) * innerDistance;
    
    const innerHillGeometry = new THREE.SphereGeometry(200 + Math.random() * 40, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const innerHill = new THREE.Mesh(innerHillGeometry, new THREE.MeshStandardMaterial({
      color: hillColors[(i + 1) % hillColors.length],
      flatShading: false,
      roughness: 0.9,
      metalness: 0.1
    }));
    
    innerHill.position.set(innerX, -150, innerZ);
    innerHill.scale.y = 0.5 + Math.random() * 0.2;
    innerHill.scale.x = 1.6 + Math.random() * 0.3;
    innerHill.scale.z = 1.6 + Math.random() * 0.3;
    innerHill.rotation.y = offsetAngle;
    innerHill.castShadow = true;
    innerHill.receiveShadow = true;
    environment.add(innerHill);
  }
}

// Function to create a billboard with an image
function createBillboard(imageUrl, width = 50, height = 5) {
  // Create a canvas to draw the image
  const canvas = document.createElement('canvas');
  canvas.width = 1000; // High resolution for better quality
  canvas.height = 1000;
  const context = canvas.getContext('2d');
  
  // Create a new image
  const img = new Image();
  img.crossOrigin = 'anonymous'; // Enable CORS
  
  // Create a promise to handle image loading
  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image centered and scaled
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      context.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      
      // Create material
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      // Create mesh
      const geometry = new THREE.PlaneGeometry(width, height);
      const billboard = new THREE.Mesh(geometry, material);
      
      resolve(billboard);
    };
    
    img.onerror = reject;
    img.src = imageUrl;
  });
}

function createEiffelTower(environment, loadingManager) {
  // Create a placeholder for the tower while it loads
  const placeholder = new THREE.Group();
  // Position the Eiffel Tower much closer to the starting position
  placeholder.position.set(20, 0, -20); // Moved much closer to the starting point
  environment.add(placeholder);
  
  // Try to load the GLB/GLTF model first
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/eiffel_tower.glb', // or .gltf
    function(gltf) {
      // Model loaded successfully
      const model = gltf.scene;
      
      // Scale and position the model - make it appropriate for closer viewing
      model.scale.set(3, 4, 3); // Adjusted scale for closer viewing
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
      
      // Add billboard to the Eiffel Tower
      createBillboard('/assets/images/Bidtreat.jpg', 15, 10)
        .then(billboard => {
          // Position the billboard much closer to the starting position
          billboard.position.set(0, 20, 4); // Moved much closer to starting position
          
          // Make the billboard  face the camera          
          // Add the billboard to the placeholder
          placeholder.add(billboard);
          
          console.log('Billboard added to Eiffel Tower');
        })
        .catch(error => {
          console.error('Error creating billboard:', error);
        });
      
      console.log('Eiffel Tower model loaded successfully - positioned in the distance');
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

function createSagradaFamilia(environment, loadingManager) {
  // Create a placeholder for the Sagrada Familia
  const placeholder = new THREE.Group();
  // Position it to be to the right and behind the Eiffel Tower relative to player spawn
  placeholder.position.set(50, 0, -70); // Right and behind the Eiffel Tower
  environment.add(placeholder);
  
  // Try to load the GLB model first
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/sagrada_familia_2.glb',
    function(gltf) {
      // Model loaded successfully
      const model = gltf.scene;
      
      // Scale and position the model - make it 10x smaller than current size
      model.scale.set(1, 1, 1); // Reduced from 0.8 to 0.08 (10x smaller than before)
      model.position.set(75, 0, -70);
      
      // Rotate the model to face toward the player
      model.rotation.y = Math.PI / 6; // 30-degree rotation to show a good angle from player's view
      
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
      
      console.log('Sagrada Familia model loaded successfully - scaled down to 1/100th of original size');
    },
    function(xhr) {
      // Loading progress
      console.log('Sagrada Familia: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      // Error loading GLTF, fall back to basic geometries
      console.warn('Error loading Sagrada Familia model, falling back to basic geometries:', error);
      createBasicSagradaFamilia(placeholder);
    }
  );
  
  // Function to create a basic Sagrada Familia with geometries as fallback
  function createBasicSagradaFamilia(placeholder) {
    console.log('Creating basic Sagrada Familia with geometries');
    
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
    
    // Add the basic Sagrada to the placeholder
    placeholder.add(sagradaGroup);
  }
  
  return placeholder;
}

function createPortalFrame(environment, loadingManager) {
  // Create a placeholder for the portal frame
  const placeholder = new THREE.Group();
  // Position the portal frame in front of the player spawn
  placeholder.position.set(0, 0, 30);
  environment.add(placeholder);
  
  // Load the GLB model
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/portal_frame.glb',
    function(gltf) {
      // Model loaded successfully
      const model = gltf.scene;
      
      // Scale and position the model - make it 100x smaller
      model.scale.set(0.02, 0.02, 0.02);
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
      
      console.log('Portal frame model loaded successfully - scaled down to 1/100th of original size');
    },
    function(xhr) {
      // Loading progress
      console.log('Portal frame: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      // Error loading GLTF, fall back to basic geometries
      console.warn('Error loading portal frame model, falling back to basic geometries:', error);
      createBasicPortalFrame(placeholder);
    }
  );
  
  // Function to create a basic portal frame with geometries as fallback
  function createBasicPortalFrame(placeholder) {
    console.log('Creating basic portal frame with geometries');
    
    // Create a simplified portal frame using basic geometries
    const portalGroup = new THREE.Group();
    
    // Frame material
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.8,
      metalness: 0.2
    });
    
    // Main frame structure - scaled down to 1/100th
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.15, 0.01),
      frameMaterial
    );
    frame.position.y = 0.075;
    portalGroup.add(frame);
    
    // Portal opening - scaled down to 1/100th
    const portalMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x000000,
      transparent: true,
      opacity: 0.8
    });
    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.13),
      portalMaterial
    );
    portal.position.z = 0.001; // Slightly in front of the frame
    portal.position.y = 0.07;
    portalGroup.add(portal);
    
    // Add some decorative elements
    const decorationMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xDAA520,
      roughness: 0.6,
      metalness: 0.4
    });
    
    // Add corner decorations - scaled down to 1/100th
    const cornerPositions = [
      { x: -0.05, y: 0.15, z: 0 },
      { x: 0.05, y: 0.15, z: 0 },
      { x: -0.05, y: 0, z: 0 },
      { x: 0.05, y: 0, z: 0 }
    ];
    
    cornerPositions.forEach(pos => {
      const corner = new THREE.Mesh(
        new THREE.SphereGeometry(0.005, 8, 8),
        decorationMaterial
      );
      corner.position.set(pos.x, pos.y, pos.z);
      portalGroup.add(corner);
    });
    
    // Add the basic portal frame to the placeholder
    placeholder.add(portalGroup);
  }
  
  return placeholder;
}

function createTrees(environment, numTrees = 150) {
  // Create a set of simple low-poly trees scattered around
  const treePositions = [];
  
  // Generate random positions for trees, avoiding landmarks
  for (let i = 0; i < numTrees; i++) {
    const x = Math.random() * 800 - 400;
    const z = Math.random() * 800 - 400;
    
    // Avoid placing trees near landmarks and player spawn
    const distToEiffel = Math.sqrt(Math.pow(x - 30, 2) + Math.pow(z + 50, 2));
    const distToSagrada = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(z + 30, 2));
    const distToSpawn = Math.sqrt(Math.pow(x, 2) + Math.pow(z, 2));
    
    if (distToEiffel > 50 && distToSagrada > 50 && distToSpawn > 30) {
      // Add some clustering to make tree groups
      if (Math.random() < 0.3) {
        // Add a cluster of trees
        const clusterSize = Math.floor(Math.random() * 3) + 2;
        for (let j = 0; j < clusterSize; j++) {
          const offsetX = Math.random() * 15 - 7.5;
          const offsetZ = Math.random() * 15 - 7.5;
          treePositions.push({ 
            x: x + offsetX, 
            z: z + offsetZ,
            scale: 0.7 + Math.random() * 0.6 // Varied scale for natural look
          });
        }
      } else {
        treePositions.push({ 
          x, 
          z,
          scale: 0.8 + Math.random() * 0.4 // Varied scale for natural look
        });
      }
    }
  }
  
  // Create tree instances
  treePositions.forEach(pos => {
    const tree = createTree();
    tree.position.set(pos.x, 0, pos.z);
    tree.scale.set(pos.scale, pos.scale, pos.scale);
    environment.add(tree);
  });
}

function createTree() {
  const treeGroup = new THREE.Group();
  
  // Tree trunk - shorter and thicker
  const trunkGeometry = new THREE.CylinderGeometry(0.7, 1.2, 3, 6);
  const trunkMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.9,
    metalness: 0.1
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  treeGroup.add(trunk);
  
  // Tree foliage - more stylized, rounded shape like in the screenshot
  const foliageGeometry = new THREE.SphereGeometry(3, 8, 8);
  const foliageMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x228B22, // Forest green
    roughness: 0.8,
    metalness: 0.1
  });
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.position.y = 5;
  foliage.scale.y = 1.2; // Slightly elongated vertically
  foliage.castShadow = true;
  treeGroup.add(foliage);
  
  // Add a second, smaller foliage sphere on top for some trees (randomly)
  if (Math.random() < 0.4) {
    const topFoliageGeometry = new THREE.SphereGeometry(2, 8, 8);
    const topFoliage = new THREE.Mesh(topFoliageGeometry, foliageMaterial);
    topFoliage.position.y = 7.5;
    topFoliage.scale.y = 1.1;
    topFoliage.castShadow = true;
    treeGroup.add(topFoliage);
  }
  
  // Add collision detection
  treeGroup.userData.isObstacle = true;
  
  return treeGroup;
} 
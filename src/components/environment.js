import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

// Custom portal shader
const portalVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const portalFragmentShader = `
  uniform sampler2D map;
  uniform float time;
  uniform float distortionStrength;
  uniform vec3 glowColor;
  uniform float glowIntensity;
  
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    // Create a rippling effect
    float ripple = sin(vUv.x * 10.0 + time) * 0.5 + 0.5;
    ripple *= sin(vUv.y * 8.0 + time * 0.7) * 0.5 + 0.5;
    
    // Create a circular distortion
    vec2 center = vec2(0.5, 0.5);
    float dist = length(vUv - center);
    float circle = smoothstep(0.5, 0.0, dist);
    
    // Combine ripple and circle effects
    float distortion = ripple * circle * distortionStrength;
    
    // Apply distortion to UV coordinates
    vec2 distortedUv = vUv + vec2(distortion, distortion);
    
    // Sample the texture with distorted UVs
    vec4 texColor = texture2D(map, distortedUv);
    
    // Add glow effect
    vec3 glow = glowColor * glowIntensity * circle;
    
    // Combine texture and glow
    vec3 finalColor = texColor.rgb + glow;
    
    // Add some color shifting based on position
    finalColor += vec3(sin(vPosition.x * 0.1 + time) * 0.1,
                      sin(vPosition.y * 0.1 + time * 0.7) * 0.1,
                      sin(vPosition.z * 0.1 + time * 1.3) * 0.1);
    
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

// Create a loader manager to track loading progress
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};

// Global variables for billboard dragging
let isDragging = false;
let selectedBillboard = null;
let selectedAxis = null;
let dragStartPosition = new THREE.Vector3();
let dragPlane = new THREE.Plane();
let dragOffset = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let camera = null;
let billboards = [];

// Portal configurations
const portalConfigs = [
  {
    position: { x: -20, z: 25, y: 0 },  // Leftmost portal
    rotation: 0,
    imageUrl: 'assets/images/levels.jpeg',
    targetUrl: 'https://fly.pieter.com/',
    scale: 1.0
  },
  {
    position: { x: -10, z: 25, y: 0 },  // Second from left
    rotation: 0,
    imageUrl: 'assets/images/kyzo.jpeg',
    targetUrl: 'https://game-one-two.vercel.app',
    scale: 1.0
  },
  {
    position: { x: 0, z: 25, y: 0 },  // Center portal
    rotation: 0,
    imageUrl: 'assets/images/darefail.png',
    targetUrl: 'https://ai.darefail.com/flappy/arms/',  // Updated target URL for Flappy Arms
    scale: 1.0
  },
  {
    position: { x: 10, z: 25, y: 0 },  // Second from right
    rotation: 0,
    imageUrl: 'assets/images/yacht.png',
    targetUrl: 'https://yachtvibes.app/',
    scale: 1.0
  },
  {
    position: { x: 20, z: 25, y: 0 },  // Rightmost portal
    rotation: 0,
    imageUrl: null,
    targetUrl: '#',
    scale: 1.0
  },
  {
    position: { x: 0, z: -25, y: 0 },  // Portal behind the user
    rotation: Math.PI,  // Rotate 180 degrees to face the user
    imageUrl: 'assets/images/portal.jpg',  // Using levels image as placeholder
    targetUrl: 'https://portal.pieter.com/',
    scale: 1.0
  }
];

// Add this at the top of the file after the imports
const portalMaterials = [];

export function createEnvironment(scene, mainCamera, loadingManager = new THREE.LoadingManager()) {
  // Store camera reference for dragging
  camera = mainCamera;
  
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
  
  // Create portals from configuration
  const portals = generatePortals(environment, portalConfigs, loadingManager);
  
  // Add office computer
  createOfficeComputer(environment, loadingManager);
  
  // Reduce the number of trees to make landmarks more visible
  createTrees(environment, 50); // Reduced number of trees
  
  // Setup event listeners for dragging
  setupDragControls();
  
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
function createBillboard(parent, imagePath, position, rotationY) {
  // Create a loader for the texture
  const textureLoader = new THREE.TextureLoader();
  
  // Load the image texture
  textureLoader.load(
    imagePath,
    function(texture) {
      // Check if this is an AffordiHome billboard
      const isAffordiHome = imagePath.toLowerCase().includes('affordihome');
      
      // If it's AffordiHome, create a canvas to add text to the image
      if (isAffordiHome) {
        // Create a canvas to combine image and text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas size to match texture
        canvas.width = texture.image.width;
        canvas.height = texture.image.height;
        
        // Draw the original image
        context.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
        
        // Add text
        context.font = 'bold 48px Arial';
        context.fillStyle = '#ffffff'; // White text
        context.strokeStyle = '#000000'; // Black outline
        context.lineWidth = 2;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Position text at the bottom center of the image
        const text = "AffordiHome";
        context.strokeText(text, canvas.width / 2, canvas.height * 0.85);
        context.fillText(text, canvas.width / 2, canvas.height * 0.85);
        
        // Create a new texture from the canvas
        texture = new THREE.CanvasTexture(canvas);
      }
      
      // Get the aspect ratio of the image
      const imageWidth = texture.image.width;
      const imageHeight = texture.image.height;
      const aspectRatio = imageWidth / imageHeight;
      
      // Create a plane with the correct aspect ratio
      const width = 10; // Increased base width in world units for better visibility
      const height = width / aspectRatio;
      const geometry = new THREE.PlaneGeometry(width, height);
      
      // Use MeshStandardMaterial instead of MeshBasicMaterial for better lighting
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        emissive: 0xffffff,     // Add emissive to make it glow slightly
        emissiveMap: texture,   // Use the same texture for the glow
        emissiveIntensity: 0.2, // Subtle glow
        roughness: 0.5,         // Semi-glossy finish
        metalness: 0.1          // Slight metallic look
      });
      
      // Create the billboard mesh
      const billboard = new THREE.Mesh(geometry, material);
      
      // Set position
      billboard.position.copy(position);
      
      // Apply rotation if specified
      billboard.rotation.y = rotationY;
      
      // Add the billboard to the parent
      parent.add(billboard);
      
      // Add to the global billboards array for dragging
      billboards.push(billboard);
      
      // Create axis handles for dragging
      createAxisHandles(billboard);
      
      console.log(`Billboard created with image: ${imagePath}`);
    },
    undefined,
    function(error) {
      console.error(`Error loading billboard image ${imagePath}:`, error);
    }
  );
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
      createBillboard(placeholder, '/assets/images/Bidtreat.jpg', new THREE.Vector3(0, 20, 8), 0);
      
      // Add second billboard for afforihome
      createBillboard(placeholder, '/assets/images/affordihome.jpg', new THREE.Vector3(0, 15, 8), 0);
      
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
            
            // Add billboards to the Eiffel Tower
            addBillboardsToEiffelTower(placeholder);
            
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
            
            // Scale the model
            object.scale.set(5, 5, 5);
            
            // Add the model to the placeholder
            placeholder.add(object);
            
            // Add billboards to the Eiffel Tower
            addBillboardsToEiffelTower(placeholder);
            
            console.log('Eiffel Tower OBJ model loaded successfully without materials');
          },
          function(xhr) {
            // Loading progress
            console.log('Eiffel Tower OBJ (no materials): ' + (xhr.loaded / xhr.total * 100) + '% loaded');
          },
          function(error) {
            // Error loading OBJ, fall back to basic geometries
            console.warn('Error loading OBJ model without materials, falling back to basic geometries:', error);
            createBasicEiffelTower(placeholder);
          }
        );
      }
    );
  }
  
  // Function to create a basic Eiffel Tower using simple geometries
  function createBasicEiffelTower(placeholder) {
    // Create a basic tower using simple geometries
    const towerGroup = new THREE.Group();
    
    // Base of the tower (four legs)
    const legGeometry = new THREE.BoxGeometry(1, 10, 1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    // Create four legs
    const leg1 = new THREE.Mesh(legGeometry, legMaterial);
    leg1.position.set(2, 5, 2);
    leg1.rotation.z = Math.PI / 12; // Slight angle
    towerGroup.add(leg1);
    
    const leg2 = new THREE.Mesh(legGeometry, legMaterial);
    leg2.position.set(-2, 5, 2);
    leg2.rotation.z = -Math.PI / 12; // Slight angle
    towerGroup.add(leg2);
    
    const leg3 = new THREE.Mesh(legGeometry, legMaterial);
    leg3.position.set(2, 5, -2);
    leg3.rotation.z = Math.PI / 12; // Slight angle
    towerGroup.add(leg3);
    
    const leg4 = new THREE.Mesh(legGeometry, legMaterial);
    leg4.position.set(-2, 5, -2);
    leg4.rotation.z = -Math.PI / 12; // Slight angle
    towerGroup.add(leg4);
    
    // Middle section
    const middleGeometry = new THREE.BoxGeometry(3, 15, 3);
    const middleMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const middle = new THREE.Mesh(middleGeometry, middleMaterial);
    middle.position.y = 17.5;
    towerGroup.add(middle);
    
    // Top section
    const topGeometry = new THREE.ConeGeometry(1.5, 10, 4);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 30;
    towerGroup.add(top);
    
    // Add shadows
    towerGroup.traverse(function(node) {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    // Add the tower to the placeholder
    placeholder.add(towerGroup);
    
    // Add billboards to the basic Eiffel Tower
    addBillboardsToEiffelTower(placeholder);
    
    console.log('Basic Eiffel Tower created using geometries');
  }
  
  // Function to add billboards to the Eiffel Tower - removing duplicate billboard creation
  function addBillboardsToEiffelTower(towerGroup) {
    console.log('Adding billboards to Eiffel Tower');
    // Removed duplicate billboard creation calls
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

// Setup event listeners for dragging billboards
function setupDragControls() {
  // Add event listeners to the document
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mousemove', onMouseMove, false);
  document.addEventListener('mouseup', onMouseUp, false);
  
  // Touch events for mobile
  document.addEventListener('touchstart', onTouchStart, false);
  document.addEventListener('touchmove', onTouchMove, false);
  document.addEventListener('touchend', onTouchEnd, false);
  
  console.log('Billboard drag controls initialized');
}

// Mouse event handlers
function onMouseDown(event) {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  checkDragStart();
}

function onMouseMove(event) {
  if (!isDragging) return;
  
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  handleDrag();
}

function onMouseUp(event) {
  isDragging = false;
  selectedBillboard = null;
  selectedAxis = null;
}

// Touch event handlers
function onTouchStart(event) {
  if (event.touches.length > 0) {
    // Prevent default to avoid scrolling
    event.preventDefault();
    
    // Calculate touch position in normalized device coordinates (-1 to +1)
    mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    
    checkDragStart();
  }
}

function onTouchMove(event) {
  if (!isDragging || event.touches.length === 0) return;
  
  // Prevent default to avoid scrolling
  event.preventDefault();
  
  // Calculate touch position in normalized device coordinates (-1 to +1)
  mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  
  handleDrag();
}

function onTouchEnd(event) {
  isDragging = false;
  selectedBillboard = null;
  selectedAxis = null;
}

// Check if we're starting to drag a billboard or axis
function checkDragStart() {
  if (!camera) return;
  
  // Update the raycaster with the mouse position and camera
  raycaster.setFromCamera(mouse, camera);
  
  // Check for intersections with axis handles first
  const axisIntersects = raycaster.intersectObjects(
    billboards.flatMap(billboard => [
      billboard.userData.xAxis,
      billboard.userData.yAxis,
      billboard.userData.zAxis
    ].filter(axis => axis)), // Filter out any undefined axes
    true
  );
  
  if (axisIntersects.length > 0) {
    // We've clicked on an axis handle
    const axisHandle = axisIntersects[0].object;
    selectedAxis = axisHandle;
    selectedBillboard = axisHandle.userData.billboard;
    
    // Store the starting position
    dragStartPosition.copy(selectedBillboard.position);
    
    // Create a drag plane perpendicular to the camera
    const planeNormal = new THREE.Vector3().subVectors(
      camera.position,
      selectedBillboard.position
    ).normalize();
    
    dragPlane.setFromNormalAndCoplanarPoint(
      planeNormal,
      selectedBillboard.position
    );
    
    isDragging = true;
    return;
  }
  
  // If we didn't click an axis, check if we clicked a billboard
  const billboardIntersects = raycaster.intersectObjects(billboards, true);
  
  if (billboardIntersects.length > 0) {
    // We've clicked on a billboard
    selectedBillboard = billboardIntersects[0].object;
    
    // Show the axis handles for this billboard
    if (selectedBillboard.userData.xAxis) {
      selectedBillboard.userData.xAxis.visible = true;
      selectedBillboard.userData.yAxis.visible = true;
      selectedBillboard.userData.zAxis.visible = true;
    }
    
    // Hide axes for all other billboards
    billboards.forEach(billboard => {
      if (billboard !== selectedBillboard && billboard.userData.xAxis) {
        billboard.userData.xAxis.visible = false;
        billboard.userData.yAxis.visible = false;
        billboard.userData.zAxis.visible = false;
      }
    });
  } else {
    // Clicked on nothing, hide all axes
    billboards.forEach(billboard => {
      if (billboard.userData.xAxis) {
        billboard.userData.xAxis.visible = false;
        billboard.userData.yAxis.visible = false;
        billboard.userData.zAxis.visible = false;
      }
    });
  }
}

// Handle dragging along the selected axis
function handleDrag() {
  if (!isDragging || !selectedBillboard || !selectedAxis || !camera) return;
  
  // Cast a ray from the mouse into the scene
  raycaster.setFromCamera(mouse, camera);
  
  // Determine which axis we're dragging along
  const axisDirection = new THREE.Vector3();
  
  if (selectedAxis === selectedBillboard.userData.xAxis) {
    axisDirection.set(1, 0, 0);
  } else if (selectedAxis === selectedBillboard.userData.yAxis) {
    axisDirection.set(0, 1, 0);
  } else if (selectedAxis === selectedBillboard.userData.zAxis) {
    axisDirection.set(0, 0, 1);
  }
  
  // Transform axis direction to world space
  selectedBillboard.parent.localToWorld(axisDirection.add(selectedBillboard.position));
  selectedBillboard.parent.localToWorld(dragStartPosition.clone());
  
  // Create a line representing the drag axis
  const axisLine = new THREE.Line3(
    selectedBillboard.position.clone(),
    axisDirection
  );
  
  // Find the closest point on the axis to the ray
  const closestPoint = new THREE.Vector3();
  const ray = raycaster.ray;
  
  // Calculate the closest point between the ray and the axis line
  const rayPointToLine = new THREE.Vector3();
  ray.closestPointToPoint(axisLine.start, rayPointToLine);
  
  const rayToLineDistance = rayPointToLine.distanceTo(axisLine.start);
  const rayDirection = ray.direction.clone();
  const pointOnRay = ray.origin.clone().add(
    rayDirection.multiplyScalar(rayToLineDistance)
  );
  
  // Project the point onto the axis
  const axisVector = new THREE.Vector3().subVectors(
    axisLine.end,
    axisLine.start
  ).normalize();
  
  const projectedPoint = axisLine.start.clone().add(
    axisVector.multiplyScalar(
      new THREE.Vector3().subVectors(pointOnRay, axisLine.start).dot(axisVector)
    )
  );
  
  // Update the billboard position along the selected axis
  const newPosition = new THREE.Vector3();
  
  if (selectedAxis === selectedBillboard.userData.xAxis) {
    newPosition.set(
      projectedPoint.x,
      selectedBillboard.position.y,
      selectedBillboard.position.z
    );
  } else if (selectedAxis === selectedBillboard.userData.yAxis) {
    newPosition.set(
      selectedBillboard.position.x,
      projectedPoint.y,
      selectedBillboard.position.z
    );
  } else if (selectedAxis === selectedBillboard.userData.zAxis) {
    newPosition.set(
      selectedBillboard.position.x,
      selectedBillboard.position.y,
      projectedPoint.z
    );
  }
  
  // Convert the world position back to local space
  selectedBillboard.parent.worldToLocal(newPosition);
  
  // Update the billboard position
  selectedBillboard.position.copy(newPosition);
  
  // Update the axis handles position
  updateAxisHandles(selectedBillboard);
  
  // Log the new position for debugging
  console.log(`Billboard position: ${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)}`);
}

// Update the position of axis handles for a billboard
function updateAxisHandles(billboard) {
  if (!billboard.userData.xAxis) return;
  
  // Calculate axis length based on billboard geometry
  const geometry = billboard.geometry;
  const parameters = geometry.parameters;
  const axisLength = Math.max(parameters.width, parameters.height) * 0.5;
  
  // Position the axis handles relative to the billboard
  billboard.userData.xAxis.position.set(axisLength / 2, 0, 0);
  billboard.userData.yAxis.position.set(0, axisLength / 2, 0);
  billboard.userData.zAxis.position.set(0, 0, axisLength / 2);
}

// Create axis handles for dragging
function createAxisHandles(billboard) {
  // Create a group to hold the axis handles
  const axisGroup = new THREE.Group();
  billboard.add(axisGroup);
  
  // Calculate axis length based on billboard geometry
  const geometry = billboard.geometry;
  const parameters = geometry.parameters;
  const axisLength = Math.max(parameters.width, parameters.height) * 0.5;
  
  // Create X axis (red)
  const xAxisGeometry = new THREE.CylinderGeometry(0.1, 0.1, axisLength, 8);
  xAxisGeometry.rotateZ(Math.PI / 2); // Rotate to point along X axis
  const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const xAxis = new THREE.Mesh(xAxisGeometry, xAxisMaterial);
  xAxis.position.set(axisLength / 2, 0, 0);
  
  // Create X axis arrow cone
  const xArrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
  xArrowGeometry.rotateZ(-Math.PI / 2); // Rotate to point along X axis
  const xArrow = new THREE.Mesh(xArrowGeometry, xAxisMaterial);
  xArrow.position.set(axisLength, 0, 0);
  
  // Create Y axis (green)
  const yAxisGeometry = new THREE.CylinderGeometry(0.1, 0.1, axisLength, 8);
  const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const yAxis = new THREE.Mesh(yAxisGeometry, yAxisMaterial);
  yAxis.position.set(0, axisLength / 2, 0);
  
  // Create Y axis arrow cone
  const yArrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
  const yArrow = new THREE.Mesh(yArrowGeometry, yAxisMaterial);
  yArrow.position.set(0, axisLength, 0);
  
  // Create Z axis (blue)
  const zAxisGeometry = new THREE.CylinderGeometry(0.1, 0.1, axisLength, 8);
  zAxisGeometry.rotateX(Math.PI / 2); // Rotate to point along Z axis
  const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const zAxis = new THREE.Mesh(zAxisGeometry, zAxisMaterial);
  zAxis.position.set(0, 0, axisLength / 2);
  
  // Create Z axis arrow cone
  const zArrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
  zArrowGeometry.rotateX(Math.PI / 2); // Rotate to point along Z axis
  const zArrow = new THREE.Mesh(zArrowGeometry, zAxisMaterial);
  zArrow.position.set(0, 0, axisLength);
  
  // Add all axes to the group
  axisGroup.add(xAxis);
  axisGroup.add(xArrow);
  axisGroup.add(yAxis);
  axisGroup.add(yArrow);
  axisGroup.add(zAxis);
  axisGroup.add(zArrow);
  
  // Store references to the axis handles
  billboard.userData.xAxis = xAxis;
  billboard.userData.yAxis = yAxis;
  billboard.userData.zAxis = zAxis;
  
  // Store reference to the billboard on each axis
  xAxis.userData.billboard = billboard;
  yAxis.userData.billboard = billboard;
  zAxis.userData.billboard = billboard;
  xArrow.userData.billboard = billboard;
  yArrow.userData.billboard = billboard;
  zArrow.userData.billboard = billboard;
  
  // Hide axes by default
  axisGroup.visible = false;
  
  return axisGroup;
}

function generatePortals(environment, configs, loadingManager) {
  const portals = [];
  
  configs.forEach(config => {
    const portal = createPortalWithConfig(environment, config, loadingManager);
    portals.push(portal);
  });
  
  return portals;
}

function createPortalWithConfig(environment, config, loadingManager) {
  const { position, rotation, imageUrl, targetUrl, scale } = config;
  
  // Create portal group
  const portalGroup = new THREE.Group();
  portalGroup.position.set(position.x, position.y, position.z);
  portalGroup.rotation.y = rotation;
  portalGroup.scale.set(scale, scale, scale);
  environment.add(portalGroup);
  
  // Add collision trigger
  const trigger = createPortalTrigger(targetUrl);
  portalGroup.add(trigger);
  
  // Load portal frame
  loadPortalFrame(portalGroup, loadingManager);
  
  // Add portal image
  addPortalImage(portalGroup, imageUrl, loadingManager);
  
  return portalGroup;
}

function createPortalTrigger(targetUrl) {
  const portalTrigger = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 2),
    new THREE.MeshBasicMaterial({ 
      transparent: true, 
      opacity: 0,
      visible: false 
    })
  );
  portalTrigger.position.set(0, 1.5, 0);
  portalTrigger.userData.isPortal = true;
  portalTrigger.userData.portalURL = targetUrl;
  
  return portalTrigger;
}

function loadPortalFrame(portalGroup, loadingManager) {
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/portal_frame.glb',
    function(gltf) {
      const model = gltf.scene;
      model.scale.set(0.02, 0.02, 0.02);
      
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      portalGroup.add(model);
    },
    null,
    function(error) {
      console.warn('Error loading portal frame model:', error);
      createBasicPortalFrame(portalGroup);
    }
  );
}

function addPortalImage(portalGroup, imageUrl, loadingManager) {
  console.log('Attempting to load portal image:', imageUrl);
  const textureLoader = new THREE.TextureLoader(loadingManager);
  textureLoader.load(
    imageUrl,
    function(texture) {
      console.log('Successfully loaded image:', imageUrl);
      
      const isKyzoImage = imageUrl.includes('kyzo.jpeg');
      const imageGeometry = new THREE.PlaneGeometry(
        4, // width stays the same
        isKyzoImage ? 7 : 6.5  // increased height for levels from 6 to 8
      );
      
      // Create custom shader material with more subtle parameters
      const imageMaterial = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          time: { value: 0 },
          distortionStrength: { value: 0.05 },
          glowColor: { value: new THREE.Color(0xffffff) },
          glowIntensity: { value: 0.3 }
        },
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true,
        renderOrder: 1
      });
      
      // Add the material to our global array
      portalMaterials.push(imageMaterial);
      
      // Create front plane
      const frontMesh = new THREE.Mesh(imageGeometry, imageMaterial);
      frontMesh.position.z = 0.01;
      frontMesh.position.y = isKyzoImage ? 3.5 : 4; // Adjusted Y position for taller levels image
      frontMesh.renderOrder = 1;
      
      // Create back plane
      const backMesh = new THREE.Mesh(imageGeometry, imageMaterial);
      backMesh.position.z = -0.01;
      backMesh.position.y = isKyzoImage ? 3.5 : 4; // Adjusted Y position for taller levels image
      backMesh.rotation.y = Math.PI; // Rotate 180 degrees to face the opposite direction
      backMesh.renderOrder = 1;
      
      console.log('Created portal image meshes:', {
        geometry: imageGeometry.parameters,
        frontPosition: frontMesh.position,
        backPosition: backMesh.position,
        scale: frontMesh.scale
      });
      
      portalGroup.add(frontMesh);
      portalGroup.add(backMesh);
    },
    function(xhr) {
      console.log(imageUrl + ': ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading portal image:', imageUrl, error);
      createFallbackPortalImage(portalGroup);
    }
  );
}

function createFallbackPortalImage(portalGroup) {
  const geometry = new THREE.PlaneGeometry(0.08, 0.13);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -0.001;
  mesh.position.y = 0.07;
  
  portalGroup.add(mesh);
}

function createBasicPortalFrame(portalGroup) {
  const frameGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.01);
  const frameMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.8,
    metalness: 0.2
  });
  
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.y = 0.075;
  portalGroup.add(frame);
}

// Add this function to update all portal materials
export function updatePortalMaterials(deltaTime) {
  portalMaterials.forEach(material => {
    material.uniforms.time.value += deltaTime * 0.5; // Slower animation speed
  });
}

function createOfficeComputer(environment, loadingManager) {
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/office_computer.glb',
    function(gltf) {
      const model = gltf.scene;
      
      // Scale and position the model - make it 100x smaller
      model.scale.set(0.04, 0.04, 0.04); // Reduced from 0.5 to 0.005
      model.position.set(-25, 0, 15); // Position it near the portals
      model.rotation.y = Math.PI + Math.PI / 7; // Face towards the player and rotate 30 degrees counterclockwise
      
      // Add shadows
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Make the entire model clickable
      model.userData.isClickable = true;
      model.userData.targetUrl = 'https://docs.google.com/forms/d/1vEfJJ7eGr-aFvnzMfoNVGWMHGvqZTRtLRE87Vt79Paw/edit';
      
      environment.add(model);
      console.log('Office computer model loaded successfully with clickable trigger');
    },
    function(xhr) {
      console.log('Office computer: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading office computer model:', error);
    }
  );
} 
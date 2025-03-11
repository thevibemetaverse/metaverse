import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Create a loader manager for avatars
const avatarLoadingManager = new THREE.LoadingManager();
avatarLoadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  console.log(`Loading avatar: ${url} (${itemsLoaded}/${itemsTotal})`);
};

// Debug mode - set to true to show bounding boxes and extra logging
const DEBUG_MODE = true;

// Cache for the Zuckerberg model to avoid loading it multiple times
let zuckerbergModelCache = null;
let zuckerbergAnimations = null;
let isLoadingModel = false;
const pendingAvatars = [];

// Expose variables to window for debugging
if (typeof window !== 'undefined') {
  window.DEBUG_MODE = DEBUG_MODE;
  window.zuckerbergModelCache = zuckerbergModelCache;
  window.zuckerbergAnimations = zuckerbergAnimations;
  window.isLoadingModel = isLoadingModel;
}

// Animation mixer map to track each avatar's animations
const mixers = new Map();
const clock = new THREE.Clock();

export function createAvatar(scene, username, loadingManager = avatarLoadingManager) {
  // Create a group to hold the avatar
  const avatarGroup = new THREE.Group();
  avatarGroup.userData.username = username;
  
  // Add username text above avatar immediately
  createUsernameLabel(avatarGroup, username);
  
  // If we already have the model cached, use it
  if (zuckerbergModelCache) {
    const model = zuckerbergModelCache.clone();
    setupModel(model, avatarGroup);
    
    // Setup animations if available
    if (zuckerbergAnimations) {
      setupAnimations(model, avatarGroup, zuckerbergAnimations.clone());
    }
    
    return avatarGroup;
  }
  
  // If we're already loading the model, add this avatar to pending
  if (isLoadingModel) {
    pendingAvatars.push({ group: avatarGroup });
    // Create a temporary basic avatar while loading
    createBasicAvatar(avatarGroup);
    return avatarGroup;
  }
  
  // Start loading the model
  isLoadingModel = true;
  
  // Create a temporary basic avatar while loading
  createBasicAvatar(avatarGroup);
  
  // Load the Zuckerberg GLTF model
  const gltfLoader = new GLTFLoader(loadingManager);
  // In Vite, assets in the public folder are served at the root path
  const modelPath = '/assets/models/zuckerberg.glb';
  console.log('Attempting to load Zuckerberg model from:', modelPath);
  
  gltfLoader.load(
    modelPath,
    function(gltf) {
      console.log('Zuckerberg model loaded successfully', gltf);
      // Model loaded successfully
      const model = gltf.scene;
      
      // Store animations if available
      if (gltf.animations && gltf.animations.length > 0) {
        zuckerbergAnimations = gltf.animations;
        console.log(`Loaded ${gltf.animations.length} animations for Zuckerberg model`);
      } else {
        console.log('No animations found in the Zuckerberg model');
      }
      
      // Cache the model for future use
      zuckerbergModelCache = model.clone();
      
      // Clear the temporary avatar
      while(avatarGroup.children.length > 0) {
        const child = avatarGroup.children[0];
        if (child.userData.isUsernameLabel) {
          // Keep the username label
          avatarGroup.remove(child);
          avatarGroup.children = [];
          avatarGroup.add(child);
          break;
        } else {
          avatarGroup.remove(child);
        }
      }
      
      // Setup the model
      setupModel(model.clone(), avatarGroup);
      
      // Setup animations if available
      if (zuckerbergAnimations) {
        setupAnimations(model, avatarGroup, zuckerbergAnimations);
      }
      
      // Process any pending avatars
      pendingAvatars.forEach(pending => {
        // Clear the temporary avatar
        while(pending.group.children.length > 0) {
          const child = pending.group.children[0];
          if (child.userData.isUsernameLabel) {
            // Keep the username label
            pending.group.remove(child);
            pending.group.children = [];
            pending.group.add(child);
            break;
          } else {
            pending.group.remove(child);
          }
        }
        
        // Add the model
        const pendingModel = zuckerbergModelCache.clone();
        setupModel(pendingModel, pending.group);
        
        // Setup animations if available
        if (zuckerbergAnimations) {
          setupAnimations(pendingModel, pending.group, zuckerbergAnimations);
        }
      });
      
      // Clear pending avatars
      pendingAvatars.length = 0;
      isLoadingModel = false;
      
      console.log('Zuckerberg model loaded successfully');
    },
    function(xhr) {
      // Loading progress
      console.log('Zuckerberg model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      // Error loading model, use basic avatar
      console.error('Error loading Zuckerberg model:', error);
      console.warn('Using basic avatar as fallback');
      isLoadingModel = false;
      
      // Process any pending avatars with basic avatars
      pendingAvatars.forEach(pending => {
        // Make sure the basic avatar is still there
        if (pending.group.children.length === 1) { // Only username label
          createBasicAvatar(pending.group);
        }
      });
      
      // Clear pending avatars
      pendingAvatars.length = 0;
    }
  );
  
  return avatarGroup;
}

function setupModel(model, avatarGroup) {
  // Try different scale and position values for the Zuckerberg model
  // These values may need to be adjusted based on the specific model
  model.scale.set(1.0, 1.0, 1.0); // Increased scale
  model.position.y = 1.0; // Raised position to ensure it's above ground
  
  // Some models might need rotation to face the correct direction
  model.rotation.y = Math.PI; // Rotate 180 degrees if needed
  
  // Check if the model has any meshes
  let hasMeshes = false;
  model.traverse(function(node) {
    if (node.isMesh) {
      hasMeshes = true;
      
      // Ensure materials are properly set up
      if (!node.material) {
        console.warn('Mesh has no material:', node.name);
        node.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
      }
      
      // Check if the mesh has a geometry
      if (!node.geometry) {
        console.warn('Mesh has no geometry:', node.name);
      }
    }
  });
  
  if (!hasMeshes) {
    console.error('Model has no meshes! Creating a placeholder cube.');
    // Create a placeholder cube if no meshes are found
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    cube.position.y = 1;
    model.add(cube);
  }
  
  // Debug logging for model
  if (DEBUG_MODE) {
    console.log('Model setup:', model);
    
    // Log all meshes in the model
    model.traverse(function(node) {
      if (node.isMesh) {
        console.log('Mesh found in model:', node.name);
      }
    });
    
    // Create a bounding box helper to visualize the model
    const bbox = new THREE.Box3().setFromObject(model);
    const bboxHelper = new THREE.Box3Helper(bbox, 0xff0000);
    bboxHelper.isHelper = true;
    avatarGroup.add(bboxHelper);
    
    // Log model dimensions
    const size = new THREE.Vector3();
    bbox.getSize(size);
    console.log('Model dimensions:', size);
    
    // Add axes helper to show orientation
    const axesHelper = new THREE.AxesHelper(2);
    axesHelper.isHelper = true;
    avatarGroup.add(axesHelper);
  }
  
  // Add shadows
  model.traverse(function(node) {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  
  // Add the model to the avatar group
  avatarGroup.add(model);
  
  // Add collision detection
  const avatarBoundingBox = new THREE.Box3().setFromObject(avatarGroup);
  const avatarSize = new THREE.Vector3();
  avatarBoundingBox.getSize(avatarSize);
  
  avatarGroup.userData.boundingBox = avatarBoundingBox;
  avatarGroup.userData.size = avatarSize;
  avatarGroup.userData.isAvatar = true;
}

function setupAnimations(model, avatarGroup, animations) {
  // Create an animation mixer for this avatar
  const mixer = new THREE.AnimationMixer(model);
  
  // Store the mixer in our map using the avatar group as the key
  mixers.set(avatarGroup, mixer);
  
  // Create animation actions
  const animationActions = {};
  
  // Process each animation
  animations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    animationActions[clip.name] = action;
    
    // If this is an idle animation, play it by default
    if (clip.name.toLowerCase().includes('idle')) {
      action.play();
    }
  });
  
  // Store animation actions on the avatar group for later use
  avatarGroup.userData.animationActions = animationActions;
  
  // Add methods to control animations
  avatarGroup.playAnimation = function(name) {
    const action = animationActions[name];
    if (action) {
      // Stop any current animations
      Object.values(animationActions).forEach(a => {
        if (a !== action) a.stop();
      });
      // Play the requested animation
      action.reset().play();
      return true;
    }
    return false;
  };
  
  // Play a walking animation when the avatar is moving
  avatarGroup.userData.isMoving = false;
  avatarGroup.setMoving = function(isMoving) {
    if (isMoving !== this.userData.isMoving) {
      this.userData.isMoving = isMoving;
      
      // Find walk/run animation
      let walkAction = null;
      for (const name in animationActions) {
        if (name.toLowerCase().includes('walk') || name.toLowerCase().includes('run')) {
          walkAction = animationActions[name];
          break;
        }
      }
      
      // Find idle animation
      let idleAction = null;
      for (const name in animationActions) {
        if (name.toLowerCase().includes('idle')) {
          idleAction = animationActions[name];
          break;
        }
      }
      
      // Play appropriate animation
      if (isMoving && walkAction) {
        if (idleAction) idleAction.stop();
        walkAction.reset().play();
      } else if (!isMoving && idleAction) {
        if (walkAction) walkAction.stop();
        idleAction.reset().play();
      }
    }
  };
}

// Update all animation mixers - call this in the animation loop
export function updateAvatarAnimations() {
  const delta = clock.getDelta();
  mixers.forEach((mixer) => {
    mixer.update(delta);
  });
}

function createBasicAvatar(avatarGroup) {
  // Create a simplified avatar using basic geometries as a fallback
  
  // Create the avatar body
  const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 1;
  avatarGroup.add(body);
  
  // Create the avatar head
  const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFCC99 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 2.4;
  avatarGroup.add(head);
  
  // Create the avatar arms
  const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  
  // Left arm
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.7, 1.2, 0);
  leftArm.rotation.z = Math.PI / 2;
  avatarGroup.add(leftArm);
  
  // Right arm
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.7, 1.2, 0);
  rightArm.rotation.z = -Math.PI / 2;
  avatarGroup.add(rightArm);
  
  // Create the avatar legs
  const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  
  // Left leg
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.3, 0, 0);
  avatarGroup.add(leftLeg);
  
  // Right leg
  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.3, 0, 0);
  avatarGroup.add(rightLeg);
  
  // Add buttons to the shirt
  const buttonGeometry = new THREE.CircleGeometry(0.05, 8);
  const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  
  for (let i = 0; i < 3; i++) {
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(0, 1 + i * 0.3, 0.51);
    button.rotation.x = Math.PI / 2;
    avatarGroup.add(button);
  }
  
  // Set up shadows
  avatarGroup.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

function createUsernameLabel(avatarGroup, username) {
  // Create a canvas for the username text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  
  // Set up the canvas
  context.fillStyle = 'rgba(0, 0, 0, 0.5)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw the text
  context.font = 'bold 24px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(username, canvas.width / 2, canvas.height / 2);
  
  // Create a texture from the canvas
  const texture = new THREE.CanvasTexture(canvas);
  
  // Create a sprite material with the texture
  const material = new THREE.SpriteMaterial({ map: texture });
  
  // Create a sprite with the material
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.5, 1);
  sprite.position.y = 3;
  
  // Mark this as a username label
  sprite.userData.isUsernameLabel = true;
  
  // Add the sprite to the avatar group
  avatarGroup.add(sprite);
  
  return sprite;
} 
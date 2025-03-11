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

// Expose mixers to window for debugging and access from other files
if (typeof window !== 'undefined') {
  window.DEBUG_MODE = DEBUG_MODE;
  window.zuckerbergModelCache = zuckerbergModelCache;
  window.zuckerbergAnimations = zuckerbergAnimations;
  window.isLoadingModel = isLoadingModel;
  window.mixers = mixers;
}

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
  const modelPath = '/assets/models/zuckerberg2.glb';
  console.log('Attempting to load Zuckerberg model from:', modelPath);
  
  gltfLoader.load(
    modelPath,
    function(gltf) {
      console.log('Zuckerberg model loaded successfully', gltf);
      // Model loaded successfully
      const model = gltf.scene;
      
      // Apply initial fixes to the model before caching
      // Simple direct fix for the compressed model
      model.scale.set(0.6, 0.6, 0.6); // Make the model smaller (reduced from 1.0 to 0.6)
      model.position.y = 0.0; // Position at ground level
      
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
  // Settings for the new zuckerberg2.glb model
  model.scale.set(0.6, 0.6, 0.6); // Make the model smaller (reduced from 1.0 to 0.6)
  model.position.y = 0.0; // Position at ground level
  
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
      
      // Add shadows
      node.castShadow = true;
      node.receiveShadow = true;
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
  
  // Log all available animations with more details
  console.log('Available animations in model:');
  animations.forEach((clip, index) => {
    console.log(`Animation ${index}: "${clip.name}" (duration: ${clip.duration}s)`);
    
    // Create the animation action
    const action = mixer.clipAction(clip);
    action.timeScale = 0.8;
    animationActions[clip.name] = action;
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
      
      // Play appropriate animation with smooth transitions
      if (isMoving && walkAction) {
        if (idleAction) {
          idleAction.fadeOut(0.5);
        }
        walkAction.reset().fadeIn(0.5).play();
      } else if (!isMoving && idleAction) {
        if (walkAction) {
          walkAction.fadeOut(0.5);
        }
        idleAction.reset().fadeIn(0.5).play();
      }
    }
  };
}

// Update all animation mixers - call this in the animation loop
export function updateAvatarAnimations() {
  const delta = clock.getDelta();
  
  // Log animation update every few seconds
  const now = Date.now();
  const logInterval = 5000; // Log every 5 seconds
  const shouldLog = (now % logInterval < 50); // Log if within the first 50ms of each interval
  
  if (shouldLog) {
    console.log(`Updating ${mixers.size} animation mixers with delta: ${delta}`);
  }
  
  mixers.forEach((mixer, avatar) => {
    mixer.update(delta);
    
    if (shouldLog && avatar.userData && avatar.userData.currentAnimation) {
      console.log(`Avatar ${avatar.userData.username} playing animation: ${avatar.userData.currentAnimation}`);
    }
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

export function createSimpleAvatar(scene, username, loadingManager = avatarLoadingManager) {
  console.log('Creating simple avatar for:', username);
  
  // Create a completely clean group to hold the avatar
  const avatarGroup = new THREE.Group();
  avatarGroup.userData.username = username;
  avatarGroup.userData.isAvatar = true;
  
  // Add username text above avatar
  const usernameLabel = createUsernameLabel(avatarGroup, username);
  console.log('Username label created');
  
  // Create a basic avatar immediately so there's something visible
  createBasicAvatar(avatarGroup);
  console.log('Basic avatar created as placeholder');
  
  // Load the original Zuckerberg GLTF model directly
  const gltfLoader = new GLTFLoader(loadingManager);
  const modelPath = '/assets/models/zuckerberg.glb';
  console.log('Attempting to load player avatar model from:', modelPath);
  
  try {
    gltfLoader.load(
      modelPath,
      function(gltf) {
        console.log('Player avatar model loaded successfully', gltf);
        
        try {
          const model = gltf.scene;
          
          // Remove the basic avatar first
          avatarGroup.children.forEach(child => {
            if (!child.userData.isUsernameLabel) {
              avatarGroup.remove(child);
            }
          });
          
          // Apply scaling and positioning
          model.scale.set(1, 1, 1); // Normal scale for zuckerberg.glb
          model.position.y = -0.5; // Adjust position to ensure feet are at ground level
          model.rotation.y = Math.PI; // Rotate to face forward
          
          // Setup shadows and remove any unwanted geometry
          model.traverse(function(node) {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              
              // Check for any helper objects or strange geometry and remove them
              if (node.name.includes('helper') || node.name.includes('debug') || 
                  node.name.includes('collision') || node.name.includes('bound')) {
                node.visible = false;
              }
            }
          });
          
          // Add the model to the avatar group
          avatarGroup.add(model);
          console.log('Model added to avatar group');
          
          // Setup animations if available
          if (gltf.animations && gltf.animations.length > 0) {
            console.log('Setting up animations:', gltf.animations.length);
            const mixer = new THREE.AnimationMixer(model);
            mixers.set(avatarGroup, mixer);
            
            // Create animation actions
            const animationActions = {};
            
            gltf.animations.forEach((clip) => {
              const action = mixer.clipAction(clip);
              action.timeScale = 0.8;
              animationActions[clip.name] = action;
              
              // Play idle animation by default
              if (clip.name.toLowerCase().includes('idle')) {
                action.play();
              }
            });
            
            // Store animation actions on the avatar group
            avatarGroup.userData.animationActions = animationActions;
            
            // Add animation control methods
            avatarGroup.playAnimation = function(name) {
              const action = animationActions[name];
              if (action) {
                Object.values(animationActions).forEach(a => {
                  if (a !== action) a.stop();
                });
                action.reset().play();
                return true;
              }
              return false;
            };
            
            // Add moving state control
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
                
                // Play appropriate animation with smooth transitions
                if (isMoving && walkAction) {
                  if (idleAction) {
                    idleAction.fadeOut(0.5);
                  }
                  walkAction.reset().fadeIn(0.5).play();
                } else if (!isMoving && idleAction) {
                  if (walkAction) {
                    walkAction.fadeOut(0.5);
                  }
                  idleAction.reset().fadeIn(0.5).play();
                }
              }
            };
          } else {
            console.log('No animations found in model');
          }
          
          // Add collision detection
          const avatarBoundingBox = new THREE.Box3().setFromObject(avatarGroup);
          const avatarSize = new THREE.Vector3();
          avatarBoundingBox.getSize(avatarSize);
          
          avatarGroup.userData.boundingBox = avatarBoundingBox;
          avatarGroup.userData.size = avatarSize;
          
          // Add debug visuals if in debug mode, but keep them hidden by default
          if (DEBUG_MODE) {
            const bbox = new THREE.Box3().setFromObject(model);
            const bboxHelper = new THREE.Box3Helper(bbox, 0xff0000);
            bboxHelper.isHelper = true;
            bboxHelper.visible = false; // Hide by default
            avatarGroup.add(bboxHelper);
            
            const axesHelper = new THREE.AxesHelper(2);
            axesHelper.isHelper = true;
            axesHelper.visible = false; // Hide by default
            avatarGroup.add(axesHelper);
          }
          
          console.log('Avatar setup complete');
        } catch (setupError) {
          console.error('Error setting up avatar model:', setupError);
        }
      },
      function(xhr) {
        // Loading progress
        console.log('Player avatar model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function(error) {
        // Error loading model, keep the basic avatar
        console.error('Error loading player avatar model:', error);
        console.warn('Using basic avatar as fallback for player');
      }
    );
  } catch (loaderError) {
    console.error('Error initializing model loader:', loaderError);
  }
  
  return avatarGroup;
}

export function createDirectAvatar(scene, username, loadingManager = avatarLoadingManager) {
  console.log('Creating direct avatar for:', username);
  
  // Create a group to hold the avatar and label
  const avatarGroup = new THREE.Group();
  avatarGroup.userData.username = username;
  avatarGroup.userData.isAvatar = true;
  
  // Create a basic avatar immediately as a placeholder
  createBasicAvatar(avatarGroup);
  
  // Add username text above avatar
  const usernameLabel = createUsernameLabel(avatarGroup, username);
  
  // Load the Zuckerberg model directly - using the exact same approach as giant NPCs
  const gltfLoader = new GLTFLoader(loadingManager);
  const modelPath = '/assets/models/zuckerberg.glb';
  
  gltfLoader.load(
    modelPath,
    (gltf) => {
      // Get the model
      const model = gltf.scene;
      
      // Remove the basic avatar
      avatarGroup.children.forEach(child => {
        if (!child.userData.isUsernameLabel) {
          avatarGroup.remove(child);
        }
      });
      
      // Clean up the model - remove any problematic geometry
      model.traverse((node) => {
        // Check for any helper objects or strange geometry and remove them
        if (node.name && (
            node.name.includes('helper') || 
            node.name.includes('debug') || 
            node.name.includes('collision') || 
            node.name.includes('bound') ||
            node.name.includes('skeleton') ||
            node.name.includes('bone') ||
            node.name.includes('ik') ||
            node.name.includes('control')
          )) {
          node.visible = false;
        }
        
        // Set up shadows for meshes
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Apply normal scale (not giant)
      model.scale.set(1, 1, 1);
      
      // Position the model
      model.position.y = -0.5;
      
      // Rotate to face forward
      model.rotation.y = Math.PI;
      
      // Add the model to the avatar group
      avatarGroup.add(model);
      
      // Setup animations if available
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        mixers.set(avatarGroup, mixer);
        
        // Create animation actions
        const animationActions = {};
        
        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.timeScale = 0.8;
          animationActions[clip.name] = action;
          
          // Play idle animation by default
          if (clip.name.toLowerCase().includes('idle')) {
            action.play();
          }
        });
        
        // Store animation actions on the avatar group
        avatarGroup.userData.animationActions = animationActions;
        
        // Add animation control methods
        avatarGroup.playAnimation = function(name) {
          const action = animationActions[name];
          if (action) {
            Object.values(animationActions).forEach(a => {
              if (a !== action) a.stop();
            });
            action.reset().play();
            return true;
          }
          return false;
        };
        
        // Add moving state control
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
            
            // Play appropriate animation with smooth transitions
            if (isMoving && walkAction) {
              if (idleAction) {
                idleAction.fadeOut(0.5);
              }
              walkAction.reset().fadeIn(0.5).play();
            } else if (!isMoving && idleAction) {
              if (walkAction) {
                walkAction.fadeOut(0.5);
              }
              idleAction.reset().fadeIn(0.5).play();
            }
          }
        };
      }
      
      console.log('Direct avatar model loaded successfully');
    },
    (xhr) => {
      // Loading progress
      console.log('Direct avatar model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.error('Error loading direct avatar model:', error);
    }
  );
  
  return avatarGroup;
}

export function createCleanAvatar(scene, username, loadingManager = avatarLoadingManager) {
  console.log('Creating clean avatar for:', username);
  
  // Create a group to hold the avatar and label
  const avatarGroup = new THREE.Group();
  avatarGroup.userData.username = username;
  avatarGroup.userData.isAvatar = true;
  
  // Load the Zuckerberg model directly - EXACTLY like the giant NPCs but with normal scale
  const gltfLoader = new GLTFLoader(loadingManager);
  const modelPath = '/assets/models/zuckerberg.glb';
  
  // Create a basic avatar immediately as a placeholder
  createBasicAvatar(avatarGroup);
  
  // Add username text above avatar
  createUsernameLabel(avatarGroup, username);
  
  gltfLoader.load(
    modelPath,
    (gltf) => {
      // Get the model
      const model = gltf.scene;
      
      // Remove the basic avatar
      avatarGroup.children.forEach(child => {
        if (!child.userData.isUsernameLabel) {
          avatarGroup.remove(child);
        }
      });
      
      // Apply normal scale (not giant)
      model.scale.set(1, 1, 1);
      
      // Position the model
      model.position.y = -0.5;
      
      // Rotate to face forward
      model.rotation.y = Math.PI;
      
      // Add the model to the avatar group
      avatarGroup.add(model);
      
      // Setup animations if available
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        mixers.set(avatarGroup, mixer);
        
        // Create animation actions
        const animationActions = {};
        
        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.timeScale = 0.8;
          animationActions[clip.name] = action;
          
          // Play idle animation by default
          if (clip.name.toLowerCase().includes('idle')) {
            action.play();
          }
        });
        
        // Store animation actions on the avatar group
        avatarGroup.userData.animationActions = animationActions;
        
        // Add moving state control
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
            
            // Play appropriate animation with smooth transitions
            if (isMoving && walkAction) {
              if (idleAction) {
                idleAction.fadeOut(0.5);
              }
              walkAction.reset().fadeIn(0.5).play();
            } else if (!isMoving && idleAction) {
              if (walkAction) {
                walkAction.fadeOut(0.5);
              }
              idleAction.reset().fadeIn(0.5).play();
            }
          }
        };
      }
      
      console.log('Clean avatar model loaded successfully');
    },
    (xhr) => {
      // Loading progress
      console.log('Clean avatar model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.error('Error loading clean avatar model:', error);
    }
  );
  
  return avatarGroup;
}

export function createPureAvatar(scene, username, loadingManager = avatarLoadingManager) {
  console.log('Creating pure avatar for:', username);
  
  // Create a group to hold the avatar and label
  const avatarGroup = new THREE.Group();
  avatarGroup.userData.username = username;
  avatarGroup.userData.isAvatar = true;
  
  // Add username text above avatar
  createUsernameLabel(avatarGroup, username);
  
  // Load the Zuckerberg model EXACTLY like the giant NPCs
  const gltfLoader = new GLTFLoader(loadingManager);
  const modelPath = '/assets/models/zuckerberg.glb';
  const jumpModelPath = '/assets/models/mark_zuckerberg_jump.glb';
  
  // Track loading state
  let mainModelLoaded = false;
  let jumpAnimationLoaded = false;
  let jumpAnimation = null;
  
  // Load the main model
  gltfLoader.load(
    modelPath,
    (gltf) => {
      // Get the model
      const model = gltf.scene;
      
      // Apply normal scale (not giant)
      model.scale.set(1, 1, 1);
      
      // Position the model
      model.position.y = -0.5;
      
      // Rotate to face forward
      model.rotation.y = Math.PI;
      
      // Add the model to the avatar group
      avatarGroup.add(model);
      
      // Setup animations if available
      if (gltf.animations && gltf.animations.length > 0) {
        console.log(`Found ${gltf.animations.length} animations in the main model`);
        
        // Create animation mixer
        const mixer = new THREE.AnimationMixer(model);
        mixers.set(avatarGroup, mixer);
        
        // Create animation actions
        const animationActions = {};
        
        // Log all available animations with more details
        console.log('Available animations in main model:');
        gltf.animations.forEach((clip, index) => {
          console.log(`Animation ${index}: "${clip.name}" (duration: ${clip.duration}s)`);
          
          // Create the animation action
          const action = mixer.clipAction(clip);
          action.timeScale = 0.8;
          animationActions[clip.name] = action;
        });
        
        // Find running and idle animations
        let runAction = null;
        let idleAction = null;
        
        // First try to find animations by exact name match
        for (const name in animationActions) {
          const lowerName = name.toLowerCase();
          
          // Check for running/walking animations
          if (lowerName === 'run' || lowerName === 'walk' || 
              lowerName === 'running' || lowerName === 'walking') {
            runAction = animationActions[name];
            console.log(`Found exact match for running animation: "${name}"`);
          } 
          // Check for idle animations
          else if (lowerName === 'idle' || lowerName === 'stand' || 
                   lowerName === 'standing' || lowerName === 'rest') {
            idleAction = animationActions[name];
            console.log(`Found exact match for idle animation: "${name}"`);
          }
        }
        
        // If we didn't find exact matches, try partial matches
        if (!runAction) {
          for (const name in animationActions) {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('run') || lowerName.includes('walk')) {
              runAction = animationActions[name];
              console.log(`Found partial match for running animation: "${name}"`);
              break;
            }
          }
        }
        
        if (!idleAction) {
          for (const name in animationActions) {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('idle') || lowerName.includes('stand')) {
              idleAction = animationActions[name];
              console.log(`Found partial match for idle animation: "${name}"`);
              break;
            }
          }
        }
        
        // If still no idle animation found, use any animation that's not running
        if (!idleAction && gltf.animations.length > 0) {
          for (const name in animationActions) {
            const lowerName = name.toLowerCase();
            if (!lowerName.includes('run') && !lowerName.includes('walk')) {
              idleAction = animationActions[name];
              console.log(`No specific idle animation found, using "${name}" as fallback`);
              break;
            }
          }
        }
        
        // If we have a running animation but no idle, we'll just stop all animations when idle
        if (runAction && !idleAction) {
          console.log('WARNING: Found running animation but no idle animation. Will stop all animations when idle.');
        }
        
        // If we have no running animation, use the first animation as a fallback
        if (!runAction && gltf.animations.length > 0) {
          const firstClip = gltf.animations[0];
          runAction = animationActions[firstClip.name];
          console.log(`No running animation found, using first animation "${firstClip.name}" as fallback`);
        }
        
        // Configure animations for looping
        if (runAction) {
          runAction.setLoop(THREE.LoopRepeat);
          runAction.clampWhenFinished = false;
        }
        
        if (idleAction) {
          idleAction.setLoop(THREE.LoopRepeat);
          idleAction.clampWhenFinished = false;
          // Start with idle animation by default
          idleAction.play();
          avatarGroup.userData.currentAnimation = 'idle';
          
          // Create a custom idle pose with arms by the side
          // We'll modify the model's arm bones when in idle state
          avatarGroup.userData.customIdlePose = true;
          
          // Find arm bones in the model
          let leftArm = null;
          let rightArm = null;
          let leftForeArm = null;
          let rightForeArm = null;
          
          // Log all bones to help with debugging
          console.log('Searching for arm bones in model...');
          model.traverse((node) => {
            if (node.isBone || node.type === 'Bone') {
              console.log('Found bone:', node.name);
            }
          });
          
          model.traverse((node) => {
            if (node.isBone || node.type === 'Bone') {
              const name = node.name.toLowerCase();
              
              // Look for common arm bone naming patterns
              if (name.includes('left') && name.includes('arm') && !name.includes('fore')) {
                leftArm = node;
                console.log('Found left arm bone:', node.name);
              } else if (name.includes('right') && name.includes('arm') && !name.includes('fore')) {
                rightArm = node;
                console.log('Found right arm bone:', node.name);
              } else if (name.includes('left') && (name.includes('forearm') || name.includes('fore_arm') || name.includes('elbow'))) {
                leftForeArm = node;
                console.log('Found left forearm bone:', node.name);
              } else if (name.includes('right') && (name.includes('forearm') || name.includes('fore_arm') || name.includes('elbow'))) {
                rightForeArm = node;
                console.log('Found right forearm bone:', node.name);
              }
              
              // Alternative naming patterns
              else if ((name.includes('arm') || name.includes('shoulder')) && name.includes('l_')) {
                leftArm = node;
                console.log('Found left arm bone (alt naming):', node.name);
              } else if ((name.includes('arm') || name.includes('shoulder')) && name.includes('r_')) {
                rightArm = node;
                console.log('Found right arm bone (alt naming):', node.name);
              } else if ((name.includes('forearm') || name.includes('elbow')) && name.includes('l_')) {
                leftForeArm = node;
                console.log('Found left forearm bone (alt naming):', node.name);
              } else if ((name.includes('forearm') || name.includes('elbow')) && name.includes('r_')) {
                rightForeArm = node;
                console.log('Found right forearm bone (alt naming):', node.name);
              }
              
              // More alternative patterns
              else if (name.includes('l.') && name.includes('arm')) {
                leftArm = node;
                console.log('Found left arm bone (alt naming 2):', node.name);
              } else if (name.includes('r.') && name.includes('arm')) {
                rightArm = node;
                console.log('Found right arm bone (alt naming 2):', node.name);
              } else if (name.includes('l.') && name.includes('fore')) {
                leftForeArm = node;
                console.log('Found left forearm bone (alt naming 2):', node.name);
              } else if (name.includes('r.') && name.includes('fore')) {
                rightForeArm = node;
                console.log('Found right forearm bone (alt naming 2):', node.name);
              }
              
              // Numeric patterns (e.g. arm_L_01)
              else if (name.includes('arm') && (name.includes('_l') || name.includes('_l_'))) {
                leftArm = node;
                console.log('Found left arm bone (numeric naming):', node.name);
              } else if (name.includes('arm') && (name.includes('_r') || name.includes('_r_'))) {
                rightArm = node;
                console.log('Found right arm bone (numeric naming):', node.name);
              }
              
              // Last resort - look for any bone that might be an arm
              else if (!leftArm && (name.includes('shoulder.l') || name.includes('clavicle.l') || name.includes('upperarm.l'))) {
                leftArm = node;
                console.log('Found left arm bone (last resort):', node.name);
              } else if (!rightArm && (name.includes('shoulder.r') || name.includes('clavicle.r') || name.includes('upperarm.r'))) {
                rightArm = node;
                console.log('Found right arm bone (last resort):', node.name);
              }
            }
          });
          
          // If we still haven't found the arm bones, try a more aggressive approach
          if (!leftArm || !rightArm) {
            console.log('Using aggressive bone search for arms...');
            model.traverse((node) => {
              if (node.isBone || node.type === 'Bone') {
                const name = node.name.toLowerCase();
                
                // Look for any bone with 'l' or 'r' that might be at shoulder height
                if (!leftArm && (name.includes('l') || name.includes('left'))) {
                  // Check if this bone is at shoulder height
                  const worldPos = new THREE.Vector3();
                  node.getWorldPosition(worldPos);
                  
                  // If the bone is in the upper part of the body
                  if (worldPos.y > 0.5) {
                    leftArm = node;
                    console.log('Found potential left arm bone (aggressive):', node.name, 'at height', worldPos.y);
                  }
                } else if (!rightArm && (name.includes('r') || name.includes('right'))) {
                  // Check if this bone is at shoulder height
                  const worldPos = new THREE.Vector3();
                  node.getWorldPosition(worldPos);
                  
                  // If the bone is in the upper part of the body
                  if (worldPos.y > 0.5) {
                    rightArm = node;
                    console.log('Found potential right arm bone (aggressive):', node.name, 'at height', worldPos.y);
                  }
                }
              }
            });
          }
          
          // Store original rotations
          if (leftArm) {
            leftArm.userData.originalRotation = leftArm.rotation.clone();
          }
          if (rightArm) {
            rightArm.userData.originalRotation = rightArm.rotation.clone();
          }
          if (leftForeArm) {
            leftForeArm.userData.originalRotation = leftForeArm.rotation.clone();
          }
          if (rightForeArm) {
            rightForeArm.userData.originalRotation = rightForeArm.rotation.clone();
          }
          
          // Store arm bones in userData for later use
          avatarGroup.userData.armBones = {
            leftArm,
            rightArm,
            leftForeArm,
            rightForeArm
          };
        }
        
        // Store animation actions on the avatar group
        avatarGroup.userData.animationActions = animationActions;
        avatarGroup.userData.runAction = runAction;
        avatarGroup.userData.idleAction = idleAction;
        
        // Add moving state control - this is the key function that controls animation state
        avatarGroup.userData.isMoving = false; // Start with not moving
        avatarGroup.userData.isJumping = false; // Track jumping state
        
        avatarGroup.setMoving = function(isMoving) {
          // Don't change animation if we're jumping
          if (this.userData.isJumping) return;
          
          // Always update the animation state
          this.userData.isMoving = isMoving;
          
          // Get the run and idle actions
          const walkAction = this.userData.runAction;
          const idleAction = this.userData.idleAction;
          
          if (isMoving && walkAction) {
            // If we should be moving, play the run animation
            console.log('Setting avatar to RUNNING state');
            
            // Stop all other animations first
            Object.values(this.userData.animationActions).forEach(action => {
              if (action !== walkAction) {
                action.stop();
              }
            });
            
            // Reset arm positions to original if we were using custom idle pose
            if (this.userData.customIdlePose && this.userData.armBones) {
              const { leftArm, rightArm, leftForeArm, rightForeArm } = this.userData.armBones;
              
              // Restore original rotations
              if (leftArm && leftArm.userData.originalRotation) {
                leftArm.rotation.copy(leftArm.userData.originalRotation);
              }
              if (rightArm && rightArm.userData.originalRotation) {
                rightArm.rotation.copy(rightArm.userData.originalRotation);
              }
              if (leftForeArm && leftForeArm.userData.originalRotation) {
                leftForeArm.rotation.copy(leftForeArm.userData.originalRotation);
              }
              if (rightForeArm && rightForeArm.userData.originalRotation) {
                rightForeArm.rotation.copy(rightForeArm.userData.originalRotation);
              }
            }
            
            // Play the running animation
            if (!walkAction.isRunning()) {
              walkAction.reset().fadeIn(0.3).play();
              this.userData.currentAnimation = 'running';
            }
          } else if (!isMoving) {
            // If we should be idle
            console.log('Setting avatar to IDLE state');
            
            // First stop the running animation if it's playing
            if (walkAction && walkAction.isRunning()) {
              walkAction.fadeOut(0.3).stop();
            }
            
            // If we have a dedicated idle animation, play it
            if (idleAction) {
              // Reset and play the idle animation
              idleAction.reset().fadeIn(0.3).play();
              this.userData.currentAnimation = 'idle';
              
              // Apply custom idle pose with arms by the side
              if (this.userData.customIdlePose && this.userData.armBones) {
                const { leftArm, rightArm, leftForeArm, rightForeArm } = this.userData.armBones;
                
                // Set arms to be by the side - use more aggressive values to ensure they're down
                if (leftArm) {
                  // Rotate left arm down by the side (adjusted values)
                  leftArm.rotation.set(0, 0, 0);
                  // Apply a slight delay to ensure the animation has started
                  setTimeout(() => {
                    leftArm.rotation.set(0.1, 0, 0.1);
                  }, 100);
                }
                if (rightArm) {
                  // Rotate right arm down by the side (adjusted values)
                  rightArm.rotation.set(0, 0, 0);
                  // Apply a slight delay to ensure the animation has started
                  setTimeout(() => {
                    rightArm.rotation.set(0.1, 0, -0.1);
                  }, 100);
                }
                if (leftForeArm) {
                  // Slightly bend the forearm (adjusted values)
                  leftForeArm.rotation.set(0, 0, 0);
                  // Apply a slight delay to ensure the animation has started
                  setTimeout(() => {
                    leftForeArm.rotation.set(0.2, 0, 0);
                  }, 100);
                }
                if (rightForeArm) {
                  // Slightly bend the forearm (adjusted values)
                  rightForeArm.rotation.set(0, 0, 0);
                  // Apply a slight delay to ensure the animation has started
                  setTimeout(() => {
                    rightForeArm.rotation.set(0.2, 0, 0);
                  }, 100);
                }
                
                // Apply a second adjustment after a longer delay to ensure it sticks
                setTimeout(() => {
                  if (leftArm) leftArm.rotation.set(0.1, 0, 0.1);
                  if (rightArm) rightArm.rotation.set(0.1, 0, -0.1);
                  if (leftForeArm) leftForeArm.rotation.set(0.2, 0, 0);
                  if (rightForeArm) rightForeArm.rotation.set(0.2, 0, 0);
                }, 300);
              }
            } else {
              // If no idle animation exists, just stop all animations
              console.log('No idle animation found - stopping all animations');
              Object.values(this.userData.animationActions).forEach(action => {
                action.stop();
              });
              this.userData.currentAnimation = 'none';
            }
          }
        };
        
        // Add a method to force the idle pose
        avatarGroup.forceIdlePose = function() {
          if (this.userData.customIdlePose && this.userData.armBones) {
            const { leftArm, rightArm, leftForeArm, rightForeArm } = this.userData.armBones;
            
            console.log('Forcing idle pose with arms by side');
            
            // Reset all arm rotations first
            if (leftArm) leftArm.rotation.set(0, 0, 0);
            if (rightArm) rightArm.rotation.set(0, 0, 0);
            if (leftForeArm) leftForeArm.rotation.set(0, 0, 0);
            if (rightForeArm) rightForeArm.rotation.set(0, 0, 0);
            
            // Then set them to the idle pose
            setTimeout(() => {
              if (leftArm) leftArm.rotation.set(0.1, 0, 0.1);
              if (rightArm) rightArm.rotation.set(0.1, 0, -0.1);
              if (leftForeArm) leftForeArm.rotation.set(0.2, 0, 0);
              if (rightForeArm) rightForeArm.rotation.set(0.2, 0, 0);
            }, 50);
          }
        };
        
        // Add jump method
        avatarGroup.jump = function() {
          // Check if we have a pending jump clip that needs to be processed
          if (this.userData.pendingJumpClip && mixers.has(this)) {
            const mixer = mixers.get(this);
            jumpAnimation = mixer.clipAction(this.userData.pendingJumpClip);
            jumpAnimation.setLoop(THREE.LoopOnce);
            jumpAnimation.clampWhenFinished = true;
            this.userData.jumpAction = jumpAnimation;
            delete this.userData.pendingJumpClip;
            console.log('Created jump action from pending clip');
          }
          
          // Get the jump action from userData if available
          const jumpAction = this.userData.jumpAction || jumpAnimation;
          
          // If we have a valid jump action
          if (jumpAction && typeof jumpAction.reset === 'function') {
            console.log('Playing jump animation');
            
            // Set jumping state
            this.userData.isJumping = true;
            
            // Reset arm positions to original if we were using custom idle pose
            if (this.userData.customIdlePose && this.userData.armBones) {
              const { leftArm, rightArm, leftForeArm, rightForeArm } = this.userData.armBones;
              
              // Restore original rotations
              if (leftArm && leftArm.userData.originalRotation) {
                leftArm.rotation.copy(leftArm.userData.originalRotation);
              }
              if (rightArm && rightArm.userData.originalRotation) {
                rightArm.rotation.copy(rightArm.userData.originalRotation);
              }
              if (leftForeArm && leftForeArm.userData.originalRotation) {
                leftForeArm.rotation.copy(leftForeArm.userData.originalRotation);
              }
              if (rightForeArm && rightForeArm.userData.originalRotation) {
                rightForeArm.rotation.copy(rightForeArm.userData.originalRotation);
              }
            }
            
            // Stop all other animations
            Object.values(this.userData.animationActions).forEach(action => {
              action.stop();
            });
            
            // Play the jump animation
            jumpAction.reset().play();
            this.userData.currentAnimation = 'jumping';
            
            // When the jump animation completes, go back to previous state
            const avatar = this;
            const previousMovingState = this.userData.isMoving;
            
            // Use setTimeout to match the jump animation duration
            setTimeout(() => {
              // Completely stop the jump animation to prevent blending issues
              jumpAction.stop();
              
              // Reset jumping state
              avatar.userData.isJumping = false;
              
              // Force a complete reset of the animation state
              if (avatar.userData.idleAction) {
                avatar.userData.idleAction.stop();
              }
              if (avatar.userData.runAction) {
                avatar.userData.runAction.stop();
              }
              
              // Explicitly call setMoving with a slight delay to ensure clean transition
              setTimeout(() => {
                avatar.setMoving(previousMovingState);
                
                // If we're going to idle, force the idle pose
                if (!previousMovingState) {
                  setTimeout(() => {
                    avatar.forceIdlePose();
                  }, 100);
                }
              }, 50);
            }, jumpAction.getClip().duration * 1000); // Convert to milliseconds
          } else {
            console.warn('Jump animation not properly loaded yet or invalid', jumpAction);
          }
        };
        
        // Force initial state to be idle
        setTimeout(() => {
          avatarGroup.setMoving(false);
          
          // Force the idle pose after a short delay to ensure everything is initialized
          setTimeout(() => {
            avatarGroup.forceIdlePose();
          }, 500);
        }, 100);
        
        // Mark main model as loaded
        mainModelLoaded = true;
        
        // If jump animation is already loaded, set it up
        if (jumpAnimationLoaded && jumpAnimation) {
          // Check if jumpAnimation is a clip (not an action)
          if (jumpAnimation.isAnimationClip || !(typeof jumpAnimation.reset === 'function')) {
            // It's a clip, create an action from it
            const jumpClip = jumpAnimation;
            jumpAnimation = mixer.clipAction(jumpClip);
            jumpAnimation.setLoop(THREE.LoopOnce);
            jumpAnimation.clampWhenFinished = true;
            console.log('Created jump action from stored clip');
          }
          avatarGroup.userData.jumpAction = jumpAnimation;
        }
      } else {
        console.warn('No animations found in the main model!');
      }
      
      console.log('Pure avatar model loaded successfully');
    },
    (xhr) => {
      // Loading progress
      console.log('Pure avatar model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.error('Error loading pure avatar model:', error);
    }
  );
  
  // Load the jump animation model
  gltfLoader.load(
    jumpModelPath,
    (gltf) => {
      console.log('Jump animation model loaded successfully');
      
      if (gltf.animations && gltf.animations.length > 0) {
        console.log(`Found ${gltf.animations.length} animations in jump model`);
        
        // Log all available animations in the jump model
        gltf.animations.forEach((clip, index) => {
          console.log(`Jump Animation ${index}: "${clip.name}" (duration: ${clip.duration}s)`);
        });
        
        // Find the jump animation
        let jumpClip = null;
        
        // First try to find by exact name
        for (const clip of gltf.animations) {
          const lowerName = clip.name.toLowerCase();
          if (lowerName === 'jump') {
            jumpClip = clip;
            console.log('Found exact match for jump animation');
            break;
          }
        }
        
        // If not found, try partial match
        if (!jumpClip) {
          for (const clip of gltf.animations) {
            const lowerName = clip.name.toLowerCase();
            if (lowerName.includes('jump')) {
              jumpClip = clip;
              console.log(`Found partial match for jump animation: "${clip.name}"`);
              break;
            }
          }
        }
        
        // If still not found, use the first animation
        if (!jumpClip && gltf.animations.length > 0) {
          jumpClip = gltf.animations[0];
          console.log(`Using first animation as jump: "${jumpClip.name}"`);
        }
        
        // If we found a jump animation
        if (jumpClip) {
          // If the main model is already loaded, add the jump animation to it
          if (mainModelLoaded && mixers.has(avatarGroup)) {
            const mixer = mixers.get(avatarGroup);
            jumpAnimation = mixer.clipAction(jumpClip);
            jumpAnimation.setLoop(THREE.LoopOnce); // Only play once
            jumpAnimation.clampWhenFinished = true; // Freeze on the last frame
            
            // Store the jump action
            avatarGroup.userData.jumpAction = jumpAnimation;
            console.log('Jump animation added to avatar');
          } else {
            // Store the jump clip for later when the main model loads
            // We'll store both the clip and create a flag to indicate it needs processing
            jumpAnimation = jumpClip;
            avatarGroup.userData.pendingJumpClip = jumpClip;
            console.log('Jump animation stored for later use');
          }
          
          // Mark jump animation as loaded
          jumpAnimationLoaded = true;
        }
      } else {
        console.warn('No animations found in the jump model!');
      }
    },
    (xhr) => {
      // Loading progress
      console.log('Jump model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.error('Error loading jump model:', error);
    }
  );
  
  return avatarGroup;
} 
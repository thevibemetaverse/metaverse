import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { io } from 'socket.io-client';

import { createEnvironment, updatePortalMaterials } from './components/environment.js';
import { createAvatar, createSimpleAvatar, createDirectAvatar, createCleanAvatar, createPureAvatar, updateAvatarAnimations } from './components/avatar.js';
import { setupControls } from './components/controls.js';
import { setupUI, createEmojiBar, showEmojiReaction } from './components/ui.js';
import { NPCManager } from './components/npcs.js';
import { PokeMechanic } from './components/pokeMechanic.js';
import { EmojiEffects } from './components/emojiEffects.js';
import { setupMobileControls, isMobileDevice, optimizeForMobile, setupDeviceOrientation, createMobileUI } from './components/mobileControls.js';
import { BBQModel } from './components/bbqModel.js';

// Detect if we're on a mobile device
const isMobile = isMobileDevice();
console.log(`Device detected as ${isMobile ? 'mobile' : 'desktop'}`);

// Create loading screen
const loadingScreen = document.createElement('div');
loadingScreen.style.position = 'fixed';
loadingScreen.style.top = '0';
loadingScreen.style.left = '0';
loadingScreen.style.width = '100%';
loadingScreen.style.height = '100%';
loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
loadingScreen.style.display = 'flex';
loadingScreen.style.flexDirection = 'column';
loadingScreen.style.justifyContent = 'center';
loadingScreen.style.alignItems = 'center';
loadingScreen.style.zIndex = '1000';
loadingScreen.style.color = 'white';
loadingScreen.style.fontFamily = 'Arial, sans-serif';

const loadingText = document.createElement('h2');
loadingText.textContent = 'Loading Metaverse...';
loadingScreen.appendChild(loadingText);

const progressContainer = document.createElement('div');
progressContainer.style.width = '80%';
progressContainer.style.maxWidth = '400px';
progressContainer.style.height = '20px';
progressContainer.style.backgroundColor = '#333';
progressContainer.style.borderRadius = '10px';
progressContainer.style.overflow = 'hidden';
progressContainer.style.marginTop = '20px';
loadingScreen.appendChild(progressContainer);

const progressBar = document.createElement('div');
progressBar.style.width = '0%';
progressBar.style.height = '100%';
progressBar.style.backgroundColor = '#4CAF50';
progressBar.style.transition = 'width 0.3s ease';
progressContainer.appendChild(progressBar);

document.body.appendChild(loadingScreen);

// Setup loading manager
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  const progress = (itemsLoaded / itemsTotal) * 100;
  progressBar.style.width = progress + '%';
  loadingText.textContent = `Loading Metaverse... ${Math.round(progress)}%`;
  console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};

loadingManager.onLoad = function() {
  // Hide loading screen when everything is loaded
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 1s ease';
    setTimeout(() => {
      document.body.removeChild(loadingScreen);
    }, 1000);
  }, 500);
};

loadingManager.onError = function(url) {
  console.error('Error loading:', url);
  loadingText.textContent = 'Error loading some assets. The experience may be limited.';
  loadingText.style.color = '#ff5555';
  
  // Still hide loading screen after a delay
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 1s ease';
    setTimeout(() => {
      document.body.removeChild(loadingScreen);
    }, 1000);
  }, 2000);
};

// Game state
const gameState = {
  players: {},
  username: 'Metaverse Explorer',
  settings: {
    volume: 50,
    graphics: isMobile ? 'low' : 'medium',
    isMobile: isMobile
  }
};

// Global variables for God Mode
let godModeEnabled = false;
let godCamera = null;
let godCameraControls = null;
let originalCamera = null;
let godModeSpeed = 0.5;
let disableBillboarding = false; // New variable to control billboarding

// Expose disableBillboarding to window for access from other files
if (typeof window !== 'undefined') {
  window.disableBillboarding = disableBillboarding;
}

// God Mode camera movement keys
const godModeKeys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
  boost: false
};
let isMiddleMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;
let godCameraDistance = 20;
let godCameraTarget = new THREE.Vector3(0, 0, 0);

// Handle God Mode keyboard input
function handleGodModeKeyDown(event) {
  if (!godModeEnabled) return;
  
  switch (event.key.toLowerCase()) {
    case 'w':
      godModeKeys.forward = true;
      break;
    case 's':
      godModeKeys.backward = true;
      break;
    case 'a':
      godModeKeys.left = true;
      break;
    case 'd':
      godModeKeys.right = true;
      break;
    case 'q':
      godModeKeys.up = true;
      break;
    case 'e':
      godModeKeys.down = true;
      break;
    case 'shift':
      godModeKeys.boost = true;
      break;
  }
}

function handleGodModeKeyUp(event) {
  if (!godModeEnabled) return;
  
  switch (event.key.toLowerCase()) {
    case 'w':
      godModeKeys.forward = false;
      break;
    case 's':
      godModeKeys.backward = false;
      break;
    case 'a':
      godModeKeys.left = false;
      break;
    case 'd':
      godModeKeys.right = false;
      break;
    case 'q':
      godModeKeys.up = false;
      break;
    case 'e':
      godModeKeys.down = false;
      break;
    case 'shift':
      godModeKeys.boost = false;
      break;
  }
}

// Handle mouse wheel for zooming
function handleGodModeWheel(event) {
  if (!godModeEnabled || !godCamera) return;
  
  // Prevent default scrolling behavior
  event.preventDefault();
  
  // Calculate zoom factor based on wheel delta
  const zoomFactor = event.deltaY * 0.01;
  
  // Update camera distance
  godCameraDistance += zoomFactor;
  
  // Clamp distance to reasonable values
  godCameraDistance = Math.max(2, Math.min(100, godCameraDistance));
  
  // Update camera position based on current orientation and distance
  const direction = new THREE.Vector3();
  godCamera.getWorldDirection(direction);
  direction.multiplyScalar(-godCameraDistance);
  
  // Set camera position relative to target
  godCameraTarget.copy(godCamera.position).add(direction);
  
  // Update controls
  godCameraControls.update();
}

// Handle middle mouse button down
function handleGodModeMouseDown(event) {
  if (!godModeEnabled || !godCamera) return;
  
  // Check if middle mouse button is pressed (button 1)
  if (event.button === 1) {
    isMiddleMouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    
    // Disable OrbitControls temporarily
    godCameraControls.enabled = false;
  }
}

// Handle mouse movement for rotation
function handleGodModeMouseMove(event) {
  if (!godModeEnabled || !godCamera || !isMiddleMouseDown) return;
  
  // Calculate mouse movement
  const deltaX = event.clientX - lastMouseX;
  const deltaY = event.clientY - lastMouseY;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  
  // Rotate camera based on mouse movement
  const rotationSpeed = 0.005;
  godCamera.rotation.y -= deltaX * rotationSpeed;
  godCamera.rotation.x -= deltaY * rotationSpeed;
  
  // Clamp vertical rotation to avoid flipping
  godCamera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, godCamera.rotation.x));
  
  // Update camera position based on current orientation and distance
  const direction = new THREE.Vector3();
  godCamera.getWorldDirection(direction);
  direction.multiplyScalar(-godCameraDistance);
  
  // Update target based on camera direction
  godCameraTarget.copy(godCamera.position).sub(direction);
  godCameraControls.target.copy(godCameraTarget);
}

// Handle middle mouse button up
function handleGodModeMouseUp(event) {
  if (!godModeEnabled || !godCamera) return;
  
  // Check if middle mouse button is released (button 1)
  if (event.button === 1) {
    isMiddleMouseDown = false;
    
    // Re-enable OrbitControls
    godCameraControls.enabled = true;
  }
}

// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// If on mobile, optimize renderer settings
if (isMobile) {
  optimizeForMobile(renderer);
}

// Function to show notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Style the notification
  notification.style.position = 'fixed';
  notification.style.top = '60px';
  notification.style.right = '10px';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '5px';
  notification.style.color = 'white';
  notification.style.fontFamily = 'Arial, sans-serif';
  notification.style.zIndex = '1000';
  notification.style.maxWidth = '300px';
  notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  notification.style.transition = 'opacity 0.5s ease';
  
  // Set background color based on type
  if (type === 'error') {
    notification.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
  } else if (type === 'success') {
    notification.style.backgroundColor = 'rgba(40, 167, 69, 0.9)';
  } else {
    notification.style.backgroundColor = 'rgba(0, 123, 255, 0.9)';
  }
  
  document.body.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 5000);
}

// Function to set up VR controllers
function setupVRControllers(session) {
  // Create controller models and add them to the scene
  const controllerModelFactory = new THREE.XRControllerModelFactory();
  
  // Controller 1
  const controller1 = renderer.xr.getController(0);
  controller1.addEventListener('selectstart', onSelectStart);
  controller1.addEventListener('selectend', onSelectEnd);
  scene.add(controller1);
  
  // Controller 2
  const controller2 = renderer.xr.getController(1);
  controller2.addEventListener('selectstart', onSelectStart);
  controller2.addEventListener('selectend', onSelectEnd);
  scene.add(controller2);
  
  // Controller grip 1
  const controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  scene.add(controllerGrip1);
  
  // Controller grip 2
  const controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip2);
  
  // Store controllers for later use
  const vrControllers = {
    controller1,
    controller2,
    controllerGrip1,
    controllerGrip2
  };
  
  return vrControllers;
}

// Controller event handlers
function onSelectStart(event) {
  const controller = event.target;
  controller.userData.isSelecting = true;
  
  // Teleport or interact with objects
  if (playerAvatar) {
    // Get controller direction
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // Check for intersections with the ground
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    for (let i = 0; i < intersects.length; i++) {
      const intersect = intersects[i];
      
      // Check if the intersected object is the ground
      if (intersect.object.userData && intersect.object.userData.isGround) {
        // Teleport to the intersection point
        playerAvatar.position.set(
          intersect.point.x,
          playerAvatar.position.y, // Keep the same Y position
          intersect.point.z
        );
        
        // Update camera position in VR
        const headPosition = new THREE.Vector3(
          playerAvatar.position.x,
          playerAvatar.position.y + 1.6, // Approximate head height
          playerAvatar.position.z
        );
        
        // Create a teleport marker effect
        createTeleportMarker(intersect.point);
        
        break;
      }
    }
  }
}

function onSelectEnd(event) {
  const controller = event.target;
  controller.userData.isSelecting = false;
}

// Create a visual marker for teleportation
function createTeleportMarker(position) {
  const markerGeometry = new THREE.RingGeometry(0.25, 0.3, 32);
  const markerMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x0088ff,
    opacity: 0.6,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.position.copy(position);
  marker.position.y += 0.01; // Slightly above the ground
  marker.rotation.x = -Math.PI / 2; // Flat on the ground
  
  scene.add(marker);
  
  // Animate and remove the marker
  const startTime = performance.now();
  const duration = 1000; // 1 second
  
  function animateMarker() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    marker.scale.set(1 + progress * 2, 1 + progress * 2, 1);
    marker.material.opacity = 0.6 * (1 - progress);
    
    if (progress < 1) {
      requestAnimationFrame(animateMarker);
    } else {
      scene.remove(marker);
    }
  }
  
  animateMarker();
}

// Function to create VR instructions
function showVRInstructions() {
  // Create a floating panel with instructions
  const instructionsPanel = document.createElement('div');
  instructionsPanel.id = 'vr-instructions';
  instructionsPanel.style.position = 'fixed';
  instructionsPanel.style.top = '50%';
  instructionsPanel.style.left = '50%';
  instructionsPanel.style.transform = 'translate(-50%, -50%)';
  instructionsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  instructionsPanel.style.color = 'white';
  instructionsPanel.style.padding = '20px';
  instructionsPanel.style.borderRadius = '10px';
  instructionsPanel.style.fontFamily = 'Arial, sans-serif';
  instructionsPanel.style.zIndex = '2000';
  instructionsPanel.style.maxWidth = '400px';
  instructionsPanel.style.textAlign = 'center';
  
  instructionsPanel.innerHTML = `
    <h2>VR Mode Instructions</h2>
    <p>You are about to enter VR mode. Here's how to navigate:</p>
    <ul style="text-align: left; margin: 15px 0;">
      <li><strong>Trigger Button:</strong> Teleport to location</li>
      <li><strong>Grip Button:</strong> Grab objects</li>
      <li><strong>Thumbstick:</strong> Rotate view</li>
    </ul>
    <p>Your avatar will follow your head movement.</p>
    <button id="vr-instructions-close" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">Got it!</button>
  `;
  
  document.body.appendChild(instructionsPanel);
  
  // Close button event
  document.getElementById('vr-instructions-close').addEventListener('click', () => {
    document.body.removeChild(instructionsPanel);
  });
  
  // Auto-close after 10 seconds
  setTimeout(() => {
    if (document.body.contains(instructionsPanel)) {
      document.body.removeChild(instructionsPanel);
    }
  }, 10000);
}

// Create VR button
const vrButton = document.getElementById('vr-button');
if (vrButton) {
  // Check if WebXR is available
  if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
      if (supported) {
        // WebXR is supported
        vrButton.addEventListener('click', () => {
          if (renderer.xr.isPresenting) {
            renderer.xr.getSession().end();
          } else {
            // Show VR instructions before entering VR mode
            showVRInstructions();
            
            // Enter VR mode after a short delay
            setTimeout(() => {
              // Enter VR mode
              navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor']
              }).then((session) => {
                renderer.xr.setSession(session);
                
                // Save current camera position and controls state
                const savedCameraPosition = camera.position.clone();
                const savedCameraRotation = camera.rotation.clone();
                let savedControlsEnabled = false;
                
                if (controls) {
                  savedControlsEnabled = controls.enabled;
                  // Disable orbit controls in VR
                  controls.enabled = false;
                }
                
                // Position the camera at the avatar's head position for VR
                if (playerAvatar) {
                  // Get the avatar's head position
                  const headPosition = new THREE.Vector3(
                    playerAvatar.position.x,
                    playerAvatar.position.y + 1.6, // Approximate head height
                    playerAvatar.position.z
                  );
                  
                  // Set the camera position to the head position
                  camera.position.copy(headPosition);
                  
                  // Make the avatar invisible to the user in VR
                  if (playerAvatar.visible) {
                    playerAvatar.userData.wasVisible = playerAvatar.visible;
                    playerAvatar.visible = false;
                  }
                }
                
                // Set up VR controllers
                const vrControllers = setupVRControllers(session);
                
                // Set up session end event
                session.addEventListener('end', () => {
                  vrButton.classList.remove('active');
                  console.log('VR session ended');
                  
                  // Restore camera position and controls
                  camera.position.copy(savedCameraPosition);
                  camera.rotation.copy(savedCameraRotation);
                  
                  if (controls) {
                    controls.enabled = savedControlsEnabled;
                  }
                  
                  // Restore avatar visibility
                  if (playerAvatar && playerAvatar.userData.wasVisible !== undefined) {
                    playerAvatar.visible = playerAvatar.userData.wasVisible;
                    delete playerAvatar.userData.wasVisible;
                  }
                  
                  // Remove VR controllers from the scene
                  if (vrControllers) {
                    scene.remove(vrControllers.controller1);
                    scene.remove(vrControllers.controller2);
                    scene.remove(vrControllers.controllerGrip1);
                    scene.remove(vrControllers.controllerGrip2);
                  }
                  
                  showNotification('Exited VR mode', 'info');
                });
                
                vrButton.classList.add('active');
                console.log('VR session started');
                showNotification('Entered VR mode', 'success');
              }).catch(error => {
                console.error('Error starting VR session:', error);
                showNotification('Failed to start VR session: ' + error.message, 'error');
              });
            }, 2000); // 2-second delay to allow reading the instructions
          }
        });
        
        console.log('WebXR VR supported');
        vrButton.style.display = 'block';
      } else {
        // WebXR is not supported
        console.log('WebXR VR not supported');
        vrButton.style.display = 'block';
        vrButton.disabled = true;
        vrButton.style.opacity = '0.5';
        vrButton.style.cursor = 'not-allowed';
        vrButton.title = 'VR not supported on this device or browser';
        vrButton.addEventListener('click', () => {
          showNotification('VR is not supported on this device or browser', 'error');
        });
      }
    });
  } else {
    // WebXR is not available
    console.log('WebXR not available');
    vrButton.style.display = 'block';
    vrButton.disabled = true;
    vrButton.style.opacity = '0.5';
    vrButton.style.cursor = 'not-allowed';
    vrButton.title = 'VR not supported on this device or browser';
    vrButton.addEventListener('click', () => {
      showNotification('VR is not supported on this device or browser', 'error');
    });
  }
}

// Setup lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 200, 100);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Create environment
const environment = createEnvironment(scene, camera, loadingManager);

// Create player avatar
console.log('Creating player avatar...');
try {
  let playerAvatar = createPureAvatar(scene, gameState.username, loadingManager);
  // Position the player for a selfie view
  playerAvatar.position.set(0, 0, 0); // Keep at origin
  playerAvatar.rotation.y = Math.PI; // Face toward the camera (180 degrees rotation)
  scene.add(playerAvatar);
  
  // Log the player avatar structure to help debug
  console.log('Player avatar structure:', playerAvatar);
  
  // Setup controls
  const controls = setupControls(camera, playerAvatar, renderer.domElement, gameState, scene);
  
  // Setup mobile controls if on a mobile device
  let mobileControls = null;
  if (isMobile) {
    console.log('Setting up mobile controls');
    mobileControls = setupMobileControls(controls);
    controls.mobileControls = mobileControls;
    
    // Setup device orientation for mobile
    setupDeviceOrientation(controls);
    
    // Create mobile UI
    const mobileUI = createMobileUI();
    
    // Listen for mobile settings changes
    window.addEventListener('mobile-settings-changed', (event) => {
      const { graphicsQuality, useGyroscope } = event.detail;
      
      // Update graphics quality
      if (graphicsQuality === 'low') {
        renderer.setPixelRatio(1);
        renderer.shadowMap.enabled = false;
      } else if (graphicsQuality === 'medium') {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
      } else if (graphicsQuality === 'high') {
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      
      // Update gyroscope usage
      if (useGyroscope) {
        setupDeviceOrientation(controls);
      }
      
      // Force shadow map update
      renderer.shadowMap.needsUpdate = true;
    });
  }
  
  // Position camera for a selfie-style view - in front of player looking back
  camera.position.set(0, 6, 15); // Initial selfie view
  camera.lookAt(0, 2, 0); // Looking at upper body for better framing
  
  // After a short delay, adjust camera to a higher position for gameplay
  setTimeout(() => {
    camera.position.set(0, 10, 20); // Much higher and further back for gameplay
    camera.lookAt(0, 1.5, 0);
  }, 5000); // 5 seconds after start
  
  // Make camera available globally for raycasting
  window.camera = camera;
  
  // Temporarily disable camera following to allow viewing the landmarks
  const originalUpdateCamera = controls.updateCamera;
  controls.updateCamera = function() {}; // Empty function to prevent camera following
  
  // After a short delay, restore normal camera controls
  setTimeout(() => {
    console.log('Transitioning to normal camera controls');
    controls.updateCamera = originalUpdateCamera;
    
    // Smoothly transition the orbit controls target
    const startTarget = new THREE.Vector3(0, 1.5, 0); // Initial selfie-style target
    const endTarget = new THREE.Vector3(
      playerAvatar.position.x,
      playerAvatar.position.y + 1,
      playerAvatar.position.z
    );
    
    // Animate the transition over 2 seconds
    const startTime = performance.now();
    const duration = 2000; // 2 seconds
    
    function animateTargetTransition() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smoother transition
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
      
      // Interpolate between start and end targets
      const currentTarget = new THREE.Vector3().lerpVectors(
        startTarget, endTarget, easedProgress
      );
      
      // Update orbit controls target
      controls.orbitControls.target.copy(currentTarget);
      
      if (progress < 1) {
        requestAnimationFrame(animateTargetTransition);
      }
    }
    
    animateTargetTransition();
  }, 5000); // 5 seconds to view the landmarks
  
  // Setup UI
  setupUI(gameState);
  
  // Create NPC manager and initialize NPCs
  const npcManager = new NPCManager(scene, loadingManager);
  
  // Create poke mechanic
  const pokeMechanic = new PokeMechanic(scene, camera);
  
  // Set poke mechanic for NPCs
  npcManager.setPokeMechanic(pokeMechanic);
  
  // We'll initialize NPCs in the socket connection handler
  // instead of calling npcManager.initialize() directly
  
  // Setup emoji effects
  let emojiEffects = new EmojiEffects(scene, camera);
  
  // Initialize BBQ sauce model
  const bbqModel = new BBQModel(scene, loadingManager);
  // Create a single BBQ bottle positioned higher up
  bbqModel.createSingleBBQ(10, -50, 18, 10); // Position at center (0,0), height of 10, scale of 3
  
  // Add skateboard mode toggle listener
  document.addEventListener('toggle-skateboard-mode', function(event) {
    console.log('Skateboard mode toggle event received:', event.detail.isActive);
    if (controls) {
      controls.isSkateboardMode = event.detail.isActive;
      console.log('Skateboard mode set to:', controls.isSkateboardMode);
      
      // Update skateboard visibility
      if (controls.skateboard) {
        controls.skateboard.visible = controls.isSkateboardMode;
        console.log('Skateboard visibility set to:', controls.skateboard.visible);
        
        // Give an initial speed boost when entering skateboard mode
        if (controls.isSkateboardMode) {
          controls.skateboardSpeed = controls.maxSkateboardSpeed / 2; // Start at half max speed
          
          // Create a burst of skateboard emojis when entering skateboard mode
          if (emojiEffects) {
            // Calculate position behind the player
            const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const position = playerAvatar.position.clone().add(cameraDirection.multiplyScalar(2));
            position.y += 0.5; // Slightly above ground level
            
            console.log('Creating skateboard emoji burst at position:', position);
            emojiEffects.createEmojiBurst('🛹', position, 5); // Create 5 skateboard emojis
          }
        } else {
          controls.skateboardSpeed = 0;
        }
      } else {
        console.warn('Skateboard model not loaded yet!');
      }
    }
  });
  
  // Override the showEmojiReaction function to use 3D emojis
  window.showEmojiReaction = function(emoji) {
    console.log('3D Emoji reaction triggered:', emoji);
    
    if (!emojiEffects) {
      console.error('EmojiEffects not initialized!');
      return;
    }
    
    // Calculate position in front of the camera
    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const position = camera.position.clone().add(cameraDirection.multiplyScalar(3));
    position.y += 0.5; // Slightly above eye level
    
    console.log('Creating emoji at position:', position);
    
    // Create a burst of emojis
    emojiEffects.createEmojiBurst(emoji, position, 8);
  };
  
  // Listen for emoji-reaction events
  document.addEventListener('emoji-reaction', function(event) {
    console.log('Emoji reaction event received:', event.detail.emoji);
    
    if (!emojiEffects) {
      console.error('EmojiEffects not initialized!');
      return;
    }
    
    // Calculate position in front of the camera
    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const position = camera.position.clone().add(cameraDirection.multiplyScalar(3));
    position.y += 0.5; // Slightly above eye level
    
    console.log('Creating emoji at position:', position);
    
    // Create a burst of emojis
    emojiEffects.createEmojiBurst(event.detail.emoji, position, 8);
  });
  
  // Initialize emoji bar
  const emojiBar = createEmojiBar();
  console.log('Emoji bar initialized in main.js');
  
  // Setup socket connection for multiplayer
  let socket;
  try {
    // More reliable environment detection - check if the current URL is localhost
    const isLocalDevelopment = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';
    
    // Determine server URL based on more reliable environment detection
    const socketServerUrl = isLocalDevelopment
      ? 'http://localhost:3000' 
      : 'https://metaverse-production-821f.up.railway.app';
    
    console.log(`Running in ${isLocalDevelopment ? 'development' : 'production'} mode`);
    console.log(`Connecting to multiplayer server at: ${socketServerUrl}`);
    
    socket = io(socketServerUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    // Make socket available globally for UI components
    window.socket = socket;
    
    socket.on('connect', () => {
      console.log('Connected to server');
      
      // Set up NPC multiplayer synchronization
      npcManager.setupMultiplayer(socket);
      
      // Initialize NPCs for multiplayer (this will only create NPCs if this client is the host)
      npcManager.initializeForMultiplayer();
      
      // Send player info to server
      socket.emit('player-join', {
        id: socket.id,
        username: gameState.username,
        position: {
          x: playerAvatar.position.x,
          y: playerAvatar.position.y,
          z: playerAvatar.position.z
        },
        rotation: playerAvatar.rotation.y
      });
    });
    
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      displayMessage('Multiplayer server connection failed. Playing in single-player mode.');
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Attempting to reconnect (${attemptNumber})...`);
    });
    
    socket.on('reconnect_failed', () => {
      console.log('Failed to reconnect to multiplayer server');
      displayMessage('Could not reconnect to multiplayer server. Playing in single-player mode.');
    });
    
    socket.on('players-update', (players) => {
      // Update other players
      Object.keys(players).forEach(id => {
        if (id !== socket.id) {
          const playerData = players[id];
          
          // If player doesn't exist in our game state, create them
          if (!gameState.players[id]) {
            // Use createPureAvatar instead of createAvatar to ensure consistent models
            const newPlayerAvatar = createPureAvatar(scene, playerData.username, loadingManager);
            gameState.players[id] = {
              avatar: newPlayerAvatar,
              username: playerData.username
            };
            scene.add(newPlayerAvatar);
          }
          
          // Update player position and rotation
          const avatar = gameState.players[id].avatar;
          avatar.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
          avatar.rotation.y = playerData.rotation;
          
          // Synchronized animation handling - apply all animation states
          
          // Handle standard moving animation
          if (avatar.setMoving && playerData.isMoving !== undefined) {
            avatar.setMoving(playerData.isMoving);
          }
          
          // Handle jumping animation
          if (avatar.jump && playerData.isJumping && !avatar.userData.isJumping) {
            avatar.jump();
          }
          
          // Handle skateboard mode
          if (playerData.isSkateboardMode !== undefined) {
            // Store skateboard mode state
            avatar.userData.isSkateboardMode = playerData.isSkateboardMode;
            
            if (playerData.isSkateboardMode) {
              // In skateboard mode, explicitly stop all animations
              if (avatar.userData && avatar.userData.animationActions) {
                Object.values(avatar.userData.animationActions).forEach(action => {
                  action.stop();
                });
                
                // Play idle animation at slow speed for skating stance
                if (avatar.userData.animationActions && 
                    Object.keys(avatar.userData.animationActions).some(name => name.toLowerCase().includes('idle'))) {
                  const idleAction = Object.entries(avatar.userData.animationActions)
                    .find(([name]) => name.toLowerCase().includes('idle'))[1];
                  if (idleAction && !idleAction.isRunning()) {
                    idleAction.timeScale = 0.1; // Very slow speed
                    idleAction.play();
                  }
                }
                
                // Apply skateboard-specific rotations
                if (playerData.rotation !== undefined) {
                  // Calculate stance rotations based on direction of travel
                  const skateboardRotation = playerData.rotation + Math.PI/2;
                  const playerRotation = skateboardRotation + Math.PI/2;
                  
                  // Apply rotation to match skateboard stance
                  avatar.rotation.y = playerRotation;
                  
                  // Apply tilt if available in the data
                  if (playerData.tilt !== undefined) {
                    avatar.rotation.z = playerData.tilt * 1.2; // Apply tilt with enhanced effect
                    // Add slight forward lean
                    avatar.rotation.x = -0.15; // Slight forward lean for skating posture
                  }
                }
              }
            } else if (avatar.userData.isSkateboardMode) {
              // Just switched from skateboard mode to normal mode
              // Reset additional rotations
              avatar.rotation.z = 0;
              avatar.rotation.x = 0;
              
              // Resume normal animations based on movement state
              if (avatar.setMoving && playerData.isMoving !== undefined) {
                avatar.setMoving(playerData.isMoving);
              }
            }
          }
        }
      });
      
      // Remove disconnected players
      Object.keys(gameState.players).forEach(id => {
        if (!players[id]) {
          scene.remove(gameState.players[id].avatar);
          delete gameState.players[id];
        }
      });
    });
    
    socket.on('player-joined', (data) => {
      console.log(`${data.username} joined the game`);
    });
    
    socket.on('player-left', (id) => {
      if (gameState.players[id]) {
        console.log(`${gameState.players[id].username} left the game`);
        scene.remove(gameState.players[id].avatar);
        delete gameState.players[id];
      }
    });
    
    // Add handler for emoji reactions from other players
    socket.on('emoji-reaction', (data) => {
      console.log(`Emoji reaction received from ${data.senderName}: ${data.emoji}`);
      
      if (!emojiEffects) {
        console.error('EmojiEffects not initialized!');
        return;
      }
      
      // Create a position object from the data
      const position = new THREE.Vector3(
        data.position.x,
        data.position.y + 1.5, // Slightly above the player's head
        data.position.z
      );
      
      // Create a burst of emojis at the sender's position
      emojiEffects.createEmojiBurst(data.emoji, position, 5);
    });
    
  } catch (error) {
    console.error('Failed to connect to server:', error);
    displayMessage('Multiplayer connection failed. Playing in single-player mode.');
    
    // Initialize NPCs in single-player mode
    npcManager.initialize();
  }
  
  // Helper function to display messages to the user
  function displayMessage(message, duration = 5000) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.bottom = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.zIndex = '1000';
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.style.opacity = '0';
      messageElement.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        document.body.removeChild(messageElement);
      }, 500);
    }, duration);
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update mobile status on resize
    const wasMobile = gameState.settings.isMobile;
    const nowMobile = window.innerWidth <= 800;
    
    if (wasMobile !== nowMobile) {
      gameState.settings.isMobile = nowMobile;
      
      // Toggle mobile controls
      if (mobileControls) {
        mobileControls.toggleMobileControls(nowMobile);
      }
      
      // Adjust renderer settings
      if (nowMobile) {
        optimizeForMobile(renderer);
      } else {
        // Restore desktop settings
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    }
  });
  
  // Update God Mode camera position in the animation loop
  function updateGodModeCamera(deltaTime) {
    if (!godModeEnabled || !godCamera) return;
    
    // Calculate movement speed (faster with boost)
    const currentSpeed = godModeKeys.boost ? godModeSpeed * 3 : godModeSpeed;
    
    // Get camera direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(godCamera.quaternion).normalize();
    forward.y = 0; // Keep movement in horizontal plane
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(godCamera.quaternion).normalize();
    right.y = 0; // Keep movement in horizontal plane
    right.normalize();
    
    const up = new THREE.Vector3(0, 1, 0);
    
    // Calculate movement direction
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (godModeKeys.forward) moveDirection.add(forward);
    if (godModeKeys.backward) moveDirection.sub(forward);
    if (godModeKeys.right) moveDirection.add(right);
    if (godModeKeys.left) moveDirection.sub(right);
    if (godModeKeys.up) moveDirection.add(up);
    if (godModeKeys.down) moveDirection.sub(up);
    
    // Normalize movement direction if moving diagonally
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }
    
    // Move both camera and target
    const movement = moveDirection.multiplyScalar(currentSpeed * deltaTime);
    godCamera.position.add(movement);
    godCameraTarget.add(movement);
    godCameraControls.target.copy(godCameraTarget);
    
    // Update orbit controls
    godCameraControls.update();
  }
  
  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    
    // Calculate delta time for smooth animation
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;
    
    // Update controls
    controls.update();
    
    // Update portal materials
    updatePortalMaterials(deltaTime);
    
    // Update God Mode camera if enabled
    if (godModeEnabled && godCamera) {
      updateGodModeCamera(deltaTime);
    }
    
    // Update avatar animations - ensure this is called every frame
    updateAvatarAnimations();
    
    // Check if player is moving and update animation state
    const isMoving = controls.moveForward || controls.moveBackward || 
                     controls.moveLeft || controls.moveRight;
    
    // Handle animations based on skateboard mode
    if (playerAvatar) {
      // Track animation states in userData for synchronization
      playerAvatar.userData.isMoving = isMoving;
      
      if (controls.isSkateboardMode) {
        // In skateboard mode, explicitly stop all animations
        if (playerAvatar.userData && playerAvatar.userData.animationActions) {
          Object.values(playerAvatar.userData.animationActions).forEach(action => {
            action.stop();
          });
          
          // If we have an idle animation, play it at a very slow speed to create a subtle standing pose
          if (playerAvatar.userData.animationActions && 
              Object.keys(playerAvatar.userData.animationActions).some(name => name.toLowerCase().includes('idle'))) {
            const idleAction = Object.entries(playerAvatar.userData.animationActions)
              .find(([name]) => name.toLowerCase().includes('idle'))[1];
            if (idleAction && !idleAction.isRunning()) {
              idleAction.timeScale = 0.1; // Very slow speed
              idleAction.play();
            }
          }
        }
        
        // Track skateboard mode state
        playerAvatar.userData.isSkateboardMode = true;
      } else if (playerAvatar.setMoving) {
        // Normal animation logic when not in skateboard mode
        playerAvatar.setMoving(isMoving);
        
        // Track skateboard mode state
        playerAvatar.userData.isSkateboardMode = false;
      }
    }
    
    // Handle jumping if the player has pressed space and not in skateboard mode
    if (controls.jump && playerAvatar && playerAvatar.jump && !playerAvatar.userData.isJumping && !controls.isSkateboardMode) {
      // Play the jump animation
      playerAvatar.jump();
      // The physics-based jump is already handled in controls.js
      controls.jump = false; // Reset the jump flag
    }
    
    // Handle skateboard positioning and rotation
    if (controls.isSkateboardMode && controls.skateboard) {
      // Tilt the skateboard based on turning
      const targetTilt = (controls.rotateLeft ? 0.2 : controls.rotateRight ? -0.2 : 0);
      controls.skateboard.rotation.z = THREE.MathUtils.lerp(
        controls.skateboard.rotation.z,
        targetTilt,
        0.1
      );
      
      // Position the character in skateboarding stance (sideways)
      if (playerAvatar) {
        // Position the character in a proper skateboarding stance
        // Skateboard points in direction of travel, character stands sideways on board
        
        // Calculate target rotations:
        // Skateboard points in the direction of movement
        const targetSkateboardRotation = controls.targetRotation + Math.PI/2;
        
        // Character is rotated 90 degrees relative to the skateboard (standing sideways on board)
        const targetPlayerRotation = targetSkateboardRotation + Math.PI/2;
        
        // Apply the rotation with smooth interpolation to player
        playerAvatar.rotation.y = THREE.MathUtils.lerp(
          playerAvatar.rotation.y,
          targetPlayerRotation,
          0.15 // Slightly faster response to turns
        );
        
        // Apply the rotation with smooth interpolation to skateboard
        controls.skateboard.rotation.y = THREE.MathUtils.lerp(
          controls.skateboard.rotation.y,
          targetSkateboardRotation,
          0.15 // Slightly faster response to turns
        );
        
        // Apply skateboard tilt to character - enhanced for better synchronization
        const tiltFactor = 1.2; // Enhanced tilt for more dramatic effect
        playerAvatar.rotation.z = controls.skateboard.rotation.z * tiltFactor;
        
        // Add a slight forward lean based on speed
        const speedLean = -Math.abs(controls.skateboardSpeed) / controls.maxSkateboardSpeed * 0.25; // Enhanced lean
        playerAvatar.rotation.x = THREE.MathUtils.lerp(
          playerAvatar.rotation.x,
          speedLean,
          0.15 // Faster response to speed changes
        );
        
        // Store the original rotation if not already stored
        if (!playerAvatar.userData.originalRotationY) {
          playerAvatar.userData.originalRotationY = controls.targetRotation;
        }
      }
    } else if (playerAvatar) {
      // Reset rotations when not skateboarding
      playerAvatar.rotation.z = 0;
      playerAvatar.rotation.x = 0;
      
      // Restore normal player rotation (controlled by updateMovement in controls.js)
      if (playerAvatar.userData.originalRotationY !== undefined) {
        playerAvatar.rotation.y = THREE.MathUtils.lerp(
          playerAvatar.rotation.y,
          controls.targetRotation, // Restore original rotation direction
          0.1
        );
        
        // Remove the stored original rotation once fully restored
        if (Math.abs(playerAvatar.rotation.y - controls.targetRotation) < 0.01) {
          delete playerAvatar.userData.originalRotationY;
        }
      }
    }
    
    // Update NPCs
    npcManager.update(deltaTime, playerAvatar.position);
    
    // Update poke mechanic
    pokeMechanic.update();
    
    // Update emoji effects
    if (emojiEffects) {
      emojiEffects.update();
    } else {
      console.warn('EmojiEffects not available in animation loop');
    }
    
    // Update BBQ model
    if (bbqModel) {
      bbqModel.update();
    }
    
    // Update billboards to face the camera
    scene.traverse((object) => {
      if (object.userData && object.userData.isBillboard) {
        object.lookAt(camera.position);
      }
    });
    
    // Check for portal collisions
    if (playerAvatar) {
      // Update the player's bounding box each frame
      const playerBox = new THREE.Box3().setFromObject(playerAvatar);
      
      // Traverse the scene to find portal triggers
      scene.traverse((object) => {
        if (object.userData && object.userData.isPortal) {
          // Get the portal's bounding box and expand it slightly
          const portalBox = new THREE.Box3().setFromObject(object);
          portalBox.expandByScalar(1.5); // Expand the box by 50% to trigger earlier
          
          // Check if the player's bounding box intersects with the portal's bounding box
          if (playerBox.intersectsBox(portalBox) && !playerAvatar.userData.isPortalJumping) {
            console.log('Portal collision detected!');
            
            // Set flag to prevent multiple triggers
            playerAvatar.userData.isPortalJumping = true;
            
            // Trigger jump animation if available
            if (playerAvatar.jump && !playerAvatar.userData.isJumping) {
              playerAvatar.jump();
              
              // Wait for the jump animation to complete before opening the URL
              setTimeout(() => {
                // Reset the portal jumping flag
                playerAvatar.userData.isPortalJumping = false;
                // Open the URL after animation completes
                window.open(object.userData.portalURL, '_blank');
              }, 750); // Reduced to 1.5 seconds for a snappier feel
            } else {
              // If no jump animation available, open URL immediately
              playerAvatar.userData.isPortalJumping = false;
              window.open(object.userData.portalURL, '_blank');
            }
          }
        }
      });
    }
    
    // Render scene
    renderer.render(scene, camera);
  }
  
  // Initialize time for animation
  let lastTime = performance.now();
  
  animate();
  
  // Debug functionality
  const showDebugButton = document.getElementById('show-debug');
  const debugPanel = document.getElementById('debug-panel');
  const reloadModelButton = document.getElementById('reload-model');
  const resetModelButton = document.getElementById('reset-model');
  const modelScaleSlider = document.getElementById('model-scale');
  const modelYPosSlider = document.getElementById('model-y-pos');
  const modelRotationSlider = document.getElementById('model-rotation');
  const modelVerticalScaleSlider = document.getElementById('model-vertical-scale');
  const scaleValueSpan = document.getElementById('scale-value');
  const yPosValueSpan = document.getElementById('y-pos-value');
  const rotationValueSpan = document.getElementById('rotation-value');
  const verticalScaleValueSpan = document.getElementById('vertical-scale-value');
  const toggleDebugButton = document.getElementById('toggle-debug');
  const toggleNPCsButton = document.getElementById('toggle-npcs');
  const toggleGodModeButton = document.getElementById('toggle-god-mode');
  const godModeControls = document.getElementById('god-mode-controls');
  const godModeSpeedSlider = document.getElementById('god-mode-speed');
  const godSpeedValueSpan = document.getElementById('god-speed-value');
  
  if (showDebugButton) {
    showDebugButton.addEventListener('click', () => {
      debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
      showDebugButton.style.display = debugPanel.style.display === 'block' ? 'none' : 'block';
    });
  }
  
  if (debugPanel) {
    // Close debug panel when clicking outside
    document.addEventListener('click', (event) => {
      if (debugPanel.style.display === 'block' && 
          !debugPanel.contains(event.target) && 
          event.target !== showDebugButton) {
        debugPanel.style.display = 'none';
        showDebugButton.style.display = 'block';
      }
    });
    
    // Reload model button
    if (reloadModelButton) {
      reloadModelButton.addEventListener('click', () => {
        console.log('Reloading player avatar model...');
        
        // Remove current avatar from scene
        scene.remove(playerAvatar);
        
        // Remove from mixers map to stop animations
        try {
          // Import mixers from avatar.js if needed
          const mixers = window.mixers || {};
          if (mixers && typeof mixers.delete === 'function' && mixers.has(playerAvatar)) {
            mixers.delete(playerAvatar);
          }
        } catch (error) {
          console.error('Error cleaning up mixers:', error);
        }
        
        // Dispose of geometries and materials
        try {
          playerAvatar.traverse((node) => {
            if (node.geometry) {
              node.geometry.dispose();
            }
            
            if (node.material) {
              if (Array.isArray(node.material)) {
                node.material.forEach(material => material.dispose());
              } else {
                node.material.dispose();
              }
            }
          });
        } catch (error) {
          console.error('Error disposing resources:', error);
        }
        
        // Set to null to help garbage collection
        playerAvatar = null;
        
        // Force reload by clearing cache
        window.zuckerbergModelCache = null;
        window.zuckerbergAnimations = null;
        window.isLoadingModel = false;
        
        // Create new avatar using our pure avatar function
        try {
          playerAvatar = createPureAvatar(scene, gameState.username, loadingManager);
          playerAvatar.position.set(0, 0, 0);
          scene.add(playerAvatar);
          console.log('Player avatar model reload requested');
        } catch (error) {
          console.error('Error creating new avatar:', error);
        }
      });
    }
    
    // Reset model button
    if (resetModelButton) {
      resetModelButton.addEventListener('click', () => {
        console.log('Resetting model to default settings...');
        
        // Reset sliders to default values for the new model
        if (modelScaleSlider) {
          modelScaleSlider.value = 0.6;
          scaleValueSpan.textContent = '0.6';
        }
        
        if (modelYPosSlider) {
          modelYPosSlider.value = 0.0;
          yPosValueSpan.textContent = '0.0';
        }
        
        if (modelVerticalScaleSlider) {
          modelVerticalScaleSlider.value = 1.0;
          verticalScaleValueSpan.textContent = '1.0';
        }
        
        if (modelRotationSlider) {
          modelRotationSlider.value = 3.14;
          rotationValueSpan.textContent = '3.14';
        }
        
        // Apply default settings to the model
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            node.scale.set(0.6, 0.6, 0.6);
            node.position.y = 0.0;
            node.rotation.y = Math.PI;
          }
        });
        
        console.log('Model reset to default settings');
      });
    }
    
    // Model scale slider
    if (modelScaleSlider) {
      modelScaleSlider.addEventListener('input', () => {
        const scale = parseFloat(modelScaleSlider.value);
        scaleValueSpan.textContent = scale.toFixed(1);
        
        // Find the model in the player avatar
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            // Preserve the Y scale when changing overall scale
            const yScale = node.scale.y / node.scale.x;
            node.scale.set(scale, scale * yScale, scale);
          }
        });
      });
    }
    
    // Model Y position slider
    if (modelYPosSlider) {
      modelYPosSlider.addEventListener('input', () => {
        const yPos = parseFloat(modelYPosSlider.value);
        yPosValueSpan.textContent = yPos.toFixed(1);
        
        // Find the model in the player avatar
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            node.position.y = yPos;
          }
        });
      });
    }
    
    // Model vertical scale slider
    if (modelVerticalScaleSlider) {
      modelVerticalScaleSlider.addEventListener('input', () => {
        const verticalScale = parseFloat(modelVerticalScaleSlider.value);
        verticalScaleValueSpan.textContent = verticalScale.toFixed(1);
        
        // Find the model in the player avatar
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            // Keep the X and Z scales the same, only change Y
            const currentScale = node.scale.x;
            node.scale.set(currentScale, verticalScale, currentScale);
          }
        });
      });
    }
    
    // Model rotation slider
    if (modelRotationSlider) {
      modelRotationSlider.addEventListener('input', () => {
        const rotation = parseFloat(modelRotationSlider.value);
        rotationValueSpan.textContent = rotation.toFixed(2);
        
        // Find the model in the player avatar
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            node.rotation.y = rotation;
          }
        });
      });
    }
    
    // Toggle debug visuals
    if (toggleDebugButton) {
      toggleDebugButton.addEventListener('click', () => {
        // Toggle debug mode
        window.DEBUG_MODE = !window.DEBUG_MODE;
        toggleDebugButton.textContent = window.DEBUG_MODE ? 'Hide Debug Visuals' : 'Show Debug Visuals';
        
        // Toggle visibility of debug helpers
        playerAvatar.traverse((node) => {
          if (node.isHelper || 
              (node.name && (node.name.includes('helper') || 
                            node.name.includes('debug') || 
                            node.name.includes('collision') || 
                            node.name.includes('bound')))) {
            node.visible = window.DEBUG_MODE;
          }
        });
      });
    }
    
    // Toggle NPCs
    if (toggleNPCsButton) {
      let npcsEnabled = true;
      toggleNPCsButton.textContent = 'Disable NPCs';
      
      toggleNPCsButton.addEventListener('click', () => {
        npcsEnabled = !npcsEnabled;
        toggleNPCsButton.textContent = npcsEnabled ? 'Disable NPCs' : 'Enable NPCs';
        
        if (npcsEnabled) {
          // Re-initialize NPCs
          npcManager.initialize();
        } else {
          // Remove all NPCs
          npcManager.removeAll();
        }
      });
    }
    
    // Toggle God Mode
    if (toggleGodModeButton) {
      toggleGodModeButton.addEventListener('click', () => {
        if (!godModeEnabled) {
          // Enable God Mode
          console.log('Enabling God Mode');
          
          // Store original camera
          originalCamera = camera;
          
          // Disable billboarding
          disableBillboarding = true;
          window.disableBillboarding = true; // Update window object
          
          // Show God Mode controls
          document.getElementById('god-mode-controls').style.display = 'block';
          
          // Update speed display
          document.getElementById('god-speed-value').textContent = godModeSpeed.toFixed(1);
          
          // Create a new camera if it doesn't exist yet
          if (!godCamera) {
            godCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            godCamera.position.copy(camera.position);
            godCamera.rotation.copy(camera.rotation);
            
            // Create orbit controls for the god camera
            godCameraControls = new OrbitControls(godCamera, renderer.domElement);
            godCameraControls.enableDamping = true;
            godCameraControls.dampingFactor = 0.05;
            godCameraControls.screenSpacePanning = false;
            godCameraControls.minDistance = 1;
            godCameraControls.maxDistance = 500;
            godCameraControls.maxPolarAngle = Math.PI;
            
            // Set initial target to player position
            godCameraTarget.copy(playerAvatar.position);
            godCameraControls.target.copy(godCameraTarget);
            
            // Set initial camera position
            godCamera.position.set(
              playerAvatar.position.x, 
              playerAvatar.position.y + 10, 
              playerAvatar.position.z + 20
            );
            
            // Add mouse wheel event for zoom
            renderer.domElement.addEventListener('wheel', handleGodModeWheel);
            
            // Add middle mouse button events for rotation
            renderer.domElement.addEventListener('mousedown', handleGodModeMouseDown);
            renderer.domElement.addEventListener('mousemove', handleGodModeMouseMove);
            renderer.domElement.addEventListener('mouseup', handleGodModeMouseUp);
            
            // Add keyboard event listeners for god camera movement
            document.addEventListener('keydown', handleGodModeKeyDown);
            document.addEventListener('keyup', handleGodModeKeyUp);
          } else {
            // Update god camera position to current camera
            godCamera.position.copy(camera.position);
            godCamera.rotation.copy(camera.rotation);
            
            // Set target to player position
            godCameraTarget.copy(playerAvatar.position);
            godCameraControls.target.copy(godCameraTarget);
            
            // Re-add event listeners
            renderer.domElement.addEventListener('wheel', handleGodModeWheel);
            renderer.domElement.addEventListener('mousedown', handleGodModeMouseDown);
            renderer.domElement.addEventListener('mousemove', handleGodModeMouseMove);
            renderer.domElement.addEventListener('mouseup', handleGodModeMouseUp);
            document.addEventListener('keydown', handleGodModeKeyDown);
            document.addEventListener('keyup', handleGodModeKeyUp);
          }
          
          // Switch to god camera
          camera = godCamera;
          
          // Show a notification
          showNotification('God Mode Enabled', 'success');
          
          // Update the button text
          this.textContent = 'Disable God Mode';
          
          // Set the flag
          godModeEnabled = true;
        } else {
          // Disable God Mode
          console.log('Disabling God Mode');
          
          // Re-enable billboarding
          disableBillboarding = false;
          window.disableBillboarding = false; // Update window object
          
          // Remove event listeners
          renderer.domElement.removeEventListener('wheel', handleGodModeWheel);
          renderer.domElement.removeEventListener('mousedown', handleGodModeMouseDown);
          renderer.domElement.removeEventListener('mousemove', handleGodModeMouseMove);
          renderer.domElement.removeEventListener('mouseup', handleGodModeMouseUp);
          document.removeEventListener('keydown', handleGodModeKeyDown);
          document.removeEventListener('keyup', handleGodModeKeyUp);
          
          // Hide God Mode controls
          document.getElementById('god-mode-controls').style.display = 'none';
          
          // Switch back to original camera
          if (originalCamera) {
            camera = originalCamera;
          }
          
          // Show a notification
          showNotification('God Mode Disabled', 'info');
          
          // Update the button text
          this.textContent = 'Enable God Mode';
          
          // Set the flag
          godModeEnabled = false;
        }
      });
    }
    
    // God Mode speed slider
    if (godModeSpeedSlider) {
      godModeSpeedSlider.addEventListener('input', () => {
        godModeSpeed = parseFloat(godModeSpeedSlider.value);
        if (godSpeedValueSpan) {
          godSpeedValueSpan.textContent = godModeSpeed.toFixed(1);
        }
        console.log(`God Mode speed set to: ${godModeSpeed}`);
      });
    }
  }
  
  // Add control help panel close button functionality
  const controlsHelp = document.getElementById('controls-help');
  const closeControlsHelpButton = document.getElementById('close-controls-help');
  
  if (closeControlsHelpButton && controlsHelp) {
    closeControlsHelpButton.addEventListener('click', () => {
      controlsHelp.style.display = 'none';
    });
  }
  
  // Update controls help for mobile
  if (isMobile && controlsHelp) {
    const controlsContent = controlsHelp.querySelector('div');
    if (controlsContent) {
      controlsContent.innerHTML = `
        <p><strong>Left Joystick:</strong> Move</p>
        <p><strong>Right Joystick:</strong> Rotate</p>
        <p><strong>Jump Button:</strong> Jump</p>
        <p><strong>Settings:</strong> Adjust graphics & controls</p>
      `;
    }
  }
} catch (error) {
  console.error('Error initializing game:', error);
  // Display error message to user
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50%';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translate(-50%, -50%)';
  errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.borderRadius = '10px';
  errorDiv.style.fontFamily = 'Arial, sans-serif';
  errorDiv.style.zIndex = '1000';
  errorDiv.innerHTML = `<h2>Error Loading Game</h2><p>${error.message}</p><p>Please check the console for more details.</p>`;
  document.body.appendChild(errorDiv);
}

// Use the WebXR animation loop instead of requestAnimationFrame
renderer.setAnimationLoop(function() {
  // Update controls
  if (controls) {
    controls.update();
  }
  
  // Update avatar animations
  if (playerAvatar && playerAvatar.updateAnimations) {
    updateAvatarAnimations(playerAvatar, controls ? controls.moveState : null);
  }
  
  // Update NPCs
  if (npcManager) {
    npcManager.update();
  }
  
  // Update poke mechanic
  if (pokeMechanic) {
    pokeMechanic.update();
  }
  
  // Update emoji effects
  if (emojiEffects) {
    emojiEffects.update();
  } else {
    console.warn('EmojiEffects not available in animation loop');
  }
  
  // Update BBQ model
  if (bbqModel) {
    bbqModel.update();
  }
  
  // Update billboards to face the camera
  scene.traverse((object) => {
    if (object.userData && object.userData.isBillboard) {
      object.lookAt(camera.position);
    }
  });

  // Check for portal collisions
  if (playerAvatar) {
    // Update the player's bounding box each frame
    const playerBox = new THREE.Box3().setFromObject(playerAvatar);
    
    // Traverse the scene to find portal triggers
    scene.traverse((object) => {
      if (object.userData && object.userData.isPortal) {
        // Get the portal's bounding box and expand it slightly
        const portalBox = new THREE.Box3().setFromObject(object);
        portalBox.expandByScalar(1.5); // Expand the box by 50% to trigger earlier
        
        // Check if the player's bounding box intersects with the portal's bounding box
        if (playerBox.intersectsBox(portalBox)) {
          console.log('Portal collision detected!');
          
          // Trigger jump animation if available
          if (playerAvatar.jump && !playerAvatar.userData.isJumping) {
            playerAvatar.jump();
            
            // Wait for the jump animation to complete before opening the URL
            setTimeout(() => {
              window.open(object.userData.portalURL, '_blank');
            }, 2000); // Increased to 2 seconds to ensure animation plays
          } else {
            // If no jump animation available, open URL immediately
            window.open(object.userData.portalURL, '_blank');
          }
        }
      }
    });
  }
  
  // Render the scene
  renderer.render(scene, camera);
});
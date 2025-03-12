import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Removing PointerLockControls import since we're eliminating first-person view
// import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupControls(camera, player, domElement, gameState, scene) {
  // Create a controls object to return
  const controls = {
    // Movement state
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    canJump: true,
    isJumping: false,
    jump: false, // New flag for animation-based jumping
    
    // Skateboard state
    isSkateboardMode: false,
    skateboard: null,
    skateboardSpeed: 0,
    maxSkateboardSpeed: 15,
    skateboardAcceleration: 0.5,
    skateboardDeceleration: 0.2,
    skateboardTurnSpeed: 3.0,
    
    // Rotation state
    rotateLeft: false,
    rotateRight: false,
    targetRotation: player.rotation.y,
    
    // Physics
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    
    // Camera controls
    orbitControls: null,
    
    // Mouse state
    mouseDown: false,
    mousePosition: new THREE.Vector2(),
    
    // Update method to be called in animation loop
    update: function() {
      this.updateMovement();
      this.updateCamera();
      
      if (this.orbitControls) {
        this.orbitControls.update();
      }
    },
    
    // Adjust camera distance and height
    adjustCamera: function(heightOffset, distanceOffset) {
      // Get the player's current rotation to determine "behind" direction
      const behindDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
      
      // Get current distance from player
      const currentPos = new THREE.Vector3().subVectors(camera.position, player.position);
      const currentDistance = currentPos.length();
      
      // Calculate new distance (with limits)
      const newDistance = Math.max(2, Math.min(100, currentDistance + distanceOffset));
      
      // Calculate new height (with limits)
      const newHeight = Math.max(1, Math.min(6, camera.position.y - player.position.y + heightOffset));
      
      // Set new camera position behind player
      camera.position.set(
        player.position.x + (behindDirection.x * newDistance),
        player.position.y + newHeight,
        player.position.z + (behindDirection.z * newDistance)
      );
      
      // Update the target to be the player
      this.orbitControls.target.copy(player.position);
      this.orbitControls.target.y += 1;
    }
  };
  
  // Setup orbit controls for third-person view
  const orbitControls = new OrbitControls(camera, domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.2; // Increased for smoother camera movement
  orbitControls.screenSpacePanning = false;
  orbitControls.minDistance = 2;  // Allow camera to get very close
  orbitControls.maxDistance = 100; // Increased to allow viewing distant landmarks
  orbitControls.minPolarAngle = Math.PI / 20; // Reduced to allow for more extreme upward viewing
  orbitControls.maxPolarAngle = Math.PI / 1.5; // Allow camera to be positioned above
  
  // Enable rotation with the orbit controls to allow viewing the landmarks
  orbitControls.enableRotate = true;
  
  // Allow zooming with the scroll wheel
  orbitControls.enableZoom = true;
  
  // Set initial target
  orbitControls.target.copy(player.position);
  orbitControls.target.y += 1; // Target slightly above the player's base position
  controls.orbitControls = orbitControls;
  
  // Set initial camera position - position it for a selfie-style view
  camera.position.set(0, 1.5, 5); // In front of the player, at face level
  
  // Make sure camera is looking at the player for selfie view
  orbitControls.target.set(0, 1.5, 0); // Looking directly at the player
  orbitControls.update();
  
  // Load skateboard model
  if (scene) { // Only load if scene is available
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/assets/models/skateboard.glb', // This path is relative to the public directory
      (gltf) => {
        controls.skateboard = gltf.scene;
        controls.skateboard.scale.set(0.25, 0.25, 0.25); // Reduced to 25% of original size
        controls.skateboard.visible = false;
        scene.add(controls.skateboard);
        console.log('Skateboard model loaded successfully');
      },
      (xhr) => {
        console.log('Skateboard loading progress: ' + (xhr.loaded / xhr.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading skateboard:', error);
      }
    );
  } else {
    console.error('Scene not provided to setupControls, skateboard cannot be loaded');
  }
  
  // Setup keyboard controls
  const onKeyDown = function(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        controls.moveForward = true;
        break;
        
      case 'ArrowLeft':
      case 'KeyA':
        controls.moveLeft = true;
        break;
        
      case 'ArrowDown':
        controls.moveBackward = true;
        break;
        
      case 'KeyS':
        if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
          controls.moveBackward = true;
        } else if (!event.repeat) {
          controls.isSkateboardMode = !controls.isSkateboardMode;
          console.log('Skateboard mode toggled:', controls.isSkateboardMode);
          if (controls.skateboard) {
            controls.skateboard.visible = controls.isSkateboardMode;
            console.log('Skateboard visibility set to:', controls.skateboard.visible);
          } else {
            console.warn('Skateboard model not loaded yet!');
          }
          if (!controls.isSkateboardMode) {
            controls.skateboardSpeed = 0;
          }
        }
        break;
        
      case 'ArrowRight':
      case 'KeyD':
        controls.moveRight = true;
        break;
        
      // Dedicated rotation keys
      case 'KeyQ':
        controls.rotateLeft = true;
        break;
        
      case 'KeyE':
        controls.rotateRight = true;
        break;
        
      case 'Space':
        if (controls.canJump) {
          controls.jump = true; // Set the jump flag for animation-based jumping
          controls.canJump = false; // Prevent multiple jumps until reset
          
          // Add initial upward velocity for the jump
          controls.velocity.y = 5.0; // Initial jump velocity
          controls.isJumping = true; // Set jumping state
          
          // Reset the canJump flag after a short delay to prevent spam jumping
          setTimeout(() => {
            controls.canJump = true;
          }, 1000); // 1 second cooldown
        }
        break;
        
      // Camera adjustment controls
      case 'KeyR': // Move camera higher
        controls.adjustCamera(1, 0);
        break;
        
      case 'KeyF': // Move camera lower
        controls.adjustCamera(-1, 0);
        break;
        
      case 'KeyZ': // Zoom camera in
        controls.adjustCamera(0, -1);
        break;
        
      case 'KeyX': // Zoom camera out
        controls.adjustCamera(0, 1);
        break;
    }
  };
  
  const onKeyUp = function(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        controls.moveForward = false;
        break;
        
      case 'ArrowLeft':
      case 'KeyA':
        controls.moveLeft = false;
        break;
        
      case 'ArrowDown':
        controls.moveBackward = false;
        break;
        
      case 'KeyS':
        controls.moveBackward = false;
        break;
        
      case 'ArrowRight':
      case 'KeyD':
        controls.moveRight = false;
        break;
        
      // Rotation key releases
      case 'KeyQ':
        controls.rotateLeft = false;
        break;
        
      case 'KeyE':
        controls.rotateRight = false;
        break;
    }
  };
  
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  
  // Mouse controls for rotation
  document.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left mouse button
      controls.mouseDown = true;
      controls.mousePosition.x = event.clientX;
      controls.mousePosition.y = event.clientY;
    }
  });
  
  document.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Left mouse button
      controls.mouseDown = false;
    }
  });
  
  document.addEventListener('mousemove', (event) => {
    if (controls.mouseDown) {
      // Calculate horizontal mouse movement
      const deltaX = event.clientX - controls.mousePosition.x;
      
      // Update target rotation based on mouse movement
      controls.targetRotation -= deltaX * 0.01; // Adjust sensitivity as needed
      
      // Update mouse position
      controls.mousePosition.x = event.clientX;
      controls.mousePosition.y = event.clientY;
    }
  });
  
  // Touch controls for mobile devices
  document.addEventListener('touchstart', (event) => {
    if (event.touches.length === 1) {
      controls.mouseDown = true;
      controls.mousePosition.x = event.touches[0].clientX;
      controls.mousePosition.y = event.touches[0].clientY;
    }
  });
  
  document.addEventListener('touchend', () => {
    controls.mouseDown = false;
  });
  
  document.addEventListener('touchmove', (event) => {
    if (controls.mouseDown && event.touches.length === 1) {
      // Calculate horizontal touch movement
      const deltaX = event.touches[0].clientX - controls.mousePosition.x;
      
      // Update target rotation based on touch movement
      controls.targetRotation -= deltaX * 0.01; // Adjust sensitivity as needed
      
      // Update touch position
      controls.mousePosition.x = event.touches[0].clientX;
      controls.mousePosition.y = event.touches[0].clientY;
      
      // Prevent scrolling
      event.preventDefault();
    }
  }, { passive: false });
  
  // Movement and physics update
  controls.updateMovement = function() {
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    
    // Apply gravity - increased gravity for better jump feel
    controls.velocity.y -= 9.8 * 1.5 * delta;
    
    // Update rotation from keyboard inputs
    if (controls.rotateLeft) {
      controls.targetRotation += (controls.isSkateboardMode ? controls.skateboardTurnSpeed : 2.0) * delta;
    }
    if (controls.rotateRight) {
      controls.targetRotation -= (controls.isSkateboardMode ? controls.skateboardTurnSpeed : 2.0) * delta;
    }
    
    // Apply smooth rotation (lerp current rotation toward target)
    // In skateboard mode, the visual rotation is handled in main.js
    // Here we're just updating the underlying target rotation
    if (!controls.isSkateboardMode) {
      player.rotation.y += (controls.targetRotation - player.rotation.y) * 10 * delta;
    }
    
    // Update skateboard position and rotation if in skateboard mode
    if (controls.isSkateboardMode && controls.skateboard) {
      controls.skateboard.position.copy(player.position);
      controls.skateboard.position.y = 0.05; // Adjusted for smaller skateboard size
      
      // Set the skateboard's rotation to match the movement direction
      // The 90-degree visual rotation is handled in main.js
      controls.skateboard.rotation.y = controls.targetRotation;
      
      // Update skateboard speed
      if (controls.moveForward) {
        controls.skateboardSpeed = Math.min(controls.skateboardSpeed + controls.skateboardAcceleration * delta, controls.maxSkateboardSpeed);
      } else if (controls.moveBackward) {
        controls.skateboardSpeed = Math.max(controls.skateboardSpeed - controls.skateboardAcceleration * delta, -controls.maxSkateboardSpeed / 2);
      } else {
        // Apply deceleration
        if (Math.abs(controls.skateboardSpeed) < controls.skateboardDeceleration * delta) {
          controls.skateboardSpeed = 0;
        } else {
          controls.skateboardSpeed -= Math.sign(controls.skateboardSpeed) * controls.skateboardDeceleration * delta;
        }
      }
      
      // Calculate movement direction based on the skateboard's orientation 
      // Since the skateboard is rotated 90 degrees, we need to add PI/2 to the target rotation
      // This makes the character move toward the nose of the skateboard instead of the side
      const skateboardForwardDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0), 
        controls.targetRotation + Math.PI/2
      );
      
      // Apply skateboard movement in the direction of the skateboard's nose
      player.position.x += skateboardForwardDirection.x * controls.skateboardSpeed * delta;
      player.position.z += skateboardForwardDirection.z * controls.skateboardSpeed * delta;
    } else {
      // Normal movement code
      controls.direction.z = Number(controls.moveForward) - Number(controls.moveBackward);
      controls.direction.x = Number(controls.moveRight) - Number(controls.moveLeft);
      controls.direction.normalize();
      
      const forwardDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
      const rightDirection = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
      
      if (controls.moveForward || controls.moveBackward) {
        player.position.x += forwardDirection.x * controls.direction.z * 5 * delta;
        player.position.z += forwardDirection.z * controls.direction.z * 5 * delta;
      }
      
      if (controls.moveLeft || controls.moveRight) {
        player.position.x += rightDirection.x * controls.direction.x * 5 * delta;
        player.position.z += rightDirection.z * controls.direction.x * 5 * delta;
      }
    }
    
    // Update orbit controls target to follow player
    controls.orbitControls.target.copy(player.position);
    controls.orbitControls.target.y += 1;
    
    // Apply vertical velocity (jumping/falling)
    player.position.y += controls.velocity.y * delta;
    
    // Simple ground collision
    if (player.position.y < 1) {
      controls.velocity.y = 0;
      player.position.y = 1;
      controls.canJump = true;
      controls.isJumping = false;
      
      // If we were jumping and just landed, reset the animation state
      if (player.userData && player.userData.isJumping) {
        player.userData.isJumping = false;
        
        // If the player has a setMoving method and we're not in skateboard mode, update the animation
        if (player.setMoving && !controls.isSkateboardMode) {
          const isMoving = controls.moveForward || controls.moveBackward || 
                          controls.moveLeft || controls.moveRight;
          player.setMoving(isMoving);
        }
      }
    }
    
    prevTime = time;
  };
  
  // Camera update
  controls.updateCamera = function() {
    // Get the player's current rotation to determine "behind" direction
    const behindDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    
    // Calculate the desired camera position behind the player
    const desiredPosition = new THREE.Vector3(
      player.position.x + (behindDirection.x * 3),
      player.position.y + 2,
      player.position.z + (behindDirection.z * 3)
    );
    
    // Smoothly interpolate current camera position towards the desired position
    // This creates a smoother following effect
    camera.position.lerp(desiredPosition, 0.1);
    
    // Update the orbit controls target to be the player
    controls.orbitControls.target.copy(player.position);
    controls.orbitControls.target.y += 1; // Keep targeting above the player
  };
  
  // Initialize time for movement calculations
  let prevTime = performance.now();
  
  return controls;
} 
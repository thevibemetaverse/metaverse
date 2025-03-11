import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// Removing PointerLockControls import since we're eliminating first-person view
// import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupControls(camera, player, domElement, gameState) {
  // Create a controls object to return
  const controls = {
    // Movement state
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    canJump: false,
    isJumping: false,
    
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
      const newDistance = Math.max(2, Math.min(10, currentDistance + distanceOffset));
      
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
  orbitControls.maxDistance = 10; // Reduced maximum distance 
  orbitControls.minPolarAngle = Math.PI / 10; // Allow for lower viewing angle
  orbitControls.maxPolarAngle = Math.PI / 1.5; // Allow camera to be positioned above
  
  // Disable rotation with the orbit controls to maintain the behind-player view
  orbitControls.enableRotate = false;
  
  // Allow zooming with the scroll wheel
  orbitControls.enableZoom = true;
  
  // Set initial target
  orbitControls.target.copy(player.position);
  orbitControls.target.y += 1; // Target slightly above the player's base position
  controls.orbitControls = orbitControls;
  
  // Set initial camera position - position it behind the player
  // First determine the "behind" direction based on player's rotation
  const behindDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
  camera.position.set(
    player.position.x + (behindDirection.x * 3), // Position behind player, changed direction and brought closer
    player.position.y + 2, // Lower camera height
    player.position.z + (behindDirection.z * 3)  // Position behind player, changed direction and brought closer
  );
  
  // Make sure camera is looking at the player from behind
  orbitControls.target.copy(player.position);
  orbitControls.target.y += 1; // Target slightly above the player's base position
  orbitControls.update();
  
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
      case 'KeyS':
        controls.moveBackward = true;
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
          controls.velocity.y = 10;
          controls.isJumping = true;
          controls.canJump = false;
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
    
    // Apply gravity
    controls.velocity.y -= 9.8 * delta;
    
    // Update rotation from keyboard inputs
    if (controls.rotateLeft) {
      controls.targetRotation += 2.0 * delta; // Rotation speed
    }
    if (controls.rotateRight) {
      controls.targetRotation -= 2.0 * delta; // Rotation speed
    }
    
    // Apply smooth rotation (lerp current rotation toward target)
    player.rotation.y += (controls.targetRotation - player.rotation.y) * 10 * delta;
    
    // Calculate movement direction
    controls.direction.z = Number(controls.moveForward) - Number(controls.moveBackward);
    controls.direction.x = Number(controls.moveRight) - Number(controls.moveLeft);
    controls.direction.normalize();
    
    // Get the player's current rotation to determine forward direction
    const forwardDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    const rightDirection = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    
    // Apply movement in the correct world directions
    if (controls.moveForward || controls.moveBackward) {
      player.position.x += forwardDirection.x * controls.direction.z * 5 * delta;
      player.position.z += forwardDirection.z * controls.direction.z * 5 * delta;
    }
    
    if (controls.moveLeft || controls.moveRight) {
      player.position.x += rightDirection.x * controls.direction.x * 5 * delta;
      player.position.z += rightDirection.z * controls.direction.x * 5 * delta;
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
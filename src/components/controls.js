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
    
    // Physics
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    
    // Camera controls
    orbitControls: null,
    
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
      const newDistance = Math.max(8, Math.min(30, currentDistance + distanceOffset));
      
      // Calculate new height (with limits)
      const newHeight = Math.max(5, Math.min(15, camera.position.y - player.position.y + heightOffset));
      
      // Set new camera position behind player
      camera.position.set(
        player.position.x - (behindDirection.x * newDistance),
        player.position.y + newHeight,
        player.position.z - (behindDirection.z * newDistance)
      );
      
      // Update the target to be in front of the player
      this.orbitControls.target.x = player.position.x + (behindDirection.x * 2);
      this.orbitControls.target.z = player.position.z + (behindDirection.z * 2);
      this.orbitControls.target.y = player.position.y + 2;
    }
  };
  
  // Setup orbit controls for third-person view
  const orbitControls = new OrbitControls(camera, domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.1; // Increased for smoother camera movement
  orbitControls.screenSpacePanning = false;
  orbitControls.minDistance = 8;  // Reduced minimum distance (from 15 to 8)
  orbitControls.maxDistance = 30; // Reduced maximum distance (from 50 to 30)
  orbitControls.minPolarAngle = Math.PI / 6; // Limit how low camera can go
  orbitControls.maxPolarAngle = Math.PI / 2.5; // Increased to allow camera to go higher
  
  // Disable rotation with the orbit controls to maintain the behind-player view
  orbitControls.enableRotate = false;
  
  // Allow zooming with the scroll wheel
  orbitControls.enableZoom = true;
  
  // Set initial target
  orbitControls.target.copy(player.position);
  orbitControls.target.y += 2; // Target slightly above the player's base position
  controls.orbitControls = orbitControls;
  
  // Set initial camera position - position it behind the player
  // First determine the "behind" direction based on player's rotation
  const behindDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
  camera.position.set(
    player.position.x - (behindDirection.x * 15), // Position behind based on player rotation (reduced from 25 to 15)
    player.position.y + 8, // Much lower position (reduced from 20 to 8)
    player.position.z - (behindDirection.z * 15)  // Position behind based on player rotation (reduced from 25 to 15)
  );
  
  // Make sure camera is looking at the player from behind
  orbitControls.target.copy(player.position);
  orbitControls.target.y += 2; // Target slightly above the player's base position
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
        
      case 'Space':
        if (controls.canJump) {
          controls.velocity.y = 10;
          controls.isJumping = true;
          controls.canJump = false;
        }
        break;
        
      // Camera adjustment controls
      case 'KeyQ': // Move camera higher
        controls.adjustCamera(1, 0);
        break;
        
      case 'KeyE': // Move camera lower
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
    }
  };
  
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  
  // Movement and physics update
  controls.updateMovement = function() {
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    
    // Apply gravity
    controls.velocity.y -= 9.8 * delta;
    
    // Calculate movement direction
    controls.direction.z = Number(controls.moveForward) - Number(controls.moveBackward);
    controls.direction.x = Number(controls.moveRight) - Number(controls.moveLeft);
    controls.direction.normalize();
    
    // Third-person movement is relative to world axes
    player.position.x += controls.direction.x * 5 * delta;
    player.position.z += controls.direction.z * 5 * delta;
    
    // Update orbit controls target to follow player
    controls.orbitControls.target.copy(player.position);
    
    // Apply vertical velocity (jumping/falling)
    player.position.y += controls.velocity.y * delta;
    
    // Simple ground collision
    if (player.position.y < 1) {
      controls.velocity.y = 0;
      player.position.y = 1;
      controls.canJump = true;
      controls.isJumping = false;
    }
    
    // Update player rotation to face movement direction
    if (controls.moveForward || controls.moveBackward || controls.moveLeft || controls.moveRight) {
      const angle = Math.atan2(controls.direction.x, controls.direction.z);
      player.rotation.y = angle;
    }
    
    prevTime = time;
  };
  
  // Camera update
  controls.updateCamera = function() {
    // Get the player's current rotation to determine "behind" direction
    const behindDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    
    // Calculate the desired camera position behind the player
    const desiredPosition = new THREE.Vector3(
      player.position.x - (behindDirection.x * 15),
      player.position.y + 8,
      player.position.z - (behindDirection.z * 15)
    );
    
    // Smoothly interpolate current camera position towards the desired position
    // This creates a smoother following effect
    camera.position.lerp(desiredPosition, 0.1);
    
    // Update the orbit controls target to be in front of the player
    controls.orbitControls.target.x = player.position.x + (behindDirection.x * 2);
    controls.orbitControls.target.z = player.position.z + (behindDirection.z * 2);
    controls.orbitControls.target.y = player.position.y + 2; // Keep targeting above the player
  };
  
  // Initialize time for movement calculations
  let prevTime = performance.now();
  
  return controls;
} 
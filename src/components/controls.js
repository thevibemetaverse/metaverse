import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

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
    pointerControls: null,
    activeControls: null,
    
    // Update method to be called in animation loop
    update: function() {
      this.updateMovement();
      this.updateCamera();
      
      if (this.activeControls && this.activeControls.update) {
        this.activeControls.update();
      }
    },
    
    // Switch between first-person and third-person views
    switchCameraView: function(view) {
      if (view === 'first-person' && this.activeControls !== this.pointerControls) {
        // Switch to first-person
        this.activeControls = this.pointerControls;
        gameState.cameraView = 'first-person';
        camera.position.set(0, 2.5, 0);
        camera.lookAt(new THREE.Vector3(0, 2.5, -1));
      } else if (view === 'third-person' && this.activeControls !== this.orbitControls) {
        // Switch to third-person
        this.activeControls = this.orbitControls;
        gameState.cameraView = 'third-person';
        camera.position.set(0, 5, 10);
        this.orbitControls.target.copy(player.position);
      }
    }
  };
  
  // Setup orbit controls for third-person view
  const orbitControls = new OrbitControls(camera, domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.screenSpacePanning = false;
  orbitControls.minDistance = 3;
  orbitControls.maxDistance = 15;
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.1;
  orbitControls.target.copy(player.position);
  controls.orbitControls = orbitControls;
  
  // Setup pointer lock controls for first-person view
  const pointerControls = new PointerLockControls(camera, domElement);
  controls.pointerControls = pointerControls;
  
  // Set initial camera view based on gameState
  controls.switchCameraView(gameState.cameraView);
  
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
        
      case 'KeyV':
        // Toggle camera view
        const newView = gameState.cameraView === 'first-person' ? 'third-person' : 'first-person';
        controls.switchCameraView(newView);
        
        // Update UI
        const cameraViewSelect = document.getElementById('camera-view');
        if (cameraViewSelect) {
          cameraViewSelect.value = newView;
        }
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
  
  // Add click handler for pointer lock (first-person mode)
  domElement.addEventListener('click', () => {
    if (gameState.cameraView === 'first-person' && !pointerControls.isLocked) {
      pointerControls.lock();
    }
  });
  
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
    
    // Move the player based on controls
    if (gameState.cameraView === 'first-person') {
      // First-person movement is relative to camera direction
      if (controls.moveForward || controls.moveBackward) {
        player.position.addScaledVector(
          new THREE.Vector3(
            Math.sin(camera.rotation.y),
            0,
            Math.cos(camera.rotation.y)
          ).multiplyScalar(controls.direction.z * -5 * delta)
        );
      }
      
      if (controls.moveLeft || controls.moveRight) {
        player.position.addScaledVector(
          new THREE.Vector3(
            Math.sin(camera.rotation.y + Math.PI / 2),
            0,
            Math.cos(camera.rotation.y + Math.PI / 2)
          ).multiplyScalar(controls.direction.x * 5 * delta)
        );
      }
      
      // Update camera position to follow player
      camera.position.x = player.position.x;
      camera.position.z = player.position.z;
      camera.position.y = player.position.y + 2.5;
    } else {
      // Third-person movement is relative to world axes
      player.position.x += controls.direction.x * 5 * delta;
      player.position.z += controls.direction.z * 5 * delta;
      
      // Update orbit controls target to follow player
      controls.orbitControls.target.copy(player.position);
    }
    
    // Apply vertical velocity (jumping/falling)
    player.position.y += controls.velocity.y * delta;
    
    // Simple ground collision
    if (player.position.y < 1) {
      controls.velocity.y = 0;
      player.position.y = 1;
      controls.canJump = true;
      controls.isJumping = false;
    }
    
    // Simple obstacle collision detection
    // This would be expanded in a full implementation
    
    // Update player rotation to face movement direction
    if ((controls.moveForward || controls.moveBackward || controls.moveLeft || controls.moveRight) &&
        gameState.cameraView === 'third-person') {
      const angle = Math.atan2(controls.direction.x, controls.direction.z);
      player.rotation.y = angle;
    }
    
    prevTime = time;
  };
  
  // Camera update
  controls.updateCamera = function() {
    if (gameState.cameraView === 'third-person') {
      // Third-person camera follows the player
      controls.orbitControls.target.copy(player.position);
    }
  };
  
  // Initialize time for movement calculations
  let prevTime = performance.now();
  
  return controls;
} 